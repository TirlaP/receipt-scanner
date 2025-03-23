import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Button, Avatar, Switch, Tooltip, Badge } from 'antd';
import { 
  DashboardOutlined, 
  ScanOutlined, 
  ExportOutlined, 
  FileTextOutlined, 
  SettingOutlined,
  CameraOutlined,
  BulbOutlined,
  BulbFilled,
  CloudOutlined,
  CloudSyncOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Sider } = Layout;
const { Title, Text } = Typography;

interface AppSidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  mobileView?: boolean;
  onClose?: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ 
  collapsed, 
  onCollapse,
  mobileView = false,
  onClose
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, signOut } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(collapsed || false);
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true'
  );

  // Handle external collapsed state changes
  useEffect(() => {
    if (collapsed !== undefined) {
      setIsSidebarCollapsed(collapsed);
    }
  }, [collapsed]);

  // Handle collapse toggle
  const handleCollapse = (value: boolean) => {
    setIsSidebarCollapsed(value);
    if (onCollapse) {
      onCollapse(value);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    
    // Apply dark mode to the document
    if (newDarkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  // Apply dark mode on mount if needed
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  // Determine which menu item should be selected
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return ['dashboard'];
    if (path === '/scan') return ['scan'];
    if (path === '/multiscan') return ['multiscan'];
    if (path === '/receipts') return ['receipts'];
    if (path.startsWith('/receipt/')) return ['receipts'];
    if (path === '/export') return ['export'];
    if (path === '/settings') return ['settings'];
    return ['dashboard'];
  };

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
    if (mobileView && onClose) {
      onClose();
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      if (mobileView && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => handleNavigation('/')
    },
    {
      key: 'receipts',
      icon: <FileTextOutlined />,
      label: 'Receipts',
      onClick: () => handleNavigation('/receipts')
    },
    {
      key: 'scan',
      icon: <ScanOutlined />,
      label: 'Scan Receipt',
      onClick: () => handleNavigation('/scan')
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Export Data',
      onClick: () => handleNavigation('/export')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => handleNavigation('/settings')
    }
  ];

  // The sidebar component with conditional styling based on mobile view
  return (
    <Sider
      collapsible={!mobileView}
      collapsed={isSidebarCollapsed}
      onCollapse={handleCollapse}
      theme="light"
      className={`app-sidebar ${mobileView ? 'mobile-sidebar' : ''}`}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: mobileView ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: mobileView ? 1001 : 1000,
      }}
      width={240}
    >
      <div 
        className="app-logo flex justify-center items-center h-16 px-4 border-b border-gray-200 cursor-pointer"
        onClick={() => handleNavigation('/')}
      >
        {isSidebarCollapsed ? (
          <Avatar 
            shape="square" 
            size={40} 
            className="bg-blue-500 flex items-center justify-center"
          >
            RS
          </Avatar>
        ) : (
          <div className="flex items-center">
            <Avatar 
              shape="square" 
              size={40} 
              className="bg-blue-500 flex items-center justify-center mr-3"
            >
              RS
            </Avatar>
            <Title level={4} className="m-0 text-blue-500 hidden sm:block">
              Receipt Scanner
            </Title>
          </div>
        )}
      </div>
      
      {/* User info section */}
      {!isSidebarCollapsed && currentUser && (
        <div 
          className="user-info"
          style={{
            padding: '16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Avatar 
            size={mobileView ? 64 : 48}
            icon={<UserOutlined />}
            style={{ backgroundColor: '#1890ff', marginBottom: 8 }}
          />
          <Text strong style={{ marginBottom: 4 }}>
            {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {currentUser.email}
          </Text>
          
          {mobileView && (
            <div style={{ marginTop: 16, width: '100%' }}>
              <Button 
                type="primary" 
                danger 
                icon={<LogoutOutlined />} 
                onClick={handleSignOut}
                block
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      )}
      
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={getSelectedKey()}
        items={menuItems}
        style={{ borderRight: 0 }}
      />
      
      <div 
        className="sidebar-footer"
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          padding: isSidebarCollapsed ? '16px 0' : '16px',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {/* Cloud sync status */}
        {currentUser && (
          <Tooltip title={`${isSidebarCollapsed ? 'Cloud sync ' : ''}enabled`}>
            <Badge status="success" dot={true}>
              <CloudSyncOutlined 
                style={{ 
                  fontSize: 16, 
                  color: '#52c41a' 
                }} 
              />
              {!isSidebarCollapsed && (
                <Text style={{ marginLeft: 8 }}>Cloud Sync</Text>
              )}
            </Badge>
          </Tooltip>
        )}
        
        {/* Dark mode toggle */}
        <Tooltip title={`${isSidebarCollapsed ? 'Toggle ' : ''}Dark Mode`}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={toggleDarkMode}
          >
            {isDarkMode ? (
              <BulbFilled style={{ fontSize: 16, color: '#faad14' }} />
            ) : (
              <BulbOutlined style={{ fontSize: 16 }} />
            )}
            {!isSidebarCollapsed && (
              <Switch 
                checked={isDarkMode}
                size="small"
                style={{ marginLeft: 8 }}
              />
            )}
          </div>
        </Tooltip>
      </div>
    </Sider>
  );
};

export default AppSidebar;