import React, { useState, useEffect, useCallback } from 'react';
import {
  ConfigProvider,
  App as AntApp,
  Layout,
  Card as AntCard,
  Button,
  Tag,
  Progress,
  Space,
  Flex,
  Typography,
  Modal,
  Radio,
  Result,
  Alert,
  Tooltip,
  Divider,
  Input,
} from 'antd';
import {
  SoundOutlined,
  SwapOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  BookOutlined,
  BulbOutlined,
  RedoOutlined,
  CloseOutlined,
  SmileOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardRating,
  FSRSEngine,
  InteractiveDrill,
  generateInteractiveDrill,
  enrichVocabularyOffline,
  createCardFromEnrichment,
} from '@lingoping/core';
import { StorageManager } from '../storage/index.js';
import { antThemeConfig, CHROMATIC_PALETTES } from '../theme/index.js';
import { speakText } from '../utils/audio.js';

const { Title, Text, Paragraph } = Typography;
const { Header, Content, Footer } = Layout;

export const SessionAppInner: React.FC = () => {
  const { message } = AntApp.useApp();
  const [fsrsEngine] = useState(() => new FSRSEngine());

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Drill modal state
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [activeDrill, setActiveDrill] = useState<InteractiveDrill | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [drillSubmitted, setDrillSubmitted] = useState(false);

  // Quick add word modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickWordText, setQuickWordText] = useState('');
  const [addingQuickWord, setAddingQuickWord] = useState(false);

  // Auto-close countdown
  const [closeSeconds, setCloseSeconds] = useState(2);

  // Load session cards
  useEffect(() => {
    async function initSession() {
      try {
        setLoading(true);
        const profile = await StorageManager.getProfile();
        const allCards = await StorageManager.getCards();

        if (allCards.length === 0) {
          message.warning('No cards available in your collection.');
          setLoading(false);
          return;
        }

        const sessionCards = fsrsEngine.assembleSession(
          allCards,
          profile.cards_per_session || 5,
          profile.include_grammar_in_sessions ?? true
        );

        setCards(sessionCards);
      } catch (err) {
        console.error('Failed to assemble session:', err);
        message.error('Failed to load session cards.');
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [fsrsEngine, message]);

  const currentCard: Card | undefined = cards[currentIndex];

  // Helper to rate card
  const handleRating = useCallback(
    async (rating: CardRating) => {
      if (!currentCard) return;

      const { card: updatedCard, reviewLog } = fsrsEngine.schedule(
        currentCard,
        rating
      );

      // Persist updated card and log
      await StorageManager.updateCard(updatedCard);
      await StorageManager.logReview(reviewLog);

      // Advance
      const nextIdx = currentIndex + 1;
      setCompletedCount((c) => c + 1);
      setIsFlipped(false);

      if (nextIdx < cards.length) {
        setCurrentIndex(nextIdx);
      } else {
        setSessionCompleted(true);
      }
    },
    [currentCard, currentIndex, cards.length, fsrsEngine]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (sessionCompleted || drillModalOpen || !currentCard) return;

      if (currentCard.card_type === 'vocabulary') {
        if (!isFlipped && (e.code === 'Space' || e.code === 'Enter')) {
          e.preventDefault();
          setIsFlipped(true);
        } else if (isFlipped) {
          if (e.key === '1') handleRating(1);
          if (e.key === '2') handleRating(2);
          if (e.key === '3') handleRating(3);
          if (e.key === '4') handleRating(4);
        }
      } else if (currentCard.card_type === 'grammar_rule') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleRating(3); // Got it (Good)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionCompleted, drillModalOpen, currentCard, isFlipped, handleRating]);

  // Handle auto-close on completion
  useEffect(() => {
    if (sessionCompleted) {
      const timer = setInterval(() => {
        setCloseSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (typeof window !== 'undefined') {
              window.close();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sessionCompleted]);

  const handleOpenDrill = () => {
    if (!currentCard) return;
    const drill = generateInteractiveDrill(currentCard);
    setActiveDrill(drill);
    setSelectedAnswer(null);
    setDrillSubmitted(false);
    setDrillModalOpen(true);
  };

  const handlePronounce = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentCard) return;
    const textToSpeak =
      currentCard.lemma || currentCard.front_text || currentCard.example_target || '';
    speakText(textToSpeak, currentCard.target_language || 'de');
  };

  const handleQuickAddWord = async () => {
    const word = quickWordText.trim();
    if (!word) return;

    try {
      setAddingQuickWord(true);
      const profile = await StorageManager.getProfile();
      const targetLang = profile.target_language || 'de';

      const cachedVisual = await StorageManager.getCachedVisual(word, targetLang);

      const enriched = enrichVocabularyOffline(
        word,
        targetLang,
        profile.native_language || 'en'
      );

      if (cachedVisual) {
        enriched.visual_mnemonic = {
          image_prompt: cachedVisual.visualMeta.image_prompt || '',
          color_theme: cachedVisual.visualMeta.theme_color,
          color_hex: cachedVisual.visualMeta.hex,
        };
      }

      const newCard = createCardFromEnrichment(enriched, profile.id);
      if (cachedVisual) {
        newCard.image_url = cachedVisual.imageUrl;
        newCard.visual_meta = cachedVisual.visualMeta;
      }

      await StorageManager.addCard(newCard);
      message.success(`Added "${newCard.front_text}" (${newCard.back_text}) to deck!`);
      setQuickWordText('');
      setQuickAddOpen(false);

      setCards((prev) => [...prev, newCard]);
    } catch (err) {
      console.error('Quick add word error:', err);
      message.error('Failed to add word.');
    } finally {
      setAddingQuickWord(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ height: '100vh' }}>
        <Text>Preparing your micro-session...</Text>
      </Flex>
    );
  }

  if (sessionCompleted) {
    return (
      <Flex
        vertical
        justify="center"
        align="center"
        style={{ height: '100vh', padding: 24, textAlign: 'center' }}
      >
        <Result
          icon={<SmileOutlined style={{ color: '#1677ff', fontSize: 56 }} />}
          title="Session Complete!"
          subTitle={`You just reviewed ${completedCount} cards with optimal spaced repetition.`}
          extra={[
            <Paragraph key="timer" type="secondary">
              Closing automatically in {closeSeconds}s...
            </Paragraph>,
            <Button
              key="close"
              type="primary"
              onClick={() => window.close()}
            >
              Close Now
            </Button>,
          ]}
        />
      </Flex>
    );
  }

  if (!currentCard) {
    return (
      <Flex justify="center" align="center" style={{ height: '100vh', padding: 20 }}>
        <Result
          status="success"
          title="All caught up!"
          subTitle="No cards are currently due for review."
          extra={<Button onClick={() => window.close()}>Close</Button>}
        />
      </Flex>
    );
  }

  // Chromatic gender theme
  const gender = currentCard.linguistic_meta?.gender || 'neutral';
  const palette = CHROMATIC_PALETTES[gender] || CHROMATIC_PALETTES.neutral;

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <Layout
      style={{
        height: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <Header
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          height: 'auto',
          borderBottom: '1px solid #f0f0f0',
          lineHeight: 'normal',
        }}
      >
        <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
          <Space size={8}>
            <Text strong style={{ fontSize: 13, color: '#334155' }}>
              Card {currentIndex + 1} of {cards.length}
            </Text>
            {currentCard.card_type === 'grammar_rule' ? (
              <Tag color="purple" icon={<BookOutlined />}>
                Grammar Rule
              </Tag>
            ) : (
              <Tag color="blue" icon={<ThunderboltOutlined />}>
                Vocabulary
              </Tag>
            )}
          </Space>

          <Space size={6}>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setQuickWordText('');
                setQuickAddOpen(true);
              }}
            >
              + Add Word
            </Button>
            <Tooltip title="Close Session">
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => window.close()}
              />
            </Tooltip>
          </Space>
        </Flex>

        <Progress
          percent={progressPercent}
          showInfo={false}
          strokeColor="#1677ff"
          size={['100%', 4]}
        />
      </Header>

      {/* Main Card View */}
      <Content style={{ flex: 1, padding: '14px 16px', overflowY: 'auto' }}>
        {currentCard.card_type === 'vocabulary' ? (
          // ==================== MODE A: VOCABULARY CARD ====================
          !isFlipped ? (
            // Card Front
            <AntCard
              hoverable
              onClick={() => setIsFlipped(true)}
              style={{
                minHeight: 440,
                border: `2px solid ${palette.border}`,
                boxShadow: `0 8px 24px ${palette.color}15`,
                cursor: 'pointer',
              }}
              styles={{
                body: {
                  minHeight: 440,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 24,
                },
              }}
            >
              <Flex
                vertical
                align="center"
                justify="center"
                gap={18}
                style={{ width: '100%' }}
              >
                {currentCard.linguistic_meta?.article && (
                  <Tag
                    style={{
                      fontSize: 16,
                      padding: '4px 16px',
                      borderRadius: 20,
                      color: palette.color,
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                      fontWeight: 700,
                    }}
                  >
                    {palette.icon} {currentCard.linguistic_meta.article}
                  </Tag>
                )}

                <Title
                  level={1}
                  style={{
                    margin: 0,
                    fontSize: 42,
                    fontWeight: 700,
                    color: '#0f172a',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {currentCard.front_text}
                </Title>

                {currentCard.phonetic_ipa && (
                  <Text type="secondary" style={{ fontSize: 16, color: '#64748b' }}>
                    {currentCard.phonetic_ipa}
                  </Text>
                )}

                <Button
                  shape="circle"
                  type="primary"
                  icon={<SoundOutlined style={{ fontSize: 20 }} />}
                  size="large"
                  onClick={handlePronounce}
                  style={{
                    backgroundColor: palette.color,
                    width: 52,
                    height: 52,
                    boxShadow: `0 4px 14px ${palette.color}40`,
                  }}
                />

                <Divider style={{ margin: '14px 0 6px' }} />

                <Text type="secondary" style={{ fontSize: 12, color: '#94a3b8' }}>
                  Click or press <Tag>Space</Tag> to reveal answer
                </Text>
              </Flex>
            </AntCard>
          ) : (
            // Card Back
            <AntCard
              style={{
                minHeight: 440,
                border: `2px solid ${palette.border}`,
                boxShadow: `0 8px 24px ${palette.color}15`,
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Flex vertical gap={12}>
                {/* Chromatic Visual Mnemonics */}
                {currentCard.image_url && (
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 8,
                      overflow: 'hidden',
                      height: 180,
                      backgroundColor: palette.bg,
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    <img
                      src={currentCard.image_url}
                      alt={currentCard.front_text}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      loading="lazy"
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {palette.icon} {gender.toUpperCase()}
                    </div>
                  </div>
                )}

                {/* Word & Meaning */}
                <Flex justify="space-between" align="baseline">
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: 22,
                        color: palette.color,
                        marginRight: 8,
                      }}
                    >
                      {currentCard.linguistic_meta?.article}{' '}
                      {currentCard.front_text}
                    </Text>
                    {currentCard.linguistic_meta?.plural && (
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        ({currentCard.linguistic_meta.plural})
                      </Text>
                    )}
                  </div>
                  <Button
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={handlePronounce}
                  />
                </Flex>

                <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
                  {currentCard.back_text}
                </Title>

                {/* Contextual Example Sentence */}
                {currentCard.example_target && (
                  <div
                    style={{
                      backgroundColor: '#f1f5f9',
                      padding: '10px 14px',
                      borderRadius: 8,
                      borderLeft: `4px solid ${palette.color}`,
                    }}
                  >
                    <Flex justify="space-between" align="start" gap={8}>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                          {currentCard.example_target}
                        </Text>
                        {currentCard.example_native && (
                          <Paragraph
                            type="secondary"
                            style={{ margin: '4px 0 0', fontSize: 12 }}
                          >
                            {currentCard.example_native}
                          </Paragraph>
                        )}
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<SoundOutlined style={{ color: palette.color, fontSize: 16 }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(
                            currentCard.example_target || '',
                            currentCard.target_language || 'de'
                          );
                        }}
                        title="Pronounce example sentence"
                      />
                    </Flex>
                  </div>
                )}

                {/* Interactive Challenge Trigger */}
                <Button
                  icon={<BulbOutlined />}
                  onClick={handleOpenDrill}
                  style={{ borderColor: palette.border }}
                >
                  Interactive Challenge Drill
                </Button>
              </Flex>
            </AntCard>
          )
        ) : (
          // ==================== MODE B: SINGLE-SIDED GRAMMAR CARD ====================
          <AntCard
            style={{
              minHeight: 480,
              border: '2px solid #e9d5ff',
              boxShadow: '0 8px 24px rgba(168, 85, 247, 0.1)',
            }}
            styles={{ body: { padding: 18 } }}
          >
            <Flex vertical gap={14}>
              {/* Header */}
              <Flex justify="space-between" align="center">
                <Tag color="purple">
                  {currentCard.grammar_meta?.category?.toUpperCase() || 'GRAMMAR RULE'}
                </Tag>
                <Tag color="cyan">Single-Sided Review</Tag>
              </Flex>

              <Title level={3} style={{ margin: 0, color: '#4c1d95' }}>
                {currentCard.grammar_meta?.title || currentCard.front_text}
              </Title>

              {/* High-level 1-sentence summary callout */}
              {currentCard.grammar_meta?.summary_rule && (
                <Alert
                  type="info"
                  showIcon
                  icon={<BulbOutlined style={{ color: '#7c3aed' }} />}
                  message={
                    <Text strong style={{ color: '#4c1d95' }}>
                      Core Principle
                    </Text>
                  }
                  description={currentCard.grammar_meta.summary_rule}
                  style={{
                    backgroundColor: '#faf5ff',
                    border: '1px solid #f3e8ff',
                  }}
                />
              )}

              {/* Rich Markdown Body */}
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#334155',
                  maxHeight: 200,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                <ReactMarkdown>
                  {currentCard.grammar_meta?.content_markdown || ''}
                </ReactMarkdown>
              </div>

              {/* Example Pairs */}
              {currentCard.grammar_meta?.examples &&
                currentCard.grammar_meta.examples.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Text strong style={{ fontSize: 12, color: '#475569' }}>
                      Examples:
                    </Text>
                    {currentCard.grammar_meta.examples.map((ex, i) => (
                      <Flex
                        key={i}
                        justify="space-between"
                        align="center"
                        style={{ marginTop: 6 }}
                      >
                        <div style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: '#0f172a' }}>
                            • {ex.target}
                          </Text>
                          <Paragraph
                            type="secondary"
                            style={{ margin: 0, fontSize: 11, paddingLeft: 12 }}
                          >
                            {ex.native}
                          </Paragraph>
                        </div>
                        <Button
                          type="text"
                          size="small"
                          icon={<SoundOutlined style={{ color: '#7c3aed', fontSize: 15 }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            speakText(ex.target, currentCard.target_language || 'de');
                          }}
                          title="Pronounce example"
                        />
                      </Flex>
                    ))}
                  </div>
                )}

              {/* Quick Tip */}
              {currentCard.grammar_meta?.quick_tip && (
                <Text type="secondary" italic style={{ fontSize: 12 }}>
                  💡 Tip: {currentCard.grammar_meta.quick_tip}
                </Text>
              )}
            </Flex>
          </AntCard>
        )}
      </Content>

      {/* Bottom Action / Rating Bar */}
      <Footer
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        {currentCard.card_type === 'vocabulary' ? (
          !isFlipped ? (
            <Button
              type="primary"
              block
              size="large"
              icon={<SwapOutlined />}
              onClick={() => setIsFlipped(true)}
              style={{ height: 44, fontSize: 15 }}
            >
              Show Answer (Space)
            </Button>
          ) : (
            <Flex gap={8} justify="space-between">
              <Button
                danger
                style={{ flex: 1 }}
                onClick={() => handleRating(1)}
              >
                Again [1]
              </Button>
              <Button
                style={{ flex: 1, borderColor: '#faad14', color: '#d48806' }}
                onClick={() => handleRating(2)}
              >
                Hard [2]
              </Button>
              <Button
                type="primary"
                style={{ flex: 1, backgroundColor: '#1677ff' }}
                onClick={() => handleRating(3)}
              >
                Good [3]
              </Button>
              <Button
                style={{ flex: 1, backgroundColor: '#52c41a', color: '#fff' }}
                onClick={() => handleRating(4)}
              >
                Easy [4]
              </Button>
            </Flex>
          )
        ) : (
          // Mode B: Single-Sided Grammar Action Bar
          <Flex gap={8} justify="space-between">
            <Button
              type="default"
              icon={<RedoOutlined />}
              onClick={() => handleRating(2)}
              style={{ flex: 1 }}
            >
              Review Soon
            </Button>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={handleOpenDrill}
              style={{ flex: 1 }}
            >
              Practice Drill
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleRating(3)}
              style={{ flex: 1.2, backgroundColor: '#7c3aed' }}
            >
              Got it (Enter)
            </Button>
          </Flex>
        )}
      </Footer>

      {/* Interactive Challenge Modal */}
      <Modal
        title={activeDrill?.title || 'Interactive Drill'}
        open={drillModalOpen}
        onCancel={() => setDrillModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {activeDrill && (
          <Flex vertical gap={14} style={{ padding: '8px 0' }}>
            <Text>{activeDrill.prompt}</Text>

            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {activeDrill.context}
            </div>

            {activeDrill.options && activeDrill.options.length > 0 && (
              <Radio.Group
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={drillSubmitted}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {activeDrill.options.map((opt, i) => (
                  <Radio key={i} value={opt}>
                    {opt}
                  </Radio>
                ))}
              </Radio.Group>
            )}

            {!drillSubmitted ? (
              <Button
                type="primary"
                disabled={!selectedAnswer}
                onClick={() => setDrillSubmitted(true)}
              >
                Submit Answer
              </Button>
            ) : (
              <div>
                <Alert
                  type={
                    selectedAnswer === activeDrill.correctAnswer
                      ? 'success'
                      : 'error'
                  }
                  message={
                    selectedAnswer === activeDrill.correctAnswer
                      ? 'Correct! Well done.'
                      : `Incorrect. The correct answer is: ${activeDrill.correctAnswer}`
                  }
                  description={activeDrill.explanation}
                  showIcon
                  style={{ marginBottom: 12 }}
                />
                <Button block onClick={() => setDrillModalOpen(false)}>
                  Continue Session
                </Button>
              </div>
            )}
          </Flex>
        )}
      </Modal>

      {/* Quick Add Word Modal */}
      <Modal
        title="Quick Add Word"
        open={quickAddOpen}
        onCancel={() => setQuickAddOpen(false)}
        onOk={handleQuickAddWord}
        confirmLoading={addingQuickWord}
        okText="Add to Deck"
        destroyOnClose
      >
        <Flex vertical gap={12} style={{ padding: '8px 0' }}>
          <Text type="secondary">
            Enter a German word or phrase. LingoPing will automatically enrich it with IPA, article gender, translation, and mnemonics.
          </Text>
          <Input
            placeholder="e.g. Flughafen, der Tisch, gemütlich..."
            value={quickWordText}
            onChange={(e) => setQuickWordText(e.target.value)}
            onPressEnter={handleQuickAddWord}
            autoFocus
          />
        </Flex>
      </Modal>
    </Layout>
  );
};

export const SessionApp: React.FC = () => {
  return (
    <ConfigProvider theme={antThemeConfig}>
      <AntApp>
        <SessionAppInner />
      </AntApp>
    </ConfigProvider>
  );
};
