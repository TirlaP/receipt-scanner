import React, { useState } from 'react';
import { Layout, Button, Space, Typography, Avatar, Dropdown, Menu, Badge, Drawer, Tooltip, Divider } from 'antd';
import { 
  MenuOutlined, 
  UserOutlined, 
  BellOutlined, 
  SyncOutlined,
  LogoutOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  ScanOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header } = Layout;
const { Title, Text } = Typography;

interface AppHeaderProps {
  collapsed?: boolean;
  onToggle?: () => void;
  showMobileMenu?: boolean;
  onMobileMenuToggle?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  collapsed, 
  onToggle, 
  showMobileMenu, 
  onMobileMenuToggle 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, signOut } = useAuth();
  const [helpDrawerVisible, setHelpDrawerVisible] = useState(false);

  // Determine current page title
  const getPageTitle = () => {
    const path = location.pathname;
    
    switch (true) {
      case path === '/':
        return 'Dashboard';
      case path === '/receipts':
        return 'Receipts';
      case path === '/scan':
        return 'Scan Receipt';
      case path === '/multiscan':
        return 'Multi-Photo Scanner';
      case path.startsWith('/receipt/'):
        return 'Receipt Details';
      case path === '/export':
        return 'Export Data';
      case path === '/settings':
        return 'Settings';
      case path === '/login':
        return 'Login';
      case path === '/register':
        return 'Register';
      default:
        return 'Receipt Scanner';
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // User dropdown menu items
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Your Profile',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleSignOut,
    },
  ];

  return (
    <Header 
      style={{ 
        background: '#fff', 
        padding: '0 16px', 
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 64
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onMobileMenuToggle || onToggle}
          style={{ marginRight: 16 }}
          className="menu-toggle-button"
        />
        <Title level={4} style={{ margin: 0 }}>
          {getPageTitle()}
        </Title>
      </div>
      
      <div className="header-actions">
        <Space size="middle">
          {location.pathname !== '/scan' && (
            <Tooltip title="Scan New Receipt">
              <Button 
                type="primary" 
                icon={<ScanOutlined />} 
                onClick={() => navigate('/scan')}
                className="scan-button"
              >
                <span className="scan-button-text">Scan</span>
              </Button>
            </Tooltip>
          )}
          
          <Tooltip title="Help">
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setHelpDrawerVisible(true)}
              className="help-button"
            />
          </Tooltip>
          
          {currentUser ? (
            <Dropdown 
              menu={{ items: userMenuItems }} 
              trigger={['click']}
              placement="bottomRight"
            >
              <Button type="text" className="user-dropdown-button">
                <Space>
                  <Avatar 
                    size="small" 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <span className="user-name">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                  </span>
                </Space>
              </Button>
            </Dropdown>
          ) : (
            <Button type="link" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          )}
        </Space>
      </div>
      
      {/* Help Drawer */}
      <Drawer
        title="Help & Information"
        placement="right"
        onClose={() => setHelpDrawerVisible(false)}
        open={helpDrawerVisible}
        width={320}
      >
        <div className="help-content">
          <div className="help-section">
            <Title level={5}>How to Use Receipt Scanner</Title>
            <Text>Receipt Scanner helps you track your expenses by digitizing your paper receipts.</Text>
            
            <div className="help-items" style={{ marginTop: 16 }}>
              <div className="help-item">
                <Title level={5}>1. Scan Receipts</Title>
                <Text>Use the Scan button to capture a receipt with your camera or upload an image.</Text>
              </div>
              
              <div className="help-item">
                <Title level={5}>2. Manage Your Data</Title>
                <Text>View, edit, and categorize your receipts from the Receipts list.</Text>
              </div>
              
              <div className="help-item">
                <Title level={5}>3. Analyze Spending</Title>
                <Text>Use the Dashboard to visualize your spending patterns over time.</Text>
              </div>
              
              <div className="help-item">
                <Title level={5}>4. Export Data</Title>
                <Text>Export your receipt data to Excel or CSV for further analysis.</Text>
              </div>
            </div>
          </div>
          
          <Divider />
          
          <div className="help-section">
            <Title level={5}>Tips for Best Results</Title>
            <ul>
              <li>Take receipt photos in good lighting</li>
              <li>Keep the receipt flat and unwrinkled</li>
              <li>Include the entire receipt in the frame</li>
              <li>Add categories to items for better analysis</li>
            </ul>
          </div>
          
          <Divider />
          
          <div className="help-section">
            <Title level={5}>About Receipt Scanner</Title>
            <Text>Version 1.0.0</Text>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" block onClick={() => setHelpDrawerVisible(false)}>
                Close Help
              </Button>
            </div>
          </div>
        </div>
      </Drawer>
    </Header>
  );
};

export default AppHeader;