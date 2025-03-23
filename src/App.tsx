import React, { useState, useEffect } from 'react';
import { Spin, message, ConfigProvider, theme } from 'antd';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Services
import { dbService } from './services/db-service';
import { firebaseService } from './services/firebase/firebase-service';

// Types
import { Receipt } from './types';

// Components
import ResponsiveLayout from './components/ResponsiveLayout';

// Pages
import EnhancedDashboard from './pages/EnhancedDashboard';
import ExportPage from './pages/ExportPage';
import EnhancedReceiptsList from './pages/EnhancedReceiptsList';
import EnhancedReceiptDetail from './pages/EnhancedReceiptDetail';
import CombinedReceiptScanner from './pages/CombinedReceiptScanner';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Styles
import './styles/global.css';

// Protected route component
const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Checking authentication...</div>
        </div>
      </div>
    );
  }
  
  return currentUser ? element : <Navigate to="/login" replace />;
};

// App wrapper with auth provider
const AppWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

// Main app content
const AppContent: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [messageApi, contextHolder] = message.useMessage();
  const { currentUser } = useAuth();
  
  // Check if dark mode is enabled
  const isDarkMode = localStorage.getItem('darkMode') === 'true';

  // Load receipts on component mount
  // Handle pending deletions
  useEffect(() => {
    const processPendingDeletions = async () => {
      if (!currentUser) return;
      
      try {
        const pendingDeletions = JSON.parse(localStorage.getItem('pendingDeletions') || '[]');
        if (pendingDeletions.length === 0) return;
        
        console.log(`Processing ${pendingDeletions.length} pending receipt deletions`);
        
        const successfulDeletions = [];
        
        for (const id of pendingDeletions) {
          try {
            await firebaseService.deleteReceipt(id);
            successfulDeletions.push(id);
          } catch (error) {
            console.error(`Failed to process pending deletion for receipt ${id}:`, error);
          }
        }
        
        // Remove successfully deleted receipts from the pending list
        if (successfulDeletions.length > 0) {
          const remainingDeletions = pendingDeletions.filter(id => !successfulDeletions.includes(id));
          localStorage.setItem('pendingDeletions', JSON.stringify(remainingDeletions));
          
          if (successfulDeletions.length === pendingDeletions.length) {
            console.log('All pending deletions processed successfully');
          } else {
            console.log(`Processed ${successfulDeletions.length} of ${pendingDeletions.length} pending deletions`);
          }
        }
      } catch (error) {
        console.error('Error processing pending deletions:', error);
      }
    };
    
    // Process pending deletions when user logs in or app loads with user already logged in
    if (currentUser) {
      processPendingDeletions();
    }
  }, [currentUser]);

  useEffect(() => {
    const loadReceipts = async () => {
      try {
        setLoading(true);
        
        let loadedReceipts: Receipt[] = [];
        
        // Always load from local storage first to ensure we have data
        loadedReceipts = await dbService.getAllReceipts();
        
        // If user is logged in, try to load from cloud to supplement local data
        if (currentUser) {
          try {
            const cloudReceipts = await firebaseService.getAllReceipts();
            
            // If we have cloud receipts, use them
            if (cloudReceipts && cloudReceipts.length > 0) {
              // Combine local and cloud receipts, preferring cloud versions
              // Create a map of existing receipts by ID
              const receiptMap = new Map(loadedReceipts.map(r => [r.id, r]));
              
              // Add cloud receipts, overwriting any duplicates
              cloudReceipts.forEach(cloudReceipt => {
                receiptMap.set(cloudReceipt.id, cloudReceipt);
              });
              
              // Convert back to array
              loadedReceipts = Array.from(receiptMap.values());
              
              // Update local database with cloud data
              for (const receipt of cloudReceipts) {
                await dbService.saveReceipt(receipt);
              }
            } 
            // If we have local receipts but no cloud receipts, consider syncing to cloud
            else if (loadedReceipts.length > 0) {
              const autoSyncEnabled = localStorage.getItem('autoSyncEnabled') === 'true';
              
              if (autoSyncEnabled) {
                // Use a function to keep this logic contained
                // Use React 18 safe pattern for message API - move to useEffect
                const messageKey = 'syncMessage';
                messageApi.loading({ content: 'Syncing local receipts to cloud...', key: messageKey, duration: 0 });
                
                // Create an async function to handle the sync
                const syncToCloud = async () => {
                  try {
                    const result = await firebaseService.syncLocalReceipts(loadedReceipts);
                    messageApi.success({ 
                      content: `Synced ${result.added} receipts to cloud`, 
                      key: messageKey, 
                      duration: 3 
                    });
                  } catch (syncError) {
                    console.error('Sync error:', syncError);
                    messageApi.error({ 
                      content: 'Failed to sync receipts to cloud', 
                      key: messageKey, 
                      duration: 3 
                    });
                  }
                };
                
                // Call the sync function outside of the render cycle
                setTimeout(() => syncToCloud(), 100);
              } else {
                // Use an effect-safe timeout to show the info message
                setTimeout(() => {
                  messageApi.info('You have local receipts that can be synced to the cloud');
                }, 100);
              }
            }
          } catch (cloudError) {
            console.error('Failed to load cloud receipts:', cloudError);
            messageApi.warning('Could not connect to cloud, using local data only');
          }
        }
        
        setReceipts(loadedReceipts);
      } catch (error) {
        console.error('Failed to load receipts:', error);
        messageApi.error('Failed to load receipts');
      } finally {
        setLoading(false);
      }
    };

    loadReceipts();
  }, [messageApi, currentUser]);

  // Add new receipt
  const handleAddReceipt = async (newReceipt: Receipt) => {
    try {
      // Always save locally first
      await dbService.saveReceipt(newReceipt);
      
      // If user is logged in, also save to cloud
      if (currentUser) {
        try {
          await firebaseService.saveReceipt(newReceipt);
        } catch (cloudError) {
          console.error('Failed to save receipt to cloud:', cloudError);
          messageApi.warning('Receipt saved locally but failed to sync to cloud');
        }
      }
      
      setReceipts(prev => [...prev, newReceipt]);
      messageApi.success('Receipt added successfully');
      return newReceipt.id;
    } catch (error) {
      console.error('Failed to save receipt:', error);
      messageApi.error('Failed to save receipt');
      return null;
    }
  };

  // Update receipt
  const handleUpdateReceipt = async (updatedReceipt: Receipt) => {
    try {
      // Always update locally first
      await dbService.updateReceipt(updatedReceipt);
      
      // If user is logged in, also update in cloud
      if (currentUser) {
        try {
          await firebaseService.updateReceipt(updatedReceipt);
        } catch (cloudError) {
          console.error('Failed to update receipt in cloud:', cloudError);
          messageApi.warning('Receipt updated locally but failed to sync to cloud');
        }
      }
      
      setReceipts(prev => 
        prev.map(receipt => 
          receipt.id === updatedReceipt.id ? updatedReceipt : receipt
        )
      );
      messageApi.success('Receipt updated successfully');
    } catch (error) {
      console.error('Failed to update receipt:', error);
      messageApi.error('Failed to update receipt');
    }
  };

  // Delete receipt
  const handleDeleteReceipt = async (id: string) => {
    try {
      // Find the receipt to be deleted
      const receiptToDelete = receipts.find(r => r.id === id);
      if (!receiptToDelete) {
        messageApi.error('Receipt not found');
        return;
      }
      
      // Always delete locally first
      await dbService.deleteReceipt(id);
      
      // Update local state immediately for better UX
      setReceipts(prev => prev.filter(receipt => receipt.id !== id));
      messageApi.success('Receipt deleted successfully');
      
      // If user is logged in, also delete from cloud
      if (currentUser) {
        try {
          await firebaseService.deleteReceipt(id);
        } catch (cloudError) {
          console.error('Failed to delete receipt from cloud:', cloudError);
          
          // Only show warning if there's connectivity but deletion failed for other reasons
          if (cloudError.message !== 'No connectivity to Firestore') {
            messageApi.warning('Receipt deleted locally but failed to sync delete to cloud');
          }
          
          // Add to a "to delete" queue for later sync
          // This approach ensures the receipt will be deleted when connectivity is restored
          try {
            const pendingDeletions = JSON.parse(localStorage.getItem('pendingDeletions') || '[]');
            if (!pendingDeletions.includes(id)) {
              pendingDeletions.push(id);
              localStorage.setItem('pendingDeletions', JSON.stringify(pendingDeletions));
            }
          } catch (e) {
            console.error('Failed to save pending deletion:', e);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete receipt:', error);
      messageApi.error('Failed to delete receipt');
    }
  };

  // Add tags to multiple receipts
  const handleAddTagsToReceipts = async (receiptIds: string[], tags: string[]) => {
    try {
      const updatedReceipts = [...receipts];
      
      for (const id of receiptIds) {
        const receiptIndex = updatedReceipts.findIndex(r => r.id === id);
        if (receiptIndex === -1) continue;
        
        const receipt = updatedReceipts[receiptIndex];
        const currentTags = receipt.tags || [];
        const newTags = [...currentTags, ...tags].filter(
          (value, index, self) => self.indexOf(value) === index // Remove duplicates
        );
        
        const updatedReceipt = {
          ...receipt,
          tags: newTags,
          updatedAt: new Date()
        };
        
        // Update locally
        await dbService.updateReceipt(updatedReceipt);
        
        // Update in cloud if user is logged in
        if (currentUser) {
          try {
            await firebaseService.updateReceipt(updatedReceipt);
          } catch (cloudError) {
            console.error('Failed to update receipt tags in cloud:', cloudError);
          }
        }
        
        updatedReceipts[receiptIndex] = updatedReceipt;
      }
      
      setReceipts(updatedReceipts);
      messageApi.success(`Tags added to ${receiptIds.length} receipts`);
    } catch (error) {
      console.error('Failed to add tags:', error);
      messageApi.error('Failed to add tags to receipts');
    }
  };

  // Handle sync from settings page
  const handleSyncComplete = (newReceipts: Receipt[]) => {
    console.log(`Sync complete, received ${newReceipts.length} receipts from cloud`);
    
    if (newReceipts.length > 0) {
      // First, update local storage with cloud receipts
      const updateLocalStorage = async () => {
        try {
          console.log('Updating local storage with cloud receipts');
          for (const receipt of newReceipts) {
            await dbService.saveReceipt(receipt);
          }
          console.log('Local storage updated successfully');
        } catch (error) {
          console.error('Error updating local storage:', error);
          messageApi.error('Failed to update local storage with cloud receipts');
        }
      };
      
      // Update state and UI
      setReceipts(newReceipts);
      messageApi.success(`Loaded ${newReceipts.length} receipts from cloud`);
      
      // Update local storage in the background
      updateLocalStorage();
    } else {
      console.log('No receipts received from cloud');
    }
  };

  // Extract all categories from receipts
  const allCategories = receipts
    .flatMap(receipt => receipt.items)
    .map(item => item.category)
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading application...</div>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
        components: {
          Card: {
            cardShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          }
        }
      }}
    >
      <Router>
        {contextHolder}
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Main app routes with responsive layout */}
          <Route
            path="/"
            element={
              <ResponsiveLayout>
                <EnhancedDashboard receipts={receipts} />
              </ResponsiveLayout>
            }
          />
          <Route
            path="/receipts"
            element={
              <ResponsiveLayout>
                <EnhancedReceiptsList 
                  receipts={receipts} 
                  onDeleteReceipt={handleDeleteReceipt}
                  onAddTags={handleAddTagsToReceipts}
                />
              </ResponsiveLayout>
            }
          />
          <Route
            path="/scan"
            element={
              <ResponsiveLayout>
                <CombinedReceiptScanner onAddReceipt={handleAddReceipt} />
              </ResponsiveLayout>
            }
          />
          <Route
            path="/receipt/:id"
            element={
              <ResponsiveLayout>
                <EnhancedReceiptDetail 
                  receipts={receipts} 
                  onUpdateReceipt={handleUpdateReceipt}
                  onDeleteReceipt={handleDeleteReceipt}
                  categories={allCategories}
                />
              </ResponsiveLayout>
            }
          />
          <Route
            path="/export"
            element={
              <ResponsiveLayout>
                <ExportPage receipts={receipts} />
              </ResponsiveLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <ResponsiveLayout>
                <SettingsPage 
                  receipts={receipts}
                  onSyncComplete={handleSyncComplete}
                />
              </ResponsiveLayout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return <AppWithAuth />;
};

export default App;