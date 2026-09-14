import React, { useState, useEffect } from 'react';
import {
  ConfigProvider,
  App as AntApp,
  Card,
  Button,
  Typography,
  Space,
  Flex,
  Input,
  Statistic,
  Row,
  Col,
  Select,
  Divider,
  Tag,
  Avatar,
  Tooltip,
} from 'antd';
import {
  PlayCircleOutlined,
  SettingOutlined,
  PlusOutlined,
  BookOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined,
  GoogleOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { StorageManager } from '../storage/index.js';
import { antThemeConfig } from '../theme/index.js';
import { enrichVocabularyOffline, createCardFromEnrichment, Profile } from '@lingoping/core';
import { signInWithGoogle, signOutUser, getCurrentUser } from '../auth/index.js';
import { User } from '@supabase/supabase-js';

const { Title, Text } = Typography;

export const PopupAppInner: React.FC = () => {
  const { message } = AntApp.useApp();

  const [stats, setStats] = useState({
    totalCards: 0,
    dueCards: 0,
    knownWordsCount: 0,
    reviewsToday: 0,
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [newWord, setNewWord] = useState('');
  const [addingWord, setAddingWord] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentStats, currentProfile, currentUser] = await Promise.all([
        StorageManager.getStats(),
        StorageManager.getProfile(),
        getCurrentUser(),
      ]);
      setStats(currentStats);
      setProfile(currentProfile);
      setAuthUser(currentUser);
    } catch (err) {
      console.error('Failed to load popup data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartSession = async () => {
    if (typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.create({
        url: 'session.html',
        type: 'popup',
        width: 440,
        height: 640,
        focused: true,
        top: 120,
        left: 120,
      });
      window.close();
    } else {
      window.open('session.html', '_blank', 'width=440,height=640');
    }
  };

  const handleAddWord = async () => {
    const word = newWord.trim();
    if (!word) return;

    try {
      setAddingWord(true);
      const currentProf = profile || (await StorageManager.getProfile());
      const targetLang = currentProf.target_language || 'de';

      // Check centralized visual cache first
      const cachedVisual = await StorageManager.getCachedVisual(word, targetLang);

      const enriched = enrichVocabularyOffline(
        word,
        targetLang,
        currentProf.native_language || 'en'
      );

      if (cachedVisual) {
        enriched.visual_mnemonic = {
          image_prompt: cachedVisual.visualMeta.image_prompt || '',
          color_theme: cachedVisual.visualMeta.theme_color,
          color_hex: cachedVisual.visualMeta.hex,
        };
      }

      const card = createCardFromEnrichment(enriched, currentProf.id);
      if (cachedVisual) {
        card.image_url = cachedVisual.imageUrl;
        card.visual_meta = cachedVisual.visualMeta;
      }

      await StorageManager.addCard(card);
      message.success(`Added "${word}" as a new SRS card!`);
      setNewWord('');
      await loadData();

      // Refresh badge if extension background is listening
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'REFRESH_BADGE' });
      }
    } catch (err) {
      console.error('Failed to add word:', err);
      message.error('Failed to add word.');
    } finally {
      setAddingWord(false);
    }
  };

  const handleIntervalChange = async (minutes: number) => {
    if (!profile) return;
    const updated = await StorageManager.saveProfile({
      session_interval_minutes: minutes,
    });
    setProfile(updated);
    message.success(`Session interval set to ${minutes} minutes`);

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'UPDATE_ALARM' });
    }
  };

  const handleOpenOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  return (
    <div
      style={{
        width: 350,
        minHeight: 480,
        backgroundColor: '#ffffff',
        padding: '16px',
        boxSizing: 'border-box',
        fontFamily: antThemeConfig.token?.fontFamily,
      }}
    >
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Space size={8}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
            }}
          >
            L
          </div>
          <div>
            <Title level={5} style={{ margin: 0, lineHeight: 1.2 }}>
              LingoPing
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              FSRS Adaptive Spaced Learning
            </Text>
          </div>
        </Space>

        <Tag color="blue">
          {profile?.target_language?.toUpperCase() || 'DE'} ➔{' '}
          {profile?.native_language?.toUpperCase() || 'EN'}
        </Tag>
      </Flex>

      {/* User Account / Google Sign-In Status */}
      {authUser ? (
        <Flex
          justify="space-between"
          align="center"
          style={{
            backgroundColor: '#f0fdf4',
            padding: '6px 10px',
            borderRadius: 8,
            marginBottom: 12,
            border: '1px solid #bbf7d0',
          }}
        >
          <Space size={8}>
            <Avatar
              size="small"
              src={authUser.user_metadata?.avatar_url}
              icon={<UserOutlined />}
            />
            <Text ellipsis style={{ fontSize: 12, maxWidth: 180, color: '#166534', fontWeight: 500 }}>
              {authUser.user_metadata?.full_name || authUser.email}
            </Text>
          </Space>
          <Tooltip title="Sign Out">
            <Button
              type="text"
              size="small"
              icon={<LogoutOutlined style={{ color: '#166534' }} />}
              onClick={async () => {
                await signOutUser();
                setAuthUser(null);
                message.info('Signed out of Google.');
              }}
            />
          </Tooltip>
        </Flex>
      ) : (
        <Button
          size="small"
          icon={<GoogleOutlined style={{ color: '#ea4335' }} />}
          onClick={async () => {
            const res = await signInWithGoogle();
            if (res.success) {
              message.success('Signed in with Google!');
              const u = await getCurrentUser();
              setAuthUser(u);
            } else {
              message.error(res.error || 'Sign-in failed');
            }
          }}
          style={{
            marginBottom: 12,
            borderColor: '#e2e8f0',
            fontSize: 12,
            fontWeight: 500,
          }}
          block
        >
          Sign in with Google
        </Button>
      )}

      {/* Stats Cards */}
      <Card
        size="small"
        style={{
          marginBottom: 14,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
        }}
      >
        <Row gutter={8}>
          <Col span={8}>
            <Statistic
              title={<span style={{ fontSize: 11 }}>Due Now</span>}
              value={stats.dueCards}
              valueStyle={{
                color: stats.dueCards > 0 ? '#1677ff' : '#16a34a',
                fontSize: 20,
                fontWeight: 700,
              }}
              prefix={stats.dueCards > 0 ? <ThunderboltOutlined /> : <CheckCircleOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<span style={{ fontSize: 11 }}>Total Deck</span>}
              value={stats.totalCards}
              valueStyle={{ fontSize: 20, fontWeight: 700 }}
              prefix={<BookOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<span style={{ fontSize: 11 }}>Done Today</span>}
              value={stats.reviewsToday}
              valueStyle={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Start Session Button */}
      <Button
        type="primary"
        size="large"
        block
        icon={<PlayCircleOutlined />}
        onClick={handleStartSession}
        style={{
          height: 44,
          fontSize: 15,
          marginBottom: 14,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(22, 119, 255, 0.25)',
        }}
      >
        Start Micro-Session Now
      </Button>

      {/* Quick Add Word Form */}
      <div style={{ marginBottom: 14 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
          Quick Word Ingestion:
        </Text>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="Type word, e.g. Apfel..."
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onPressEnter={handleAddWord}
            disabled={addingWord}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={addingWord}
            onClick={handleAddWord}
          >
            Add
          </Button>
        </Space.Compact>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Session Interval Setting */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Space size={4}>
          <FieldTimeOutlined style={{ color: '#64748b' }} />
          <Text style={{ fontSize: 12, color: '#475569' }}>Popup Interval:</Text>
        </Space>
        <Select
          size="small"
          value={profile?.session_interval_minutes || 10}
          onChange={handleIntervalChange}
          style={{ width: 110 }}
          options={[
            { value: 5, label: '5 Minutes' },
            { value: 10, label: '10 Minutes' },
            { value: 15, label: '15 Minutes' },
            { value: 30, label: '30 Minutes' },
            { value: 60, label: '1 Hour' },
          ]}
        />
      </Flex>

      {/* Management Dashboard Link */}
      <Button
        block
        icon={<SettingOutlined />}
        onClick={handleOpenOptions}
        style={{ color: '#475569' }}
      >
        Open Management Dashboard
      </Button>
    </div>
  );
};

export const PopupApp: React.FC = () => {
  return (
    <ConfigProvider theme={antThemeConfig}>
      <AntApp>
        <PopupAppInner />
      </AntApp>
    </ConfigProvider>
  );
};
