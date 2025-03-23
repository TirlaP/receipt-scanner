import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Steps
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const handleRegister = async (values: { name: string; email: string; password: string }) => {
    setError(null);
    setLoading(true);
    
    try {
      await registerUser(values.email, values.password, values.name);
      setCurrentStep(1);
      message.success('Registration successful');
      
      // Automatically redirect after registration
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check your email and try again.');
      } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
        setError('Email/Password authentication is not enabled. Please contact the administrator.');
      } else {
        setError('An error occurred during registration. Please try again later.');
      }
      
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Registration',
      content: (
        <>
          {error && (
            <Alert 
              message="Registration Error" 
              description={error}
              type="error" 
              showIcon 
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Add a note about Firebase configuration */}
          <Alert
            message="Important Note"
            description="Make sure Email/Password authentication is enabled in Firebase Console before registering."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 24 }}
            closable
          />

          <Form
            form={form}
            name="register-form"
            onFinish={handleRegister}
            layout="vertical"
          >
            <Form.Item
              name="name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input 
                prefix={<UserOutlined className="site-form-item-icon" />} 
                placeholder="Full Name" 
                size="large"
              />
            </Form.Item>

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
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon" />}
                placeholder="Password (minimum 6 characters)"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon" />}
                placeholder="Confirm Password"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                block
                size="large"
              >
                Create Account
              </Button>
            </Form.Item>
          </Form>
        </>
      ),
    },
    {
      title: 'Success',
      content: (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Title level={3} style={{ marginTop: 24 }}>Registration Successful!</Title>
          <Paragraph>
            Your account has been created successfully. You will be redirected to the dashboard shortly.
          </Paragraph>
        </div>
      ),
    },
  ];

  return (
    <div className="register-container" style={{ 
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
          maxWidth: 500,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            Create Account
          </Title>
          <Paragraph type="secondary">
            Register to start tracking your receipts
          </Paragraph>
        </div>
        
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        <div className="steps-content">{steps[currentStep].content}</div>

        {currentStep === 0 && (
          <>
            <Divider plain>Or</Divider>

            <div style={{ textAlign: 'center' }}>
              <Space direction="vertical" size="middle">
                <Text>Already have an account?</Text>
                <Button type="default" block onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              </Space>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Register;