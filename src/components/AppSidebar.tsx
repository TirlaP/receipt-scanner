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
  LogoutOutlined,
  CloseOutlined
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

  // The sidebar component with Tailwind styling
  return (
    <Sider
      collapsible={!mobileView}
      collapsed={isSidebarCollapsed}
      onCollapse={handleCollapse}
      theme="light"
      className={`app-sidebar overflow-y-auto h-screen ${mobileView ? 'w-full' : 'sticky'} top-0 left-0 shadow-md z-40 transition-all duration-200 ${mobileView ? 'z-50' : 'z-30'}`}
      width={mobileView ? "100%" : 240}
      trigger={null} // Remove the default trigger
    >
      <div className="app-logo flex justify-between items-center h-16 px-4 border-b border-gray-200">
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => handleNavigation('/')}
        >
          {isSidebarCollapsed && !mobileView ? (
            <Avatar 
              shape="square" 
              size={40} 
              className="bg-blue-500 flex items-center justify-center"
            >
              RS
            </Avatar>
          ) : (
            <div className={`flex items-center ${mobileView ? 'justify-center' : ''}`}>
              <Avatar 
                shape="square" 
                size={mobileView ? 48 : 40} 
                className="bg-blue-500 flex items-center justify-center mr-3"
              >
                RS
              </Avatar>
              <Title level={4} className={`m-0 text-blue-500 ${mobileView ? 'block' : 'hidden sm:block'}`}>
                Receipt Scanner
              </Title>
            </div>
          )}
        </div>
        
        {/* Close button - only shown on mobile */}
        {mobileView && onClose && (
          <Button 
            type="text" 
            className="flex items-center justify-center" 
            onClick={onClose}
            size="large"
          >
            <CloseOutlined className="text-lg" />
          </Button>
        )}
      </div>
      
      {/* User info section - visible on mobile or non-collapsed sidebar */}
      {!isSidebarCollapsed && currentUser && (
        <div className={`p-4 border-b border-gray-200 flex flex-col items-center ${mobileView ? 'w-full' : 'md:hidden'}`}>
          <Avatar 
            size={mobileView ? 72 : 64}
            icon={<UserOutlined className="flex items-center justify-center" />}
            className="bg-blue-500 mb-3"
          />
          <Text strong className="mb-1 text-lg">
            {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
          </Text>
          <Text type="secondary" className="text-sm">
            {currentUser.email}
          </Text>
          
          <div className="mt-6 w-full max-w-xs">
            <Button 
              type="primary" 
              danger 
              onClick={handleSignOut}
              size={mobileView ? "large" : "middle"}
              block
              className="flex items-center justify-center"
            >
              <LogoutOutlined className="mr-1" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
      
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={getSelectedKey()}
        items={menuItems}
        className={`border-0 ${mobileView ? 'text-base' : ''}`}
        style={mobileView ? { fontSize: '16px' } : { borderRight: 0 }}
      />
      
      <div 
        className={`sidebar-footer sticky bottom-0 w-full ${isSidebarCollapsed ? 'py-4' : 'p-4'} border-t border-gray-200 flex ${mobileView ? 'flex-row justify-around' : 'flex-col items-center'} gap-2 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} mt-auto`}
      >
        {/* Cloud sync status */}
        {currentUser && (
          <Tooltip title={`${isSidebarCollapsed ? 'Cloud sync ' : ''}enabled`}>
            <Badge status="success" dot={true}>
              <CloudSyncOutlined className="text-base text-green-500" />
              {!isSidebarCollapsed && (
                <Text className="ml-2">Cloud Sync</Text>
              )}
            </Badge>
          </Tooltip>
        )}
        
        {/* Dark mode toggle */}
        <Tooltip title={`${isSidebarCollapsed ? 'Toggle ' : ''}Dark Mode`}>
          <div 
            className="flex items-center cursor-pointer"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? (
              <BulbFilled className="text-base text-yellow-500" />
            ) : (
              <BulbOutlined className="text-base" />
            )}
            {!isSidebarCollapsed && (
              <Switch 
                checked={isDarkMode}
                size="small"
                className="ml-2"
              />
            )}
          </div>
        </Tooltip>
      </div>
    </Sider>
  );
};

export default AppSidebar;