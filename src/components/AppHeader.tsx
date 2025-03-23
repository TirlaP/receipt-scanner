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
      className="bg-white shadow-sm sticky top-0 z-40 px-4 flex justify-between items-center h-16"
    >
      <div className="flex items-center">
        {/* Only show menu toggle on mobile */}
        {showMobileMenu && (
          <Button
            type="text"
            onClick={onMobileMenuToggle}
            className="mr-4 md:hidden flex items-center justify-center"
          >
            <MenuOutlined className="flex items-center justify-center" />
          </Button>
        )}
        
        {/* Hide hamburger on desktop */}
        {!showMobileMenu && onToggle && (
          <Button
            type="text"
            onClick={onToggle}
            className="mr-4 hidden md:block flex items-center justify-center"
          >
            <MenuOutlined className="flex items-center justify-center" />
          </Button>
        )}
        
        <Title level={4} className="m-0 text-base md:text-lg">
          {getPageTitle()}
        </Title>
      </div>
      
      <div className="header-actions">
        <Space size={showMobileMenu ? "small" : "middle"}>
          {/* Always show scan button except on scan page */}
          {location.pathname !== '/scan' && (
            <Tooltip title="Scan New Receipt">
              <Button 
                type="primary" 
                onClick={() => navigate('/scan')}
                className="flex items-center justify-center"
                size={showMobileMenu ? "middle" : "middle"}
              >
                <ScanOutlined className="flex items-center justify-center" />
                <span className="hidden sm:inline ml-1">Scan</span>
              </Button>
            </Tooltip>
          )}
          
          {/* Hide help button on mobile (it's in sidebar) */}
          {!showMobileMenu && (
            <Tooltip title="Help">
              <Button
                type="text"
                onClick={() => setHelpDrawerVisible(true)}
                className="hidden md:flex items-center justify-center"
              >
                <QuestionCircleOutlined className="flex items-center justify-center" />
              </Button>
            </Tooltip>
          )}
          
          {/* User dropdown and login button */}
          {currentUser ? (
            <div className="hidden md:block">
              <Dropdown 
                menu={{ items: userMenuItems }} 
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" className="flex items-center justify-center">
                  <Avatar 
                    size="small" 
                    icon={<UserOutlined className="flex items-center justify-center" />} 
                    className="bg-blue-500 flex items-center justify-center"
                  />
                  <span className="hidden sm:inline ml-1">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                  </span>
                </Button>
              </Dropdown>
            </div>
          ) : (
            <Button 
              type="link" 
              onClick={() => navigate('/login')}
              className="flex items-center justify-center"
            >
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