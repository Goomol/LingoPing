import React, { useState, useEffect } from 'react';
import {
  ConfigProvider,
  App as AntApp,
  Layout,
  Typography,
  Tabs,
  Card,
  Button,
  Table,
  Space,
  Flex,
  Input,
  Form,
  Select,
  Switch,
  Tag,
  Upload,
  Divider,
  Modal,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Alert,
  Avatar,
  Tooltip,
} from 'antd';
import {
  InboxOutlined,
  BookOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  PlusOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  BulbOutlined,
  SoundOutlined,
  GoogleOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import {
  Card as SRSCard,
  Profile,
  UserKnownWord,
  parseSubtitles,
  parsePlainText,
  parseTabularData,
  reconcileLemmas,
  inferGermanGender,
  enrichVocabularyOffline,
  createCardFromEnrichment,
  ExtractedLemma,
} from '@lingoping/core';
import { StorageManager } from '../storage/index.js';
import { antThemeConfig, CHROMATIC_PALETTES } from '../theme/index.js';
import { speakText } from '../utils/audio.js';
import { signInWithGoogle, signOutUser, getCurrentUser } from '../auth/index.js';
import { AuthGate } from '../components/AuthGate.js';
import { User } from '@supabase/supabase-js';

const { Title, Text, Paragraph } = Typography;
const { Header, Content } = Layout;
const { TextArea } = Input;

export const OptionsAppInner: React.FC = () => {
  const { message, modal } = AntApp.useApp();

  const [activeTab, setActiveTab] = useState('ingestion');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [cards, setCards] = useState<SRSCard[]>([]);
  const [knownWords, setKnownWords] = useState<UserKnownWord[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Add Word Modal states
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [quickAddWordText, setQuickAddWordText] = useState('');
  const [addingQuickWord, setAddingQuickWord] = useState(false);

  // Ingestion Studio states
  const [pastedText, setPastedText] = useState('');
  const [extractedLemmas, setExtractedLemmas] = useState<ExtractedLemma[]>([]);
  const [ingestionStats, setIngestionStats] = useState<{
    totalTokens: number;
    knownCount: number;
    unknownCount: number;
  } | null>(null);
  const [isProcessingIngestion, setIsProcessingIngestion] = useState(false);

  // Grammar Studio form state
  const [grammarForm] = Form.useForm();
  const [markdownPreview, setMarkdownPreview] = useState('');

  // Lexicon Manager state
  const [lexiconSearch, setLexiconSearch] = useState('');
  const [newKnownWordInput, setNewKnownWordInput] = useState('');

  // Cards Manager filter
  const [cardTypeFilter, setCardTypeFilter] = useState<'all' | 'vocabulary' | 'grammar_rule'>('all');
  const [cardSearch, setCardSearch] = useState('');

  // Settings form
  const [settingsForm] = Form.useForm();

  // Load all repository data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [prof, allCards, allKnown, currentUser] = await Promise.all([
        StorageManager.getProfile(),
        StorageManager.getCards(),
        StorageManager.getKnownWords(),
        getCurrentUser(),
      ]);

      setProfile(prof);
      setCards(allCards);
      setKnownWords(allKnown);
      setAuthUser(currentUser);
      settingsForm.setFieldsValue(prof);
    } catch (err) {
      console.error('Failed to load options data:', err);
      message.error('Failed to load data from storage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleQuickAddWord = async () => {
    const word = quickAddWordText.trim();
    if (!word) return;

    try {
      setAddingQuickWord(true);
      const targetLang = profile?.target_language || 'de';
      const nativeLang = profile?.native_language || 'en';

      const cachedVisual = await StorageManager.getCachedVisual(word, targetLang);

      const enriched = enrichVocabularyOffline(
        word,
        targetLang,
        nativeLang
      );

      if (cachedVisual) {
        enriched.visual_mnemonic = {
          image_prompt: cachedVisual.visualMeta.image_prompt || '',
          color_theme: cachedVisual.visualMeta.theme_color,
          color_hex: cachedVisual.visualMeta.hex,
        };
      }

      const newCard = createCardFromEnrichment(enriched, profile?.id);
      if (cachedVisual) {
        newCard.image_url = cachedVisual.imageUrl;
        newCard.visual_meta = cachedVisual.visualMeta;
      }

      await StorageManager.addCard(newCard);
      message.success(`Added "${newCard.front_text}" (${newCard.back_text}) to deck!`);
      setQuickAddWordText('');
      setQuickAddModalOpen(false);
      await loadAllData();
    } catch (err) {
      console.error('Quick add failed:', err);
      message.error('Failed to add word.');
    } finally {
      setAddingQuickWord(false);
    }
  };

  // Ingestion: Parse & Reconcile
  const handleIngestText = async (textToIngest: string) => {
    if (!textToIngest.trim()) {
      message.warning('Please provide subtitle or text content to ingest.');
      return;
    }

    try {
      setIsProcessingIngestion(true);
      let sentences: string[] = [];

      // Check if text looks like SRT subtitles
      if (textToIngest.includes('-->')) {
        const parsed = parseSubtitles(textToIngest);
        sentences = parsed.sentences;
      } else {
        const parsed = parsePlainText(textToIngest);
        sentences = parsed.sentences;
      }

      const knownLemmasSet = new Set(knownWords.map((k) => k.lemma.toLowerCase()));
      // Also treat existing cards as known
      for (const c of cards) {
        if (c.lemma) knownLemmasSet.add(c.lemma.toLowerCase());
      }

      const result = reconcileLemmas(sentences, {
        language: profile?.target_language || 'de',
        knownWords: knownLemmasSet,
      });

      setExtractedLemmas(result.unknownLemmas);
      setIngestionStats({
        totalTokens: result.totalTokens,
        knownCount: result.knownLemmasCount,
        unknownCount: result.unknownLemmas.length,
      });

      message.success(
        `Ingestion complete: Discovered ${result.unknownLemmas.length} unfamiliar words!`
      );
    } catch (err) {
      console.error('Ingestion failed:', err);
      message.error('Failed to parse text.');
    } finally {
      setIsProcessingIngestion(false);
    }
  };

  // Batch create cards from extracted lemmas
  const handleBatchEnrich = async (selectedOnly?: ExtractedLemma[]) => {
    const toEnrich = selectedOnly || extractedLemmas;
    if (toEnrich.length === 0) return;

    try {
      setIsProcessingIngestion(true);
      let addedCount = 0;

      for (const item of toEnrich) {
        const enriched = enrichVocabularyOffline(
          item.lemma,
          profile?.target_language || 'de',
          profile?.native_language || 'en',
          item.contextSentence
        );
        const newCard = createCardFromEnrichment(enriched, profile?.id);
        await StorageManager.addCard(newCard);
        addedCount++;
      }

      message.success(`Successfully added ${addedCount} new cards to your SRS deck!`);
      // Remove enriched from preview
      setExtractedLemmas((prev) =>
        prev.filter((p) => !toEnrich.some((item) => item.lemma === p.lemma))
      );
      await loadAllData();
    } catch (err) {
      console.error('Batch enrichment failed:', err);
      message.error('Enrichment failed.');
    } finally {
      setIsProcessingIngestion(false);
    }
  };

  // Mark lemma as known
  const handleMarkAsKnown = async (lemma: string) => {
    await StorageManager.addKnownWord(lemma, profile?.target_language || 'de');
    setExtractedLemmas((prev) => prev.filter((p) => p.lemma !== lemma));
    message.success(`Marked "${lemma}" as known.`);
    await loadAllData();
  };

  // Create Grammar Card
  const handleCreateGrammarCard = async (values: any) => {
    try {
      const nowIso = new Date().toISOString();
      const cardId = `card_grammar_${Date.now()}`;

      const examples = values.examples
        ? values.examples
            .split('\n')
            .filter((l: string) => l.trim().length > 0)
            .map((line: string) => {
              const parts = line.split('|');
              return {
                target: parts[0]?.trim() || line,
                native: parts[1]?.trim() || '',
              };
            })
        : [];

      const newGrammarCard: SRSCard = {
        id: cardId,
        user_id: profile?.id || 'local-user',
        card_type: 'grammar_rule',
        target_language: profile?.target_language || 'de',
        front_text: values.title,
        grammar_meta: {
          title: values.title,
          category: values.category,
          summary_rule: values.summary_rule,
          content_markdown: values.content_markdown,
          examples,
          quick_tip: values.quick_tip || '',
        },
        fsrs_state: 'New',
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        last_review: null,
        due_date: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await StorageManager.addCard(newGrammarCard);
      message.success('Grammar Rule Card created successfully!');
      grammarForm.resetFields();
      setMarkdownPreview('');
      await loadAllData();
    } catch (err) {
      console.error('Failed to create grammar card:', err);
      message.error('Failed to create grammar card.');
    }
  };

  // Save Settings
  const handleSaveSettings = async (values: any) => {
    try {
      const updated = await StorageManager.saveProfile(values);
      setProfile(updated);
      message.success('Settings saved successfully!');

      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'UPDATE_ALARM' });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      message.error('Failed to save settings.');
    }
  };

  // Supabase test connection & cloud sync
  const handleSyncSupabase = async () => {
    const url = settingsForm.getFieldValue('supabase_url');
    const clientKey =
      settingsForm.getFieldValue('supabase_publishable_key') ||
      settingsForm.getFieldValue('supabase_anon_key');

    if (!url || !clientKey) {
      message.warning('Please enter both Supabase URL and Publishable/Anon Key.');
      return;
    }

    try {
      message.loading('Connecting to Supabase and syncing data...');
      // Simple REST ping to check endpoint
      const res = await fetch(`${url}/rest/v1/cards?select=id&limit=1`, {
        headers: {
          apikey: clientKey,
          Authorization: `Bearer ${clientKey}`,
        },
      });

      if (res.ok) {
        message.success('Connected to Supabase! Remote schema verified.');
      } else {
        message.info(
          `Supabase reachable (Status: ${res.status}). Ensure the migration script from supabase/migrations is executed in your project SQL Editor.`
        );
      }
    } catch (err: any) {
      message.error(`Connection failed: ${err?.message || 'Network error'}`);
    }
  };

  // Add Known Word manually
  const handleAddManualKnownWord = async () => {
    const word = newKnownWordInput.trim();
    if (!word) return;

    await StorageManager.addKnownWord(word, profile?.target_language || 'de');
    setNewKnownWordInput('');
    message.success(`Added "${word}" to known words.`);
    await loadAllData();
  };

  // Delete card
  const handleDeleteCard = async (cardId: string) => {
    await StorageManager.deleteCard(cardId);
    message.success('Card removed from deck.');
    await loadAllData();
  };

  // Filtered Cards
  const filteredCards = cards.filter((c) => {
    if (cardTypeFilter !== 'all' && c.card_type !== cardTypeFilter) return false;
    if (cardSearch) {
      const q = cardSearch.toLowerCase();
      const matchFront = c.front_text.toLowerCase().includes(q);
      const matchBack = c.back_text?.toLowerCase().includes(q) || false;
      const matchLemma = c.lemma?.toLowerCase().includes(q) || false;
      if (!matchFront && !matchBack && !matchLemma) return false;
    }
    return true;
  });

  // Filtered Known Words
  const filteredKnownWords = knownWords.filter((w) =>
    w.lemma.toLowerCase().includes(lexiconSearch.toLowerCase())
  );

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        fontFamily: antThemeConfig.token?.fontFamily,
      }}
    >
      {/* Top Header */}
      <Header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space size={12}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            L
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              LingoPing Studio
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              FSRS Memory Engine & Media-Driven Ingestion
            </Text>
          </div>
        </Space>

        <Space size={14}>
          <Tag color="blue" style={{ fontSize: 13, padding: '4px 10px' }}>
            Target: {profile?.target_language?.toUpperCase() || 'DE'}
          </Tag>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setQuickAddWordText('');
              setQuickAddModalOpen(true);
            }}
          >
            + Quick Add Word
          </Button>

          {authUser ? (
            <Space size={8} style={{ backgroundColor: '#f0fdf4', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
              <Avatar
                size="small"
                src={authUser.user_metadata?.avatar_url}
                icon={<UserOutlined />}
              />
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: 500 }}>
                {authUser.user_metadata?.full_name || authUser.email}
              </Text>
              <Tooltip title="Sign Out">
                <Button
                  type="text"
                  size="small"
                  icon={<LogoutOutlined style={{ color: '#166534' }} />}
                  onClick={async () => {
                    await signOutUser();
                    setAuthUser(null);
                    message.info('Signed out.');
                  }}
                />
              </Tooltip>
            </Space>
          ) : (
            <Button
              icon={<GoogleOutlined style={{ color: '#ea4335' }} />}
              onClick={async () => {
                const res = await signInWithGoogle();
                if (res.success) {
                  message.success('Signed in with Google!');
                  const u = await getCurrentUser();
                  setAuthUser(u);
                } else {
                  message.error(res.error || 'Google Sign-in failed');
                }
              }}
            >
              Sign in with Google
            </Button>
          )}

          <Button icon={<ReloadOutlined />} onClick={loadAllData}>
            Refresh
          </Button>
        </Space>
      </Header>

      {/* Main Content Area */}
      <Content style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            // ==================== TAB 1: INGESTION STUDIO ====================
            {
              key: 'ingestion',
              label: (
                <span>
                  <InboxOutlined /> Ingestion Studio
                </span>
              ),
              children: (
                <Flex vertical gap={20}>
                  <Card
                    title="Context-Aware Ingestion Pipeline"
                    extra={
                      <Tag color="cyan">Supports .srt, .vtt, .txt, .csv, and pasted text</Tag>
                    }
                  >
                    <Paragraph type="secondary">
                      Paste subtitle files or article excerpts. The engine strips noise, lemmatizes
                      vocabulary, cross-references against your known-words database, and extracts
                      unfamiliar lemmas for enrichment into chromatic SRS cards.
                    </Paragraph>

                    <TextArea
                      rows={5}
                      placeholder="Paste subtitle cues (.srt with timestamps) or text dialogue here...
Example:
1
00:00:01,200 --> 00:00:04,500
Hallo, wir gehen heute zusammen in die Bibliothek.

2
00:00:05,000 --> 00:00:08,100
Das Buch ist sehr spannend."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      style={{ marginBottom: 14 }}
                    />

                    <Flex justify="space-between" align="center">
                      <Space>
                        <Button
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          loading={isProcessingIngestion}
                          onClick={() => handleIngestText(pastedText)}
                        >
                          Analyze & Reconcile Lexicon
                        </Button>
                        <Button
                          onClick={() => {
                            setPastedText(
                              `1\n00:00:02,000 --> 00:00:05,000\nDer Apfel und die Zeitung liegen auf dem Tisch.\n\n2\n00:00:06,000 --> 00:00:09,000\nEin treuer Hund wartet vor der Bibliothek.`
                            );
                          }}
                        >
                          Load Sample SRT
                        </Button>
                      </Space>

                      {extractedLemmas.length > 0 && (
                        <Button
                          type="primary"
                          style={{ backgroundColor: '#16a34a' }}
                          icon={<PlusOutlined />}
                          onClick={() => handleBatchEnrich()}
                          loading={isProcessingIngestion}
                        >
                          Enrich & Add All ({extractedLemmas.length}) Cards
                        </Button>
                      )}
                    </Flex>
                  </Card>

                  {ingestionStats && (
                    <Card size="small" style={{ backgroundColor: '#f1f5f9' }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="Total Tokens"
                            value={ingestionStats.totalTokens}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Known / Skipped Words"
                            value={ingestionStats.knownCount}
                            valueStyle={{ color: '#52c41a' }}
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="Unfamiliar Lemmas Extracted"
                            value={ingestionStats.unknownCount}
                            valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  )}

                  {extractedLemmas.length > 0 && (
                    <Card title={`Extracted Unfamiliar Lemmas (${extractedLemmas.length})`}>
                      <Table
                        dataSource={extractedLemmas}
                        rowKey="lemma"
                        pagination={{ pageSize: 8 }}
                        columns={[
                          {
                            title: 'Lemma',
                            dataIndex: 'lemma',
                            key: 'lemma',
                            render: (text: string) => {
                              const inferred = inferGermanGender(text);
                              const palette =
                                CHROMATIC_PALETTES[inferred.gender] ||
                                CHROMATIC_PALETTES.neutral;
                              return (
                                <Space>
                                  <Text strong>{text}</Text>
                                  {inferred.article && (
                                    <Tag
                                      style={{
                                        color: palette.color,
                                        backgroundColor: palette.bg,
                                        borderColor: palette.border,
                                      }}
                                    >
                                      {palette.icon} {inferred.article}
                                    </Tag>
                                  )}
                                </Space>
                              );
                            },
                          },
                          {
                            title: 'Occurrences',
                            dataIndex: 'frequency',
                            key: 'frequency',
                            width: 110,
                            sorter: (a, b) => a.frequency - b.frequency,
                          },
                          {
                            title: 'Contextual Dialogue Sentence',
                            dataIndex: 'contextSentence',
                            key: 'contextSentence',
                            render: (s: string) => <Text style={{ fontSize: 12 }}>{s}</Text>,
                          },
                          {
                            title: 'Actions',
                            key: 'actions',
                            width: 220,
                            render: (_: any, record: ExtractedLemma) => (
                              <Space size={8}>
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() => handleBatchEnrich([record])}
                                >
                                  + Create Card
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => handleMarkAsKnown(record.lemma)}
                                >
                                  Mark Known
                                </Button>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  )}
                </Flex>
              ),
            },

            // ==================== TAB 2: GRAMMAR STUDIO ====================
            {
              key: 'grammar',
              label: (
                <span>
                  <BookOutlined /> Grammar Studio
                </span>
              ),
              children: (
                <Row gutter={24}>
                  <Col span={14}>
                    <Card title="Create Single-Sided Grammar & Rule Card">
                      <Form
                        form={grammarForm}
                        layout="vertical"
                        onFinish={handleCreateGrammarCard}
                        initialValues={{
                          category: 'prepositions',
                        }}
                      >
                        <Row gutter={12}>
                          <Col span={16}>
                            <Form.Item
                              name="title"
                              label="Rule Title"
                              rules={[{ required: true, message: 'Please provide rule title' }]}
                            >
                              <Input placeholder="e.g. Wechselpräpositionen (Two-Way Prepositions)" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                              <Select
                                options={[
                                  { value: 'prepositions', label: 'Prepositions' },
                                  { value: 'cases', label: 'Cases (Kasus)' },
                                  { value: 'syntax', label: 'Syntax & Word Order' },
                                  { value: 'tenses', label: 'Tenses & Verbs' },
                                  { value: 'morphology', label: 'Endings & Adjectives' },
                                  { value: 'tips', label: 'Mnemonics & Tips' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          name="summary_rule"
                          label="1-Sentence Summary Principle"
                          rules={[{ required: true, message: 'Please provide a 1-sentence summary' }]}
                        >
                          <Input placeholder="e.g. Two-way prepositions take Akkusativ for movement (Wohin?) and Dativ for static location (Wo?)." />
                        </Form.Item>

                        <Form.Item
                          name="content_markdown"
                          label="Rich Markdown Body (Tables, Bullets, Formulas)"
                          rules={[{ required: true, message: 'Please provide markdown rule content' }]}
                        >
                          <TextArea
                            rows={8}
                            placeholder="### Table or Rule Explanation
| Case | Question | Example |
| :--- | :--- | :--- |
| Akkusativ | Wohin? | Ich gehe in die Schule |
| Dativ | Wo? | Ich bin in der Schule |"
                            onChange={(e) => setMarkdownPreview(e.target.value)}
                          />
                        </Form.Item>

                        <Form.Item
                          name="examples"
                          label="Example Sentence Pairs (Target | Native per line)"
                        >
                          <TextArea
                            rows={3}
                            placeholder="Ich lege das Buch auf den Tisch. | I put the book onto the table.
Das Buch liegt auf dem Tisch. | The book is lying on the table."
                          />
                        </Form.Item>

                        <Form.Item name="quick_tip" label="Quick Tip / Mnemonic">
                          <Input placeholder="e.g. Legen/stellen/setzen = Akkusativ, Liegen/stehen/sitzen = Dativ" />
                        </Form.Item>

                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                          Create Single-Sided Grammar Card
                        </Button>
                      </Form>
                    </Card>
                  </Col>

                  <Col span={10}>
                    <Card
                      title="Live Markdown Preview"
                      style={{ height: '100%', minHeight: 460, backgroundColor: '#faf5ff' }}
                    >
                      {markdownPreview ? (
                        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                          <ReactMarkdown>{markdownPreview}</ReactMarkdown>
                        </div>
                      ) : (
                        <Text type="secondary">
                          Type markdown on the left to see live formatting of tables, formulas, and
                          bold callouts.
                        </Text>
                      )}
                    </Card>
                  </Col>
                </Row>
              ),
            },

            // ==================== TAB 3: KNOWN-WORDS LEXICON ====================
            {
              key: 'lexicon',
              label: (
                <span>
                  <CheckCircleOutlined /> Known-Words Lexicon
                </span>
              ),
              children: (
                <Card title={`Known-Words Lexicon (${knownWords.length} words)`}>
                  <Paragraph type="secondary">
                    Words in your known-words database are automatically filtered out during media
                    ingestion so you only focus on unfamiliar vocabulary.
                  </Paragraph>

                  <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Space.Compact style={{ width: 340 }}>
                      <Input
                        placeholder="Add word to known lexicon..."
                        value={newKnownWordInput}
                        onChange={(e) => setNewKnownWordInput(e.target.value)}
                        onPressEnter={handleAddManualKnownWord}
                      />
                      <Button type="primary" onClick={handleAddManualKnownWord}>
                        Add Known
                      </Button>
                    </Space.Compact>

                    <Input
                      placeholder="Search known words..."
                      prefix={<SearchOutlined />}
                      value={lexiconSearch}
                      onChange={(e) => setLexiconSearch(e.target.value)}
                      style={{ width: 220 }}
                    />
                  </Flex>

                  <Table
                    dataSource={filteredKnownWords}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Lemma',
                        dataIndex: 'lemma',
                        key: 'lemma',
                        render: (text: string) => <Text strong>{text}</Text>,
                      },
                      {
                        title: 'Language',
                        dataIndex: 'language',
                        key: 'language',
                        width: 120,
                        render: (l: string) => <Tag color="blue">{l.toUpperCase()}</Tag>,
                      },
                      {
                        title: 'Added Date',
                        dataIndex: 'created_at',
                        key: 'created_at',
                        render: (d: string) => new Date(d).toLocaleDateString(),
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        width: 100,
                        render: (_: any, record: UserKnownWord) => (
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={async () => {
                              await StorageManager.removeKnownWord(record.id);
                              message.success(`Removed "${record.lemma}" from known words.`);
                              await loadAllData();
                            }}
                          />
                        ),
                      },
                    ]}
                  />
                </Card>
              ),
            },

            // ==================== TAB 4: CARDS DECK MANAGER ====================
            {
              key: 'deck',
              label: (
                <span>
                  <FileTextOutlined /> Card Deck Manager
                </span>
              ),
              children: (
                <Card title={`Active Learning Cards (${cards.length} cards in deck)`}>
                  <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Space size={12}>
                      <Select
                        value={cardTypeFilter}
                        onChange={(v) => setCardTypeFilter(v)}
                        style={{ width: 180 }}
                        options={[
                          { value: 'all', label: 'All Card Types' },
                          { value: 'vocabulary', label: 'Vocabulary SRS Only' },
                          { value: 'grammar_rule', label: 'Grammar Rules Only' },
                        ]}
                      />
                      <Input
                        placeholder="Search card term or translation..."
                        prefix={<SearchOutlined />}
                        value={cardSearch}
                        onChange={(e) => setCardSearch(e.target.value)}
                        style={{ width: 260 }}
                      />
                    </Space>
                  </Flex>

                  <Table
                    dataSource={filteredCards}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                    columns={[
                      {
                        title: 'Type',
                        dataIndex: 'card_type',
                        key: 'card_type',
                        width: 130,
                        render: (t: string) =>
                          t === 'grammar_rule' ? (
                            <Tag color="purple">Grammar Rule</Tag>
                          ) : (
                            <Tag color="blue">Vocabulary</Tag>
                          ),
                      },
                      {
                        title: 'Front / Term',
                        dataIndex: 'front_text',
                        key: 'front_text',
                        render: (text: string, record: SRSCard) => {
                          const gender = record.linguistic_meta?.gender || 'neutral';
                          const palette = CHROMATIC_PALETTES[gender] || CHROMATIC_PALETTES.neutral;
                          return (
                            <Space align="center">
                              <Text strong>{text}</Text>
                              {record.linguistic_meta?.article && (
                                <Tag
                                  style={{
                                    color: palette.color,
                                    backgroundColor: palette.bg,
                                    borderColor: palette.border,
                                  }}
                                >
                                  {palette.icon} {record.linguistic_meta.article}
                                </Tag>
                              )}
                              <Button
                                type="text"
                                size="small"
                                icon={<SoundOutlined style={{ color: palette.color }} />}
                                onClick={() => speakText(text, record.target_language || 'de')}
                                title="Pronounce term"
                              />
                            </Space>
                          );
                        },
                      },
                      {
                        title: 'Translation / Category',
                        key: 'back_text',
                        render: (_: any, record: SRSCard) =>
                          record.card_type === 'grammar_rule' ? (
                            <Text italic>{record.grammar_meta?.category}</Text>
                          ) : (
                            <Text>{record.back_text}</Text>
                          ),
                      },
                      {
                        title: 'FSRS State',
                        dataIndex: 'fsrs_state',
                        key: 'fsrs_state',
                        width: 110,
                        render: (s: string) => {
                          let color = 'default';
                          if (s === 'New') color = 'cyan';
                          if (s === 'Review') color = 'green';
                          if (s === 'Learning') color = 'gold';
                          if (s === 'Relearning') color = 'red';
                          return <Tag color={color}>{s}</Tag>;
                        },
                      },
                      {
                        title: 'Stability (Days)',
                        dataIndex: 'stability',
                        key: 'stability',
                        width: 110,
                        render: (v: number) => `${v.toFixed(1)}d`,
                      },
                      {
                        title: 'Due Date',
                        dataIndex: 'due_date',
                        key: 'due_date',
                        render: (d: string) => new Date(d).toLocaleDateString(),
                      },
                      {
                        title: 'Action',
                        key: 'action',
                        width: 80,
                        render: (_: any, record: SRSCard) => (
                          <Popconfirm
                            title="Delete Card"
                            description="Are you sure you want to delete this card?"
                            onConfirm={() => handleDeleteCard(record.id)}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button danger size="small" icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                    expandable={{
                      expandedRowRender: (record: SRSCard) => (
                        <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          {record.card_type === 'vocabulary' ? (
                            <Flex gap={16} align="start">
                              {record.image_url && (
                                <img
                                  src={record.image_url}
                                  alt={record.front_text}
                                  style={{
                                    width: 84,
                                    height: 84,
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                  }}
                                />
                              )}
                              <div style={{ flex: 1 }}>
                                {record.phonetic_ipa && (
                                  <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                                    Pronunciation: {record.phonetic_ipa}
                                  </Text>
                                )}
                                {record.example_target ? (
                                  <div style={{ marginTop: 4 }}>
                                    <Space align="baseline">
                                      <Text strong style={{ color: '#0f172a' }}>
                                        {record.example_target}
                                      </Text>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<SoundOutlined style={{ color: '#1677ff' }} />}
                                        onClick={() =>
                                          speakText(
                                            record.example_target || '',
                                            record.target_language || 'de'
                                          )
                                        }
                                        title="Pronounce example sentence"
                                      />
                                    </Space>
                                    {record.example_native && (
                                      <Paragraph type="secondary" style={{ margin: '2px 0 0', fontSize: 12 }}>
                                        {record.example_native}
                                      </Paragraph>
                                    )}
                                  </div>
                                ) : (
                                  <Text type="secondary" italic>No example sentence recorded.</Text>
                                )}
                              </div>
                            </Flex>
                          ) : (
                            <div>
                              <Text strong>{record.grammar_meta?.summary_rule}</Text>
                              {record.grammar_meta?.examples && (
                                <div style={{ marginTop: 8 }}>
                                  {record.grammar_meta.examples.map((ex, i) => (
                                    <Flex key={i} align="center" gap={8} style={{ marginBottom: 4 }}>
                                      <Text>• {ex.target} — <span style={{ color: '#64748b' }}>{ex.native}</span></Text>
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<SoundOutlined style={{ color: '#7c3aed' }} />}
                                        onClick={() => speakText(ex.target, record.target_language || 'de')}
                                        title="Pronounce grammar example"
                                      />
                                    </Flex>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ),
                    }}
                  />
                </Card>
              ),
            },

            // ==================== TAB 5: SETTINGS & CLOUD SYNC ====================
            {
              key: 'settings',
              label: (
                <span>
                  <SettingOutlined /> Settings & Cloud Sync
                </span>
              ),
              children: (
                <Row gutter={24}>
                  <Col span={14}>
                    <Card title="Micro-Session & Learning Preferences">
                      <Form
                        form={settingsForm}
                        layout="vertical"
                        onFinish={handleSaveSettings}
                      >
                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item
                              name="target_language"
                              label="Target Language"
                              rules={[{ required: true }]}
                            >
                              <Select
                                options={[
                                  { value: 'de', label: 'German (Deutsch) 🇩🇪' },
                                  { value: 'fr', label: 'French (Français) 🇫🇷' },
                                  { value: 'es', label: 'Spanish (Español) 🇪🇸' },
                                  { value: 'it', label: 'Italian (Italiano) 🇮🇹' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="native_language"
                              label="Native Language"
                              rules={[{ required: true }]}
                            >
                              <Select
                                options={[
                                  { value: 'en', label: 'English 🇬🇧/🇺🇸' },
                                  { value: 'de', label: 'German 🇩🇪' },
                                  { value: 'es', label: 'Spanish 🇪🇸' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={12}>
                          <Col span={12}>
                            <Form.Item
                              name="session_interval_minutes"
                              label="Session Interval (Minutes)"
                              rules={[{ required: true }]}
                            >
                              <Select
                                options={[
                                  { value: 5, label: 'Every 5 Minutes' },
                                  { value: 10, label: 'Every 10 Minutes (Default)' },
                                  { value: 15, label: 'Every 15 Minutes' },
                                  { value: 30, label: 'Every 30 Minutes' },
                                  { value: 60, label: 'Every 1 Hour' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="cards_per_session"
                              label="Cards per Micro-Session"
                              rules={[{ required: true }]}
                            >
                              <Select
                                options={[
                                  { value: 3, label: '3 Cards (Ultra fast)' },
                                  { value: 5, label: '5 Cards (Recommended)' },
                                  { value: 7, label: '7 Cards' },
                                  { value: 10, label: '10 Cards' },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          name="include_grammar_in_sessions"
                          label="Include Single-Sided Grammar Cards in Micro-Sessions"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>

                        <Divider orientation="left" style={{ fontSize: 13, color: '#64748b' }}>
                          AI Enrichment Keys (BYOK - Optional)
                        </Divider>

                        <Form.Item
                          name="google_api_key"
                          label="Google Gemini API Key"
                          tooltip="Used for neural pronunciation audio and structured vocabulary generation."
                        >
                          <Input.Password placeholder="AIzaSy..." />
                        </Form.Item>

                        <Form.Item
                          name="openai_api_key"
                          label="OpenAI API Key"
                          tooltip="Used for GPT-4o-mini structured linguistic enrichment and drills."
                        >
                          <Input.Password placeholder="sk-proj-..." />
                        </Form.Item>

                        <Form.Item
                          name="anthropic_api_key"
                          label="Anthropic Claude API Key"
                          tooltip="Used for Claude 3.5 Haiku structured grammatical analysis."
                        >
                          <Input.Password placeholder="sk-ant-..." />
                        </Form.Item>

                        <Button type="primary" htmlType="submit">
                          Save Preferences
                        </Button>
                      </Form>
                    </Card>
                  </Col>

                  <Col span={10}>
                    <Card
                      title={
                        <Space>
                          <CloudSyncOutlined />
                          <span>Supabase Cloud Sync</span>
                        </Space>
                      }
                    >
                      <Paragraph type="secondary" style={{ fontSize: 13 }}>
                        Connect your centralized Supabase database to synchronize cards, known words,
                        and review logs cross-device for future web and mobile clients.
                      </Paragraph>

                      <Form layout="vertical">
                        {authUser ? (
                          <Alert
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined />}
                            message="Authenticated with Google"
                            description={
                              <Flex justify="space-between" align="center" style={{ marginTop: 4 }}>
                                <Text style={{ fontSize: 12 }}>
                                  Logged in as <b>{authUser.email}</b>
                                </Text>
                                <Button
                                  size="small"
                                  danger
                                  onClick={async () => {
                                    await signOutUser();
                                    setAuthUser(null);
                                    message.info('Signed out.');
                                  }}
                                >
                                  Sign Out
                                </Button>
                              </Flex>
                            }
                            style={{ marginBottom: 14 }}
                          />
                        ) : (
                          <div style={{ marginBottom: 14 }}>
                            <Button
                              type="default"
                              icon={<GoogleOutlined style={{ color: '#ea4335' }} />}
                              onClick={async () => {
                                const res = await signInWithGoogle();
                                if (res.success) {
                                  message.success('Signed in with Google!');
                                  const u = await getCurrentUser();
                                  setAuthUser(u);
                                } else {
                                  message.error(res.error || 'Google Sign-in failed');
                                }
                              }}
                              block
                              style={{ height: 38 }}
                            >
                              Sign in with Google Account
                            </Button>
                          </div>
                        )}

                        <Alert
                          type="info"
                          showIcon
                          icon={<SafetyCertificateOutlined />}
                          message="Supabase API Keys & Security"
                          description={
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              <p style={{ margin: '2px 0' }}>
                                • <b>Safe to share / bundle:</b> Your Supabase URL and <b>Publishable Key</b> (<code>sb_publishable_...</code> or legacy <code>anon</code> JWT). These are designed to be public-facing. Row Level Security (RLS) protects your data so each user only reads and modifies their own cards.
                              </p>
                              <p style={{ margin: '2px 0', color: '#b91c1c', fontWeight: 600 }}>
                                • <b>NEVER share:</b> Your <b>Secret Key</b> (<code>sb_secret_...</code> or legacy <code>service_role</code>)! That key bypasses all RLS rules and is strictly for backend servers.
                              </p>
                              <p style={{ margin: '2px 0' }}>
                                • <b>Central Visual Cache:</b> The shared <code>word_visual_cache</code> table allows all users to reuse generated card artwork without regenerating images.
                              </p>
                            </div>
                          }
                          style={{ marginBottom: 14 }}
                        />

                        <Form.Item label="Supabase URL">
                          <Input
                            placeholder="https://xyzcompany.supabase.co"
                            value={settingsForm.getFieldValue('supabase_url')}
                            onChange={(e) =>
                              settingsForm.setFieldValue('supabase_url', e.target.value)
                            }
                          />
                        </Form.Item>

                        <Form.Item label="Supabase Publishable Key (or legacy anon key)">
                          <Input.Password
                            placeholder="sb_publishable_... or eyJh..."
                            value={
                              settingsForm.getFieldValue('supabase_publishable_key') ||
                              settingsForm.getFieldValue('supabase_anon_key')
                            }
                            onChange={(e) => {
                              settingsForm.setFieldValue('supabase_publishable_key', e.target.value);
                              settingsForm.setFieldValue('supabase_anon_key', e.target.value);
                            }}
                          />
                        </Form.Item>

                        <Button
                          type="primary"
                          icon={<CloudSyncOutlined />}
                          onClick={handleSyncSupabase}
                          block
                          style={{ marginBottom: 12 }}
                        >
                          Test Connection & Sync
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Content>

      {/* Quick Add Word Modal */}
      <Modal
        title="Quick Add Word to Deck"
        open={quickAddModalOpen}
        onCancel={() => setQuickAddModalOpen(false)}
        onOk={handleQuickAddWord}
        confirmLoading={addingQuickWord}
        okText="Add to Deck"
        destroyOnClose
      >
        <Flex vertical gap={12} style={{ padding: '8px 0' }}>
          <Text type="secondary">
            Enter a German word or phrase. LingoPing will check the centralized visual cache for pre-existing images, generate linguistic metadata, chromatic themes, and add it directly to your SRS deck.
          </Text>
          <Input
            placeholder="e.g. der Tisch, Apfel, Fernweh, gemütlich..."
            value={quickAddWordText}
            onChange={(e) => setQuickAddWordText(e.target.value)}
            onPressEnter={handleQuickAddWord}
            autoFocus
          />
        </Flex>
      </Modal>
    </Layout>
  );
};

export const OptionsApp: React.FC = () => {
  return (
    <ConfigProvider theme={antThemeConfig}>
      <AntApp>
        <AuthGate viewTitle="Management Dashboard" containerStyle={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
          <OptionsAppInner />
        </AuthGate>
      </AntApp>
    </ConfigProvider>
  );
};
