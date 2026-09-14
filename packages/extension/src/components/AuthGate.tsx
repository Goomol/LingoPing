import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Button,
  Input,
  Form,
  Tabs,
  Space,
  Flex,
  Alert,
  Avatar,
  Tag,
  Tooltip,
  Divider,
  Spin,
  Modal,
  App as AntApp,
} from 'antd';
import {
  GoogleOutlined,
  MailOutlined,
  LockOutlined,
  UserOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  CloudSyncOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { User } from '@supabase/supabase-js';
import {
  getCurrentUser,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  signOutUser,
  onAuthStateChange,
} from '../auth/index.js';
import { antThemeConfig } from '../theme/index.js';

const { Title, Text, Paragraph } = Typography;

interface AuthGateProps {
  children: React.ReactNode;
  /** Whether to render the persistent user profile badge at the top when authenticated */
  showUserBar?: boolean;
  /** Custom title for the current view (e.g., "Review Session", "Control Panel") */
  viewTitle?: string;
  /** Optional container style override */
  containerStyle?: React.CSSProperties;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  showUserBar = true,
  viewTitle,
  containerStyle,
}) => {
  const { message } = AntApp.useApp();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [googleHelpModalOpen, setGoogleHelpModalOpen] = useState(false);

  const [signInForm] = Form.useForm();
  const [signUpForm] = Form.useForm();

  // Initial user check and auth listener setup
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('[LingoPing AuthGate] Error checking auth:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    const { data: authListener } = onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user || null);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setAuthError(null);
      const res = await signInWithGoogle();
      if (res.success && res.user) {
        setUser(res.user);
        message.success(`Welcome to LingoPing, ${res.user.user_metadata?.full_name || res.user.email}!`);
      } else if (res.error) {
        if (res.error.includes('not enabled') || res.error.includes('Supabase Dashboard')) {
          setGoogleHelpModalOpen(true);
        } else {
          setAuthError(res.error);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (values: any) => {
    try {
      setEmailLoading(true);
      setAuthError(null);
      const res = await signInWithPassword(values.email, values.password);
      if (res.success && res.user) {
        setUser(res.user);
        message.success('Signed in successfully!');
        signInForm.resetFields();
      } else {
        setAuthError(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleEmailSignUp = async (values: any) => {
    try {
      setEmailLoading(true);
      setAuthError(null);
      const res = await signUpWithPassword(values.email, values.password, values.fullName);
      if (res.success) {
        if (res.user && !res.confirmationRequired) {
          setUser(res.user);
          message.success('Account created! Welcome to LingoPing.');
          signUpForm.resetFields();
        } else {
          message.info('Account registered! Please check your email to confirm your account.');
          setActiveTab('signin');
        }
      } else {
        setAuthError(res.error || 'Could not create account.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign up.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      message.info('Signed out of LingoPing.');
    } catch (err: any) {
      message.error(err.message || 'Error signing out');
    }
  };

  // Loading state
  if (loading) {
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          minHeight: 380,
          padding: 24,
          flexDirection: 'column',
          gap: 16,
          ...containerStyle,
        }}
      >
        <Spin size="large" />
        <Text type="secondary" style={{ fontSize: 13 }}>
          Verifying LingoPing authentication...
        </Text>
      </Flex>
    );
  }

  // Authenticated: Render children with optional top profile bar
  if (user) {
    return (
      <div style={containerStyle}>
        {showUserBar && (
          <Flex
            justify="space-between"
            align="center"
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: 10,
              borderRadius: 6,
            }}
          >
            <Space size={8} align="center">
              <Avatar
                size="small"
                src={user.user_metadata?.avatar_url}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1677ff' }}
              />
              <Flex vertical style={{ lineHeight: 1.2 }}>
                <Text
                  ellipsis
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    maxWidth: 160,
                    color: '#0f172a',
                  }}
                >
                  {user.user_metadata?.full_name || user.email}
                </Text>
                {viewTitle && (
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {viewTitle}
                  </Text>
                )}
              </Flex>
            </Space>

            <Space size={6}>
              <Tooltip title="Cloud Synchronized">
                <Tag color="success" icon={<CloudSyncOutlined />} style={{ margin: 0 }}>
                  Cloud Active
                </Tag>
              </Tooltip>
              <Tooltip title="Sign Out">
                <Button
                  type="text"
                  size="small"
                  icon={<LogoutOutlined style={{ color: '#64748b' }} />}
                  onClick={handleSignOut}
                />
              </Tooltip>
            </Space>
          </Flex>
        )}
        {children}
      </div>
    );
  }

  // Unauthenticated: Render Onboarding & Authentication Gate
  return (
    <div
      style={{
        padding: '20px 16px',
        boxSizing: 'border-box',
        maxWidth: 420,
        margin: '0 auto',
        fontFamily: antThemeConfig.token?.fontFamily,
        ...containerStyle,
      }}
    >
      {/* Branded Logo & Header */}
      <Flex vertical align="center" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1677ff 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: 22,
            boxShadow: '0 8px 16px -4px rgba(22, 119, 255, 0.4)',
            marginBottom: 10,
          }}
        >
          L
        </div>

        <Title level={4} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
          LingoPing
        </Title>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
          Intelligent Spaced Repetition & Chromatic Mnemonics
        </Text>

        <Flex wrap="wrap" justify="center" gap={4} style={{ marginTop: 10 }}>
          <Tag color="blue" icon={<ThunderboltOutlined />}>
            FSRS v4.5 Adaptive
          </Tag>
          <Tag color="purple" icon={<SafetyCertificateOutlined />}>
            Cloud Multi-Device
          </Tag>
          <Tag color="cyan" icon={<CheckCircleOutlined />}>
            Auto Sync
          </Tag>
        </Flex>
      </Flex>

      {/* Main Authentication Card */}
      <Card
        bordered={true}
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
        bodyStyle={{ padding: '16px 14px' }}
      >
        <Paragraph style={{ fontSize: 13, textAlign: 'center', color: '#334155', marginBottom: 14 }}>
          Sign in or create an account to access your personalized vocabulary deck and synchronized reviews.
        </Paragraph>

        {authError && (
          <Alert
            message={authError}
            type="error"
            showIcon
            closable
            onClose={() => setAuthError(null)}
            style={{ marginBottom: 14, fontSize: 12 }}
          />
        )}

        {/* Primary Action: Continue with Google */}
        <Button
          type="primary"
          block
          size="large"
          icon={<GoogleOutlined style={{ fontSize: 16 }} />}
          loading={googleLoading}
          onClick={handleGoogleSignIn}
          style={{
            height: 44,
            fontWeight: 600,
            backgroundColor: '#2563eb',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          }}
        >
          Continue with Google
        </Button>

        <Divider plain style={{ margin: '16px 0', fontSize: 11, color: '#94a3b8' }}>
          or with email
        </Divider>

        {/* Email Tabs: Sign In & Sign Up */}
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as 'signin' | 'signup');
            setAuthError(null);
          }}
          centered
          size="small"
          items={[
            {
              key: 'signin',
              label: 'Sign In',
              children: (
                <Form
                  form={signInForm}
                  layout="vertical"
                  onFinish={handleEmailSignIn}
                  style={{ marginTop: 8 }}
                >
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please enter your email' },
                      { type: 'email', message: 'Please enter a valid email' },
                    ]}
                    style={{ marginBottom: 10 }}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="name@example.com"
                      size="middle"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please enter your password' }]}
                    style={{ marginBottom: 14 }}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Password"
                      size="middle"
                    />
                  </Form.Item>

                  <Button
                    type="default"
                    htmlType="submit"
                    block
                    loading={emailLoading}
                    style={{
                      height: 38,
                      fontWeight: 600,
                      borderRadius: 8,
                      borderColor: '#1677ff',
                      color: '#1677ff',
                    }}
                  >
                    Sign In
                  </Button>
                </Form>
              ),
            },
            {
              key: 'signup',
              label: 'Create Account',
              children: (
                <Form
                  form={signUpForm}
                  layout="vertical"
                  onFinish={handleEmailSignUp}
                  style={{ marginTop: 8 }}
                >
                  <Form.Item name="fullName" style={{ marginBottom: 10 }}>
                    <Input
                      prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Your Name (Optional)"
                      size="middle"
                    />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please enter your email' },
                      { type: 'email', message: 'Please enter a valid email' },
                    ]}
                    style={{ marginBottom: 10 }}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="name@example.com"
                      size="middle"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: 'Please choose a password' },
                      { min: 6, message: 'Password must be at least 6 characters' },
                    ]}
                    style={{ marginBottom: 14 }}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Password (min 6 characters)"
                      size="middle"
                    />
                  </Form.Item>

                  <Button
                    type="default"
                    htmlType="submit"
                    block
                    loading={emailLoading}
                    style={{
                      height: 38,
                      fontWeight: 600,
                      borderRadius: 8,
                      borderColor: '#1677ff',
                      color: '#1677ff',
                    }}
                  >
                    Create Free Account
                  </Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>

      {/* Google Provider Activation Guidance Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
            <span>Enable Google Sign-In in Supabase</span>
          </Space>
        }
        open={googleHelpModalOpen}
        onOk={() => setGoogleHelpModalOpen(false)}
        onCancel={() => setGoogleHelpModalOpen(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setGoogleHelpModalOpen(false)}>
            Got it, I'll use Email for now
          </Button>,
        ]}
      >
        <Paragraph style={{ fontSize: 13, lineHeight: 1.6 }}>
          Google OAuth is not enabled yet in your Supabase project. To turn it on:
        </Paragraph>
        <ol style={{ fontSize: 12, lineHeight: 1.8, color: '#334155' }}>
          <li>
            Go to your <strong>Supabase Dashboard</strong> ➔ <strong>Authentication</strong> ➔{' '}
            <strong>Providers</strong>.
          </li>
          <li>
            Click <strong>Google</strong> and toggle <strong>Enable Google provider</strong> to ON.
          </li>
          <li>
            Paste your <strong>Google Client ID</strong> and <strong>Google Client Secret</strong>.
          </li>
          <li>Click <strong>Save</strong>.</li>
        </ol>
        <Paragraph style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
          💡 In the meantime, you can create an account and sign in immediately with your email and password above!
        </Paragraph>
      </Modal>
    </div>
  );
};
