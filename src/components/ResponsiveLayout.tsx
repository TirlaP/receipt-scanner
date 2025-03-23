import React, { useState, useEffect } from 'react';
import { Layout, Drawer, ConfigProvider, theme } from 'antd';
import { useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

const { Content } = Layout;

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const location = useLocation();
  
  // Check if dark mode is enabled
  const isDarkMode = localStorage.getItem('darkMode') === 'true';

  // Check if mobile view based on screen width
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Close drawer when location changes
  useEffect(() => {
    setDrawerVisible(false);
  }, [location]);

  // Toggle drawer for mobile view
  const toggleDrawer = () => {
    setDrawerVisible(!drawerVisible);
  };

  // Check if it's the receipt scanning page
  const isScanningPage = location.pathname === '/scan';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: '#1890ff',
        },
        components: {
          Table: {
            borderRadius: 8,
            colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
          },
          Card: {
            borderRadius: 8,
            colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
          },
          Button: {
            borderRadius: 6,
          },
          Drawer: {
            colorBgElevated: isDarkMode ? '#141414' : '#ffffff',
          }
        }
      }}
    >
      <Layout className="min-h-screen">
        {/* Desktop sidebar */}
        {!mobileView && (
          <AppSidebar 
            collapsed={collapsed} 
            onCollapse={setCollapsed} 
          />
        )}
        
        {/* Mobile drawer sidebar */}
        {mobileView && (
          <Drawer
            placement="left"
            closable={false}
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            contentWrapperStyle={{ width: '280px' }}
            bodyStyle={{ padding: 0 }}
            styles={{
              body: {
                padding: 0,
              },
              mask: {
                backdropFilter: 'blur(4px)'
              }
            }}
          >
            <AppSidebar 
              mobileView={true} 
              onClose={() => setDrawerVisible(false)} 
            />
          </Drawer>
        )}
        
        <Layout>
          <AppHeader 
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            showMobileMenu={mobileView}
            onMobileMenuToggle={toggleDrawer}
          />
          <Content 
            className={`
              ${mobileView ? 'px-4 py-3' : 'px-6 py-5'} 
              min-h-[calc(100vh-64px)]
              ${isScanningPage && mobileView ? 'pb-24' : ''}
            `}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default ResponsiveLayout;