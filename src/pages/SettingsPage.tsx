import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select, 
  Divider, 
  Typography, 
  message, 
  Space,
  Alert,
  List,
  Avatar,
  Modal,
  Progress,
  Badge,
  Popconfirm,
  Skeleton,
  Empty,
  Tag,
  Tooltip,
  Collapse
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  CloudOutlined,
  SyncOutlined,
  SettingOutlined,
  LogoutOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  FileTextOutlined,
  CloudSyncOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { dbService } from '../services/db-service';
import { firebaseService } from '../services/firebase/firebase-service';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../services/firebase/config';

// Initialize a Firestore instance directly for testing
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
import { useAuth } from '../contexts/AuthContext';
import { Receipt } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface SettingsPageProps {
  receipts: Receipt[];
  onSyncComplete?: (newReceipts: Receipt[]) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ receipts, onSyncComplete }) => {
  const navigate = useNavigate();
  const { currentUser, signOut } = useAuth();
  
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<{
    added: number;
    updated: number;
    conflicts: number;
    cloudCount: number;
    localCount: number;
  } | null>(null);
  const [exportSettings, setExportSettings] = useState({
    defaultFormat: 'xlsx',
    includeTags: true,
    includeNotes: true,
    defaultGrouping: 'none'
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStage, setSyncStage] = useState('preparing');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(
    localStorage.getItem('autoSyncEnabled') === 'true'
  );
  
  // Handle cloud sync
  const handleSyncWithCloud = async () => {
    if (!currentUser) {
      message.error('You must be logged in to sync with cloud');
      return;
    }
    
    try {
      setSyncModalVisible(true);
      setSyncLoading(true);
      setSyncProgress(10);
      setSyncStage('preparing');
      
      console.log('Starting cloud sync process');
      console.log(`Local receipts count: ${receipts.length}`);
      
      // Step 1: Get all cloud receipts
      setSyncProgress(20);
      setSyncStage('fetching');
      console.log('Fetching cloud receipts');
      const cloudReceipts = await firebaseService.getAllReceipts();
      console.log(`Found ${cloudReceipts.length} receipts in cloud`);
      
      // Step 2: Compare and sync
      setSyncProgress(40);
      setSyncStage('comparing');
      console.log('Syncing local receipts to cloud');
      const result = await firebaseService.syncLocalReceipts(receipts);
      console.log(`Sync result: ${result.added} added, ${result.updated} updated, ${result.conflicts} conflicts`);
      
      // Step 3: Get updated cloud receipts after sync
      setSyncProgress(80);
      setSyncStage('finalizing');
      console.log('Fetching updated cloud receipts');
      const updatedCloudReceipts = await firebaseService.getAllReceipts();
      console.log(`After sync: ${updatedCloudReceipts.length} receipts in cloud`);
      
      // If we have receipts in the cloud, ensure they all have the required properties
      if (updatedCloudReceipts.length > 0) {
        // Make sure all receipts have the required base properties
        const processedReceipts = updatedCloudReceipts.map(receipt => {
          // Ensure dates are Date objects
          const processedReceipt = {
            ...receipt,
            date: receipt.date instanceof Date ? receipt.date : new Date(receipt.date),
            createdAt: receipt.createdAt instanceof Date ? receipt.createdAt : new Date(receipt.createdAt),
            updatedAt: receipt.updatedAt instanceof Date ? receipt.updatedAt : new Date(receipt.updatedAt),
            // Ensure arrays exist
            items: receipt.items || [],
            tags: receipt.tags || []
          };
          return processedReceipt;
        });
        
        console.log('Processed cloud receipts for state update');
        
        // Step 4: Complete
        setSyncProgress(100);
        setSyncStage('complete');
        
        // Update stats
        setSyncStats({
          added: result.added,
          updated: result.updated,
          conflicts: result.conflicts,
          cloudCount: updatedCloudReceipts.length,
          localCount: receipts.length
        });
        
        // Notify parent component of new data
        if (onSyncComplete) {
          console.log('Calling onSyncComplete with cloud receipts');
          onSyncComplete(processedReceipts);
        }
        
        message.success(`Sync complete. ${result.added} added, ${result.updated} updated, ${result.conflicts} conflicts.`);
      } else {
        console.log('No receipts found in cloud after sync');
        
        // Step 4: Complete
        setSyncProgress(100);
        setSyncStage('complete');
        
        // Update stats with zeros for cloud
        setSyncStats({
          added: result.added,
          updated: result.updated,
          conflicts: result.conflicts,
          cloudCount: 0,
          localCount: receipts.length
        });
        
        message.info('Sync complete, but no receipts found in cloud.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      message.error('Failed to sync with cloud');
      setSyncStage('error');
    } finally {
      setSyncLoading(false);
    }
  };
  
  // Toggle auto sync
  const handleAutoSyncToggle = (checked: boolean) => {
    setAutoSyncEnabled(checked);
    localStorage.setItem('autoSyncEnabled', checked.toString());
    
    if (checked && currentUser) {
      message.info('Auto sync enabled. Your receipts will automatically sync with the cloud.');
    }
  };
  
  // Handle profile update
  const handleProfileUpdate = async (values: any) => {
    try {
      setProfileLoading(true);
      // Implementation would go here
      message.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      message.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Handle export settings
  const handleExportSettingsUpdate = (values: any) => {
    setExportSettings({
      ...exportSettings,
      ...values
    });
    
    localStorage.setItem('exportSettings', JSON.stringify({
      ...exportSettings,
      ...values
    }));
    
    message.success('Export settings saved');
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      message.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      message.error('Failed to sign out');
    }
  };
  
  // Handle delete account
  const handleDeleteAccount = async () => {
    // This would typically have more confirmation steps
    message.info('Account deletion would be implemented here');
  };

  // Prepare the DataManagement Component to improve readability
  const DataManagementContent = () => (
    <>
      <List
        header={<Title level={5}>Local Data Management</Title>}
        bordered
        dataSource={[
          {
            title: 'Export All Data',
            description: 'Export all your receipt data as a backup',
            icon: <FileTextOutlined />,
            action: () => navigate('/export'),
            buttonText: 'Export',
            dangerous: false
          },
          {
            title: 'Import Data',
            description: 'Import receipts from a backup file',
            icon: <FileTextOutlined />,
            action: () => console.log('Import'),
            buttonText: 'Import',
            dangerous: false
          },
          {
            title: 'Clear All Local Data',
            description: 'Delete all receipts stored on this device',
            icon: <DeleteOutlined />,
            action: () => {
              Modal.confirm({
                title: 'Clear All Local Data',
                content: 'This will delete all receipts stored on this device. This action cannot be undone.',
                okText: 'Delete All',
                okType: 'danger',
                cancelText: 'Cancel',
                onOk: async () => {
                  try {
                    await dbService.clearAllReceipts();
                    message.success('All local data has been cleared');
                    // Notify parent to update state
                    if (onSyncComplete) {
                      onSyncComplete([]);
                    }
                  } catch (error) {
                    console.error('Error clearing data:', error);
                    message.error('Failed to clear data');
                  }
                }
              });
            },
            buttonText: 'Clear Data',
            dangerous: true
          }
        ]}
        renderItem={item => (
          <List.Item
            actions={[
              <Button
                danger={item.dangerous}
                onClick={item.action}
              >
                {item.buttonText}
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar icon={item.icon} />}
              title={item.title}
              description={item.description}
            />
          </List.Item>
        )}
      />
      
      {currentUser && (
        <>
          <Divider />
          
          <List
            header={<Title level={5}>Cloud Data Management</Title>}
            bordered
            dataSource={[
              {
                title: 'Download All Cloud Data',
                description: 'Download all your receipts from the cloud',
                icon: <CloudDownloadOutlined />,
                action: () => console.log('Download cloud data'),
                buttonText: 'Download',
                dangerous: false
              },
              {
                title: 'Clear Cloud Data',
                description: 'Delete all receipts stored in the cloud',
                icon: <DeleteOutlined />,
                action: () => {
                  Modal.confirm({
                    title: 'Clear Cloud Data',
                    content: 'This will delete all receipts stored in the cloud. This action cannot be undone.',
                    okText: 'Delete All',
                    okType: 'danger',
                    cancelText: 'Cancel',
                    onOk: () => {
                      message.info('This feature would delete all cloud data');
                    }
                  });
                },
                buttonText: 'Clear Cloud',
                dangerous: true
              }
            ]}
            renderItem={item => (
              <List.Item
                actions={[
                  <Button
                    danger={item.dangerous}
                    onClick={item.action}
                  >
                    {item.buttonText}
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={item.icon} />}
                  title={item.title}
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </>
      )}
    </>
  );

  // Prepare the Cloud Sync content as a separate component
  const CloudSyncContent = () => (
    <div className="cloud-sync-settings">
      {currentUser ? (
        <>
          <Alert
            message="Cloud Sync Enabled"
            description={
              <Space direction="vertical">
                <Text>You are signed in as <strong>{currentUser.email}</strong></Text>
                <Text>Your receipts can be automatically synced to the cloud and accessed from any device.</Text>
              </Space>
            }
            type="success"
            showIcon
            icon={<CloudOutlined />}
            style={{ marginBottom: 24 }}
          />
          
          <Form layout="vertical">
            <Form.Item
              label="Auto Sync"
              extra="Automatically sync receipts between devices when changes are detected"
            >
              <Switch 
                checked={autoSyncEnabled} 
                onChange={handleAutoSyncToggle} 
              />
            </Form.Item>
            
            <Divider />
            
            <Form.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space>
                    <Text strong>Manual Sync</Text>
                    <Text type="secondary">
                      Local: <Badge count={receipts.length} style={{ backgroundColor: '#1890ff' }} />
                    </Text>
                    {syncStats && (
                      <Text type="secondary">
                        Cloud: <Badge count={syncStats.cloudCount} style={{ backgroundColor: '#52c41a' }} />
                      </Text>
                    )}
                  </Space>
                  
                  <Button
                    type="primary"
                    icon={<SyncOutlined />}
                    loading={syncLoading}
                    onClick={handleSyncWithCloud}
                  >
                    Sync Now
                  </Button>
                </div>
                
                {syncStats && (
                  <div style={{ marginTop: 16 }}>
                    <List
                      size="small"
                      bordered
                      dataSource={[
                        { label: 'Added to cloud', value: syncStats.added, icon: <CloudUploadOutlined style={{ color: '#52c41a' }} /> },
                        { label: 'Updated in cloud', value: syncStats.updated, icon: <SyncOutlined style={{ color: '#1890ff' }} /> },
                        { label: 'Sync conflicts', value: syncStats.conflicts, icon: <WarningOutlined style={{ color: syncStats.conflicts > 0 ? '#faad14' : '#8c8c8c' }} /> },
                      ]}
                      renderItem={item => (
                        <List.Item>
                          <Space>
                            {item.icon}
                            <Text>{item.label}:</Text>
                            <Text strong>{item.value}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </Space>
            </Form.Item>
          </Form>
        </>
      ) : (
        <Alert
          message="Cloud Sync Not Enabled"
          description={
            <Space direction="vertical">
              <Text>You are not signed in. Your receipts are stored only on this device.</Text>
              <Text>Sign in or create an account to enable cloud sync and access your receipts from any device.</Text>
              <Space style={{ marginTop: 16 }}>
                <Button type="primary" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/register')}>
                  Create Account
                </Button>
              </Space>
            </Space>
          }
          type="warning"
          showIcon
          icon={<CloudOutlined />}
        />
      )}
      
      <Divider />
      
      <Collapse 
        ghost
        items={[
          {
            key: '1',
            label: "Advanced Sync Options",
            children: (
              <List
                size="small"
                bordered
                dataSource={[
                  { 
                    title: 'Force Upload All', 
                    description: 'Force upload all local receipts to cloud, overwriting cloud versions', 
                    icon: <CloudUploadOutlined />,
                    danger: true,
                    action: async () => {
                      if (!currentUser) {
                        message.error('You must be logged in to use this feature');
                        return;
                      }
                      
                      try {
                        Modal.confirm({
                          title: 'Force Upload All Receipts',
                          content: 'This will upload all local receipts to the cloud, potentially overwriting cloud versions. Continue?',
                          okText: 'Upload All',
                          okType: 'danger',
                          cancelText: 'Cancel',
                          onOk: async () => {
                            setSyncModalVisible(true);
                            setSyncLoading(true);
                            setSyncStage('preparing');
                            setSyncProgress(10);
                            
                            console.log('Force uploading all receipts to cloud');
                            let added = 0;
                            
                            try {
                              for (const receipt of receipts) {
                                setSyncProgress(10 + (90 * (added / receipts.length)));
                                
                                try {
                                  console.log(`Force uploading receipt ${receipt.id}`);
                                  await firebaseService.saveReceipt(receipt);
                                  added++;
                                  console.log(`Upload ${added}/${receipts.length} complete`);
                                } catch (error) {
                                  console.error(`Failed to upload receipt ${receipt.id}:`, error);
                                }
                              }
                              
                              setSyncProgress(100);
                              setSyncStage('complete');
                              
                              // Update stats
                              const cloudReceipts = await firebaseService.getAllReceipts();
                              setSyncStats({
                                added,
                                updated: 0,
                                conflicts: 0,
                                cloudCount: cloudReceipts.length,
                                localCount: receipts.length
                              });
                              
                              // Notify parent
                              if (onSyncComplete) {
                                onSyncComplete(cloudReceipts);
                              }
                              
                              message.success(`Forced upload complete. ${added} receipts uploaded.`);
                            } catch (error) {
                              console.error('Force upload error:', error);
                              setSyncStage('error');
                              message.error('Failed to force upload receipts');
                            } finally {
                              setSyncLoading(false);
                            }
                          }
                        });
                      } catch (error) {
                        console.error('Error in force upload:', error);
                        message.error('An error occurred');
                      }
                    }
                  },
                  { 
                    title: 'Force Download All', 
                    description: 'Force download all cloud receipts, overwriting local versions', 
                    icon: <CloudDownloadOutlined />,
                    danger: true,
                    action: async () => {
                      if (!currentUser) {
                        message.error('You must be logged in to use this feature');
                        return;
                      }
                      
                      try {
                        Modal.confirm({
                          title: 'Force Download All Receipts',
                          content: 'This will download all cloud receipts, overwriting local versions. Continue?',
                          okText: 'Download All',
                          okType: 'danger',
                          cancelText: 'Cancel',
                          onOk: async () => {
                            setSyncModalVisible(true);
                            setSyncLoading(true);
                            setSyncStage('preparing');
                            setSyncProgress(10);
                            
                            try {
                              console.log('Fetching all cloud receipts');
                              setSyncProgress(30);
                              setSyncStage('fetching');
                              
                              const cloudReceipts = await firebaseService.getAllReceipts();
                              console.log(`Found ${cloudReceipts.length} receipts in cloud`);
                              
                              setSyncProgress(50);
                              setSyncStage('downloading');
                              
                              // Save all cloud receipts locally
                              for (let i = 0; i < cloudReceipts.length; i++) {
                                const receipt = cloudReceipts[i];
                                setSyncProgress(50 + (50 * (i / cloudReceipts.length)));
                                
                                try {
                                  console.log(`Saving cloud receipt ${receipt.id} locally`);
                                  await dbService.saveReceipt(receipt);
                                } catch (error) {
                                  console.error(`Failed to save cloud receipt ${receipt.id} locally:`, error);
                                }
                              }
                              
                              setSyncProgress(100);
                              setSyncStage('complete');
                              
                              // Update stats
                              setSyncStats({
                                added: 0,
                                updated: cloudReceipts.length,
                                conflicts: 0,
                                cloudCount: cloudReceipts.length,
                                localCount: cloudReceipts.length
                              });
                              
                              // Notify parent
                              if (onSyncComplete) {
                                onSyncComplete(cloudReceipts);
                              }
                              
                              message.success(`Force download complete. ${cloudReceipts.length} receipts downloaded.`);
                            } catch (error) {
                              console.error('Force download error:', error);
                              setSyncStage('error');
                              message.error('Failed to force download receipts');
                            } finally {
                              setSyncLoading(false);
                            }
                          }
                        });
                      } catch (error) {
                        console.error('Error in force download:', error);
                        message.error('An error occurred');
                      }
                    }
                  },
                  { 
                    title: 'Initialize Firestore', 
                    description: 'Create necessary collections and documents in Firestore', 
                    icon: <DatabaseOutlined />,
                    danger: false,
                    action: async () => {
                      if (!currentUser) {
                        message.error('You must be logged in to initialize Firestore');
                        return;
                      }
                      
                      try {
                        message.loading('Initializing Firestore...');
                        console.log('Initializing Firestore collections and documents');
                        
                        // Create system collection
                        try {
                          await setDoc(doc(db, 'system', 'status'), {
                            lastUpdated: new Date(),
                            status: 'online',
                            appVersion: '1.0.0'
                          });
                          console.log('Created system/status document');
                        } catch (e) {
                          console.error('Failed to create system/status:', e);
                        }
                        
                        // Create public collection
                        try {
                          await setDoc(doc(db, 'public', 'app_status'), {
                            lastUpdated: new Date(),
                            message: 'Receipt Scanner App is operational'
                          });
                          console.log('Created public/app_status document');
                        } catch (e) {
                          console.error('Failed to create public/app_status:', e);
                        }
                        
                        // Create permission_tests collection
                        try {
                          await setDoc(doc(db, 'permission_tests', 'test_doc'), {
                            lastUpdated: new Date(),
                            message: 'This collection is used for permission testing'
                          });
                          console.log('Created permission_tests/test_doc document');
                        } catch (e) {
                          console.error('Failed to create permission_tests/test_doc:', e);
                        }
                        
                        message.success('Firestore initialization completed');
                      } catch (error) {
                        console.error('Firestore initialization error:', error);
                        message.error('Failed to initialize Firestore');
                      }
                    }
                  },
                  { 
                    title: 'Test Firestore Permissions', 
                    description: 'Test if your account has proper permissions to write to Firestore', 
                    icon: <InfoCircleOutlined />,
                    danger: false,
                    action: async () => {
                      if (!currentUser) {
                        message.error('You must be logged in to test permissions');
                        return;
                      }
                      
                      try {
                        console.log('Testing Firestore permissions...');
                        message.loading('Testing Firestore permissions...');
                        
                        // Test document reference
                        const testDocRef = doc(db, 'system', 'permissions_test');
                        
                        try {
                          // Try to write to a test document
                          await setDoc(testDocRef, {
                            userId: currentUser.uid,
                            timestamp: new Date(),
                            test: 'This is a permissions test'
                          });
                          
                          console.log('✅ Write successful - You have write permissions!');
                          message.success('You have write permissions to Firestore');
                          
                          // Clean up by deleting the test document
                          await deleteDoc(testDocRef);
                          console.log('Test document cleaned up');
                        } catch (writeError) {
                          console.error('❌ Write failed:', writeError);
                          message.error('You do not have write permissions to Firestore. Check Firebase console.');
                          
                          // Try to read to see if we have at least read permissions
                          try {
                            await getDoc(testDocRef);
                            console.log('✅ Read successful - You have read permissions!');
                            message.warning('You have read permissions but not write permissions');
                          } catch (readError) {
                            console.error('❌ Read also failed:', readError);
                            message.error('You do not have read or write permissions');
                          }
                        }
                      } catch (error) {
                        console.error('Permission test error:', error);
                        message.error('Permission test failed with error');
                      }
                    }
                  },
                  { 
                    title: 'Fix Multi-Photo Receipt', 
                    description: 'Fix specific issues with multi-photo receipts that fail to sync', 
                    icon: <InfoCircleOutlined />,
                    danger: false,
                    action: async () => {
                      if (!currentUser) {
                        message.error('You must be logged in to use this feature');
                        return;
                      }
                      
                      try {
                        message.loading('Analyzing multi-photo receipts...');
                        console.log('Looking for multi-photo receipts with sync issues');
                        
                        // Find receipts with additional images
                        const multiPhotoReceipts = receipts.filter(r => 
                          r.additionalImages && r.additionalImages.length > 0
                        );
                        
                        if (multiPhotoReceipts.length === 0) {
                          message.info('No multi-photo receipts found.');
                          return;
                        }
                        
                        console.log(`Found ${multiPhotoReceipts.length} multi-photo receipts`);
                        
                        // Try to manually save each multi-photo receipt
                        let fixedCount = 0;
                        
                        for (const receipt of multiPhotoReceipts) {
                          try {
                            console.log(`Fixing receipt: ${receipt.id}`);
                            
                            // Clean the receipt for Firestore
                            const cleanedReceipt = {
                              id: receipt.id,
                              storeName: receipt.storeName || '',
                              date: receipt.date || new Date(),
                              total: receipt.total || 0,
                              createdAt: receipt.createdAt || new Date(),
                              updatedAt: receipt.updatedAt || new Date(),
                              merchantAddress: receipt.merchantAddress || '',
                              merchantPhone: receipt.merchantPhone || '',
                              paymentMethod: receipt.paymentMethod || '',
                              currency: receipt.currency || '',
                              taxAmount: receipt.taxAmount || 0,
                              notes: receipt.notes || '',
                              tags: receipt.tags || [],
                              items: receipt.items || [],
                              // Add metadata about the images instead of the images themselves
                              hasMainImage: true,
                              hasAdditionalImages: true,
                              additionalImagesCount: receipt.additionalImages.length,
                              imageUrl: '',
                              additionalImageUrls: []
                            };
                            
                            // Add this receipt to Firestore directly
                            const receiptDocRef = doc(db, 'receipts', receipt.id);
                            
                            await setDoc(receiptDocRef, {
                              ...cleanedReceipt,
                              userId: currentUser.uid,
                              // Convert dates to Firestore timestamps
                              date: Timestamp.fromDate(new Date(cleanedReceipt.date)),
                              createdAt: Timestamp.fromDate(new Date(cleanedReceipt.createdAt)),
                              updatedAt: Timestamp.fromDate(new Date(cleanedReceipt.updatedAt)),
                              // Remove image data
                              imageData: null,
                              additionalImages: null
                            });
                            
                            console.log(`Successfully saved receipt ${receipt.id} to Firestore`);
                            fixedCount++;
                          } catch (error) {
                            console.error(`Failed to fix receipt ${receipt.id}:`, error);
                          }
                        }
                        
                        if (fixedCount > 0) {
                          message.success(`Fixed ${fixedCount} multi-photo receipts`);
                          
                          // Reload cloud receipts
                          const cloudReceipts = await firebaseService.getAllReceipts();
                          if (onSyncComplete) {
                            onSyncComplete(cloudReceipts);
                          }
                        } else {
                          message.error('Failed to fix any receipts');
                        }
                      } catch (error) {
                        console.error('Error fixing multi-photo receipts:', error);
                        message.error('An error occurred');
                      }
                    }
                  },
                  { 
                    title: 'Debug Receipt Sync', 
                    description: 'Log detailed information about receipts to help debug sync issues', 
                    icon: <InfoCircleOutlined />,
                    danger: false,
                    action: () => {
                      try {
                        console.log('========= DEBUGGING RECEIPT SYNC =========');
                        console.log(`Total local receipts: ${receipts.length}`);
                        
                        // Log all receipts with their IDs and metadata
                        receipts.forEach((receipt, index) => {
                          console.log(`Receipt ${index + 1}/${receipts.length}:`);
                          console.log(`- ID: ${receipt.id}`);
                          console.log(`- Store: ${receipt.storeName}`);
                          console.log(`- Date: ${new Date(receipt.date).toLocaleDateString()}`);
                          console.log(`- Items: ${receipt.items.length}`);
                          console.log(`- Has main image: ${!!receipt.imageData}`);
                          console.log(`- Additional images: ${receipt.additionalImages ? receipt.additionalImages.length : 0}`);
                          console.log(`- Created: ${new Date(receipt.createdAt).toLocaleString()}`);
                          console.log(`- Updated: ${new Date(receipt.updatedAt).toLocaleString()}`);
                          console.log('---');
                        });
                        
                        // If we have any multi-photo receipts, log them separately
                        const multiPhotoReceipts = receipts.filter(
                          r => r.additionalImages && r.additionalImages.length > 0
                        );
                        
                        if (multiPhotoReceipts.length > 0) {
                          console.log(`Found ${multiPhotoReceipts.length} multi-photo receipts`);
                          multiPhotoReceipts.forEach((receipt, index) => {
                            console.log(`Multi-photo receipt ${index + 1}/${multiPhotoReceipts.length}:`);
                            console.log(`- ID: ${receipt.id}`);
                            console.log(`- Additional images: ${receipt.additionalImages!.length}`);
                            console.log(`- Main image data length: ${receipt.imageData ? receipt.imageData.length : 0} chars`);
                            if (receipt.additionalImages && receipt.additionalImages.length > 0) {
                              receipt.additionalImages.forEach((img, imgIndex) => {
                                console.log(`  - Additional image ${imgIndex + 1} length: ${img.length} chars`);
                              });
                            }
                          });
                        }
                        
                        message.success('Debug information has been logged to the console');
                      } catch (error) {
                        console.error('Debug error:', error);
                        message.error('An error occurred while debugging');
                      }
                    }
                  },
                ]}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button 
                        type={item.danger ? 'default' : 'primary'}
                        danger={item.danger}
                        size="small"
                        onClick={item.action}
                      >
                        {item.title}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={item.icon} />}
                      title={item.title}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            )
          }
        ]}
      />
    </div>
  );

  // Prepare the Account content
  const AccountContent = () => (
    <Card variant="borderless" className="user-profile-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Avatar 
          size={64} 
          icon={<UserOutlined />} 
          style={{ backgroundColor: '#1890ff' }}
        />
        <div style={{ marginLeft: 16 }}>
          <Title level={4} style={{ margin: 0 }}>
            {currentUser?.displayName || 'User'}
          </Title>
          <Text type="secondary">{currentUser?.email}</Text>
        </div>
      </div>
      
      <Form
        layout="vertical"
        initialValues={{
          name: currentUser?.displayName || '',
          email: currentUser?.email || '',
        }}
        onFinish={handleProfileUpdate}
      >
        <Form.Item
          name="name"
          label="Display Name"
        >
          <Input prefix={<UserOutlined />} />
        </Form.Item>
        
        <Form.Item
          name="email"
          label="Email"
        >
          <Input prefix={<UserOutlined />} disabled />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={profileLoading}
          >
            Update Profile
          </Button>
        </Form.Item>
      </Form>
      
      <Divider />
      
      <Title level={5}>Security</Title>
      <List>
        <List.Item
          actions={[
            <Button>
              Change Password
            </Button>
          ]}
        >
          <List.Item.Meta
            avatar={<Avatar icon={<LockOutlined />} />}
            title="Password"
            description="Update your password"
          />
        </List.Item>
      </List>
      
      <Divider />
      
      <Title level={5}>Account Actions</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Button 
          icon={<LogoutOutlined />} 
          onClick={handleSignOut}
          block
        >
          Sign Out
        </Button>
        
        <Popconfirm
          title="Are you sure you want to delete your account?"
          description="This will permanently delete your account and all associated data. This action cannot be undone."
          okText="Delete"
          okType="danger"
          cancelText="Cancel"
          onConfirm={handleDeleteAccount}
          icon={<WarningOutlined style={{ color: 'red' }} />}
        >
          <Button 
            danger 
            icon={<DeleteOutlined />}
            block
          >
            Delete Account
          </Button>
        </Popconfirm>
      </Space>
    </Card>
  );

  // Generate tabs items based on the user status
  const getTabItems = () => {
    const items = [
      {
        key: 'sync',
        label: (
          <span>
            <CloudSyncOutlined />
            Cloud Sync
          </span>
        ),
        children: <CloudSyncContent />
      },
      {
        key: 'export',
        label: (
          <span>
            <ExportOutlined />
            Export Settings
          </span>
        ),
        children: (
          <Form
            layout="vertical"
            initialValues={exportSettings}
            onFinish={handleExportSettingsUpdate}
          >
            <Form.Item
              name="defaultFormat"
              label="Default Export Format"
            >
              <Select>
                <Option value="xlsx">Excel (.xlsx)</Option>
                <Option value="csv">CSV (.csv)</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="defaultGrouping"
              label="Default Grouping"
            >
              <Select>
                <Option value="none">No Grouping</Option>
                <Option value="store">Group by Store</Option>
                <Option value="date">Group by Month</Option>
                <Option value="category">Group by Category</Option>
                <Option value="currency">Group by Currency</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="includeTags"
              valuePropName="checked"
              label="Include Tags in Export"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item
              name="includeNotes"
              valuePropName="checked"
              label="Include Notes in Export"
            >
              <Switch />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Save Export Settings
              </Button>
            </Form.Item>
          </Form>
        )
      },
      {
        key: 'data',
        label: (
          <span>
            <DatabaseOutlined />
            Data Management
          </span>
        ),
        children: <DataManagementContent />
      }
    ];

    // Add account tab if user is logged in
    if (currentUser) {
      items.push({
        key: 'account',
        label: (
          <span>
            <UserOutlined />
            Account
          </span>
        ),
        children: <AccountContent />
      });
    }

    return items;
  };

  return (
    <div className="settings-page-container">
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>Settings</span>
          </Space>
        }
        variant="borderless"
      >
        <Tabs 
          defaultActiveKey="sync"
          items={getTabItems()}
        />
      </Card>
      
      {/* Sync Modal */}
      <Modal
        title="Synchronizing with Cloud"
        open={syncModalVisible}
        footer={null}
        closable={syncStage === 'complete' || syncStage === 'error'}
        maskClosable={syncStage === 'complete' || syncStage === 'error'}
        onCancel={() => setSyncModalVisible(false)}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {syncStage !== 'complete' && syncStage !== 'error' && (
            <SyncOutlined spin style={{ fontSize: 48, color: '#1890ff', marginBottom: 24 }} />
          )}
          
          {syncStage === 'complete' && (
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 24 }} />
          )}
          
          {syncStage === 'error' && (
            <CloseCircleOutlined style={{ fontSize: 48, color: '#f5222d', marginBottom: 24 }} />
          )}
          
          <Title level={4}>
            {syncStage === 'preparing' && 'Preparing to sync'}
            {syncStage === 'fetching' && 'Fetching cloud data'}
            {syncStage === 'comparing' && 'Comparing receipts'}
            {syncStage === 'finalizing' && 'Finalizing changes'}
            {syncStage === 'complete' && 'Sync Complete'}
            {syncStage === 'error' && 'Sync Failed'}
          </Title>
          
          <Progress percent={syncProgress} status={syncStage === 'error' ? 'exception' : 'active'} />
          
          {syncStage === 'complete' && syncStats && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <List
                size="small"
                bordered
                dataSource={[
                  { label: 'Added to cloud', value: syncStats.added },
                  { label: 'Updated in cloud', value: syncStats.updated },
                  { label: 'Sync conflicts', value: syncStats.conflicts },
                  { label: 'Total in cloud', value: syncStats.cloudCount },
                  { label: 'Total local', value: syncStats.localCount },
                ]}
                renderItem={item => (
                  <List.Item>
                    <Text>{item.label}:</Text>
                    <Text strong>{item.value}</Text>
                  </List.Item>
                )}
              />
              
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button type="primary" onClick={() => setSyncModalVisible(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
          
          {syncStage === 'error' && (
            <div style={{ marginTop: 24 }}>
              <Alert
                message="Sync Failed"
                description="There was a problem synchronizing with the cloud. Please try again later."
                type="error"
                showIcon
              />
              
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button type="primary" onClick={() => setSyncModalVisible(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;