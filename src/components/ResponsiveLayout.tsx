import React, { useState, useEffect } from 'react';
import { Layout, Drawer } from 'antd';
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
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
          contentWrapperStyle={{ width: '240px' }}
          bodyStyle={{ padding: 0 }}
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
          style={{ 
            margin: mobileView ? '16px 8px' : '24px 16px', 
            padding: mobileView ? 16 : 24,
            minHeight: 280 
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default ResponsiveLayout;