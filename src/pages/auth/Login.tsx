import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Typography, 
  Divider, 
  Alert, 
  message,
  Space,
  Checkbox
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  LoginOutlined,
  MailOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (values: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    
    try {
      await signIn(values.email, values.password);
      message.success('Login successful');
      
      // Store email in local storage if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', values.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
        setError('Email/Password authentication is not enabled. Please contact the administrator.');
      } else {
        setError('An error occurred during login. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    if (!email) {
      message.error('Please enter your email address');
      return;
    }
    
    try {
      await resetPassword(email);
      message.success('Password reset email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      if (error.code === 'auth/user-not-found') {
        message.error('No user found with this email address');
      } else if (error.code === 'auth/invalid-email') {
        message.error('Invalid email address');
      } else {
        message.error('Failed to send password reset email');
      }
    }
  };

  // Get remembered email from local storage
  const rememberedEmail = localStorage.getItem('rememberedEmail') || '';

  return (
    <div className="login-container" style={{ 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(to right, #f0f2f5, #e6f7ff)'
    }}>
      <Card 
        variant="borderless" 
        style={{ 
          width: '100%', 
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            Receipt Scanner
          </Title>
          <Paragraph type="secondary">
            Sign in to access your receipts
          </Paragraph>
        </div>

        {error && (
          <Alert 
            message="Login Error" 
            description={error}
            type="error" 
            showIcon 
            style={{ marginBottom: 24 }}
          />
        )}

        {/* Add a note about Firebase configuration */}
        <Alert
          message="Important Note"
          description="Make sure Email/Password authentication is enabled in Firebase Console."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 24 }}
          closable
        />

        <Form
          name="login-form"
          initialValues={{ email: rememberedEmail }}
          onFinish={handleLogin}
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input 
              prefix={<MailOutlined className="site-form-item-icon" />} 
              placeholder="Email" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Checkbox 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
              >
                Remember me
              </Checkbox>
              <Button 
                type="link" 
                onClick={() => {
                  const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
                  handleForgotPassword(email);
                }}
              >
                Forgot password?
              </Button>
            </div>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<LoginOutlined />}
              loading={loading}
              block
              size="large"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>Or</Divider>

        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size="middle">
            <Text>Don't have an account?</Text>
            <Button type="default" block onClick={() => navigate('/register')}>
              Create an Account
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login;