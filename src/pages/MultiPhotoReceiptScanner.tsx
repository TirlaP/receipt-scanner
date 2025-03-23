import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  Card, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Progress, 
  Alert, 
  Spin, 
  Space, 
  Image,
  Divider,
  Steps,
  Radio,
  Tooltip,
  List,
  Collapse,
  Switch,
  Modal,
  Empty
} from 'antd';
import { 
  InboxOutlined, 
  FileImageOutlined, 
  LoadingOutlined, 
  CheckCircleOutlined,
  ScanOutlined, 
  FormOutlined,
  CloseCircleOutlined,
  CloudOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  CameraOutlined,
  MergeCellsOutlined
} from '@ant-design/icons';

import { Receipt, ReceiptItem } from '../types';
import { fileService } from '../services/file-service';
import mindeeService from '../services/mindee-service';
import { fallbackParser } from '../services/fallback-parser';
import { v4 as uuidv4 } from 'uuid';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { confirm } = Modal;

interface MultiPhotoReceiptScannerProps {
  onAddReceipt: (receipt: Receipt) => Promise<string | null>;
  hideTitle?: boolean;
}

interface ReceiptPhoto {
  id: string;
  file: File;
  imageData: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  extractedData: Partial<Receipt> | null;
  error?: string;
}

const MultiPhotoReceiptScanner: React.FC<MultiPhotoReceiptScannerProps> = ({ onAddReceipt, hideTitle = false }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'mindee' | 'manual'>('mindee');
  const [photos, setPhotos] = useState<ReceiptPhoto[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);
  const [autoMerge, setAutoMerge] = useState<boolean>(true);
  
  // Add new photo to collection
  const addPhoto = async (file: File) => {
    try {
      // Validate file
      if (!fileService.isValidImage(file)) {
        setError('Please upload a valid image file (PNG, JPEG, or WEBP)');
        return;
      }

      if (!fileService.isValidSize(file)) {
        setError('File is too large. Maximum size is 5MB');
        return;
      }

      // Convert to base64
      const imageData = await fileService.fileToBase64(file);
      
      // Add to photos array
      const newPhoto: ReceiptPhoto = {
        id: uuidv4(),
        file,
        imageData,
        processingStatus: 'pending',
        extractedData: null
      };
      
      setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
      
      // If we should auto-process
      if (scanMode === 'mindee') {
        processPhoto(newPhoto.id);
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      setError('Failed to add photo');
    }
  };
  
  // Process a single photo
  const processPhoto = async (photoId: string) => {
    try {
      // Update status
      setPhotos(prevPhotos => 
        prevPhotos.map(photo => 
          photo.id === photoId 
            ? { ...photo, processingStatus: 'processing' }
            : photo
        )
      );
      
      // Find the photo
      const photo = photos.find(p => p.id === photoId);
      if (!photo) {
        throw new Error('Photo not found');
      }
      
      let extractedData: Partial<Receipt> = {};
      
      if (scanMode === 'mindee') {
        // Process with Mindee API
        const receipt = await mindeeService.processReceipt(photo.imageData);
        extractedData = {
          storeName: receipt.storeName,
          date: receipt.date,
          total: receipt.total,
          items: receipt.items,
          currency: receipt.currency,
          merchantAddress: receipt.merchantAddress,
          merchantPhone: receipt.merchantPhone,
          paymentMethod: receipt.paymentMethod,
          taxAmount: receipt.taxAmount
        };
      } else {
        // Manual mode - just create placeholder
        extractedData = {
          storeName: 'Unknown Store',
          date: new Date(),
          total: 0,
          items: []
        };
      }
      
      // Update with extracted data
      setPhotos(prevPhotos => 
        prevPhotos.map(p => 
          p.id === photoId 
            ? { 
                ...p, 
                processingStatus: 'completed',
                extractedData
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error processing photo:', error);
      
      // Update with error
      setPhotos(prevPhotos => 
        prevPhotos.map(p => 
          p.id === photoId 
            ? { 
                ...p, 
                processingStatus: 'error',
                error: 'Failed to process photo' 
              }
            : p
        )
      );
    }
  };
  
  // Remove a photo
  const removePhoto = (photoId: string) => {
    setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));
  };
  
  // Process all photos
  const processAllPhotos = async () => {
    const pendingPhotos = photos.filter(photo => photo.processingStatus === 'pending');
    
    for (const photo of pendingPhotos) {
      await processPhoto(photo.id);
    }
  };
  
  // Merge all processed photos into single receipt
  const mergeReceipt = async () => {
    try {
      setIsMerging(true);
      setProgress(0);
      
      // Make sure we have processed photos
      const processedPhotos = photos.filter(
        photo => photo.processingStatus === 'completed'
      );
      
      if (processedPhotos.length === 0) {
        setError('No processed photos to merge');
        setIsMerging(false);
        return;
      }
      
      setProgress(20);
      
      // Start with first photo's data
      const firstPhotoData = processedPhotos[0].extractedData!;
      
      // Initialize merged receipt
      const mergedReceipt: Receipt = {
        id: uuidv4(),
        storeName: firstPhotoData.storeName || 'Unknown Store',
        date: firstPhotoData.date || new Date(),
        total: firstPhotoData.total || 0,
        items: [...(firstPhotoData.items || [])],
        // Combine all images
        imageData: processedPhotos[0].imageData,
        additionalImages: processedPhotos.slice(1).map(p => p.imageData),
        createdAt: new Date(),
        updatedAt: new Date(),
        currency: firstPhotoData.currency || 'RON',
        merchantAddress: firstPhotoData.merchantAddress || '',
        merchantPhone: firstPhotoData.merchantPhone || '',
        paymentMethod: firstPhotoData.paymentMethod || '',
        taxAmount: firstPhotoData.taxAmount || 0,
        notes: processedPhotos.length > 1 
          ? `Merged from ${processedPhotos.length} receipt photos` 
          : '',
        // Add metadata to help with sync debugging
        _debug: {
          isMultiPhotoReceipt: true,
          photoCount: processedPhotos.length,
          createdWith: 'MultiPhotoScanner'
        }
      };
      
      console.log(`Created merged receipt with ${processedPhotos.length} photos`);
      console.log(`Main image size: ${mergedReceipt.imageData.length} characters`);
      console.log(`Additional images: ${mergedReceipt.additionalImages.length}`);
      
      setProgress(50);
      
      // Merge data from other photos
      for (let i = 1; i < processedPhotos.length; i++) {
        const photoData = processedPhotos[i].extractedData!;
        
        // Use the store name from the first photo that has one
        if (!mergedReceipt.storeName || mergedReceipt.storeName === 'Unknown Store') {
          mergedReceipt.storeName = photoData.storeName || mergedReceipt.storeName;
        }
        
        // Use the earliest date
        if (photoData.date && photoData.date < mergedReceipt.date) {
          mergedReceipt.date = photoData.date;
        }
        
        // Sum totals if auto-merge is enabled
        if (autoMerge) {
          mergedReceipt.total += photoData.total || 0;
        }
        
        // For items, we need to be careful about duplication
        if (photoData.items && photoData.items.length > 0) {
          // Simply add all items with new IDs to avoid duplication concerns
          // Users can review and remove duplicates in the edit screen
          const newItems = photoData.items.map(item => ({
            ...item,
            id: uuidv4() // Assign new IDs to avoid conflicts
          }));
          
          mergedReceipt.items = [...mergedReceipt.items, ...newItems];
        }
        
        // For other fields, prefer the non-empty value
        mergedReceipt.currency = mergedReceipt.currency || photoData.currency;
        mergedReceipt.merchantAddress = mergedReceipt.merchantAddress || photoData.merchantAddress;
        mergedReceipt.merchantPhone = mergedReceipt.merchantPhone || photoData.merchantPhone;
        mergedReceipt.paymentMethod = mergedReceipt.paymentMethod || photoData.paymentMethod;
        mergedReceipt.taxAmount = (mergedReceipt.taxAmount || 0) + (photoData.taxAmount || 0);
      }
      
      setProgress(80);
      
      // Save the merged receipt
      const receiptId = await onAddReceipt(mergedReceipt);
      
      setProgress(100);
      
      // Navigate to the receipt detail page
      if (receiptId) {
        navigate(`/receipt/${receiptId}?edit=true`);
      }
    } catch (error) {
      console.error('Error merging receipt:', error);
      setError('Failed to merge receipt data');
    } finally {
      setIsMerging(false);
    }
  };
  
  // Dropzone setup
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      
      acceptedFiles.forEach(file => {
        addPhoto(file);
      });
    },
    [scanMode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    disabled: isProcessing,
  });
  
  // Preview modal for a photo
  const renderPreviewModal = () => {
    if (!showPreviewModal) return null;
    
    const photo = photos.find(p => p.id === showPreviewModal);
    if (!photo) return null;
    
    return (
      <Modal
        open={!!showPreviewModal}
        onCancel={() => setShowPreviewModal(null)}
        footer={null}
        width={800}
        title="Receipt Photo Preview"
      >
        <Image
          src={photo.imageData}
          alt="Receipt preview"
          style={{ width: '100%' }}
        />
      </Modal>
    );
  };
  
  // Determine if we can merge
  const canMerge = photos.length > 0 && 
    photos.some(photo => photo.processingStatus === 'completed');
  
  // Determine if all photos are processed
  const allProcessed = photos.length > 0 && 
    photos.every(photo => 
      photo.processingStatus === 'completed' || 
      photo.processingStatus === 'error'
    );

  return (
    <div className="multi-photo-receipt-scanner-container">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card bordered={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              {!hideTitle && <Title level={4}>Multi-Photo Receipt Scanner</Title>}
              <Radio.Group 
                value={scanMode} 
                onChange={(e) => setScanMode(e.target.value)}
                disabled={isProcessing || photos.length > 0}
                buttonStyle="solid"
              >
                <Tooltip title="Process with Mindee Cloud API (best accuracy)">
                  <Radio.Button value="mindee">
                    <CloudOutlined /> Mindee API
                  </Radio.Button>
                </Tooltip>
                <Tooltip title="Create a blank receipt for manual editing">
                  <Radio.Button value="manual">
                    <FormOutlined /> Manual
                  </Radio.Button>
                </Tooltip>
              </Radio.Group>
            </div>
            
            <Paragraph>
              {photos.length === 0 ? (
                <>
                  For long receipts that don't fit in a single photo, you can add multiple photos.
                  {scanMode === 'mindee' 
                    ? ' We\'ll process each image separately and then merge the results intelligently.'
                    : ' We\'ll create a receipt that you can edit manually with data from all the parts.'}
                </>
              ) : (
                <>
                  {photos.filter(p => p.processingStatus === 'completed').length} of {photos.length} photos processed.
                  {allProcessed ? ' Ready to merge!' : ' Processing photos...'}
                </>
              )}
            </Paragraph>
            
            {error && (
              <Alert 
                message="Error" 
                description={error} 
                type="error" 
                showIcon 
                closable 
                style={{ marginBottom: 16 }}
                icon={<CloseCircleOutlined />}
                onClose={() => setError(null)}
              />
            )}
            
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${isProcessing ? 'opacity-50' : ''}`}
              style={{ 
                pointerEvents: isProcessing ? 'none' : 'auto',
                minHeight: 160,
                border: '2px dashed #d9d9d9',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.3s',
                borderColor: isDragActive ? '#1890ff' : '#d9d9d9',
                backgroundColor: isDragActive ? '#f0f8ff' : 'transparent'
              }}
            >
              <input {...getInputProps()} />
              
              {isProcessing ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin
                    indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
                  />
                  <p style={{ marginTop: 16 }}>Processing receipt... {progress}%</p>
                  
                  <Progress percent={progress} status="active" />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <CameraOutlined style={{ fontSize: 48, color: '#40a9ff' }} />
                  <p style={{ marginTop: 16, fontSize: 16 }}>
                    Drag and drop receipt photos here, or click to select files
                  </p>
                  <p style={{ color: '#888' }}>
                    Supports PNG, JPG, or WEBP up to 5MB
                  </p>
                </div>
              )}
            </div>
            
            {photos.length > 0 && (
              <>
                <Divider orientation="left">Receipt Photos ({photos.length})</Divider>
                
                <List
                  grid={{ gutter: 16, column: 2 }}
                  dataSource={photos}
                  renderItem={(photo) => (
                    <List.Item>
                      <Card 
                        hoverable 
                        size="small"
                        cover={
                          <div 
                            style={{ 
                              height: 120, 
                              overflow: 'hidden', 
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              background: '#f0f0f0',
                              cursor: 'pointer'
                            }}
                            onClick={() => setShowPreviewModal(photo.id)}
                          >
                            <img 
                              alt="Receipt" 
                              src={photo.imageData} 
                              style={{ maxHeight: 120, maxWidth: '100%' }}
                            />
                          </div>
                        }
                        actions={[
                          <EyeOutlined key="view" onClick={() => setShowPreviewModal(photo.id)} />,
                          photo.processingStatus === 'pending' ? (
                            <ScanOutlined key="process" onClick={() => processPhoto(photo.id)} />
                          ) : photo.processingStatus === 'error' ? (
                            <ScanOutlined key="retry" onClick={() => processPhoto(photo.id)} />
                          ) : null,
                          <DeleteOutlined key="delete" onClick={() => removePhoto(photo.id)} />
                        ].filter(Boolean)}
                      >
                        <Card.Meta
                          title={`Photo ${photos.indexOf(photo) + 1}`}
                          description={
                            <div>
                              <div>Status: {
                                photo.processingStatus === 'pending' ? 'Pending' :
                                photo.processingStatus === 'processing' ? 'Processing...' :
                                photo.processingStatus === 'completed' ? 'Processed' :
                                'Error'
                              }</div>
                              {photo.processingStatus === 'completed' && photo.extractedData && (
                                <div style={{ fontSize: '12px', color: '#888' }}>
                                  {photo.extractedData.storeName && (
                                    <div>Store: {photo.extractedData.storeName}</div>
                                  )}
                                  {photo.extractedData.total !== undefined && (
                                    <div>Total: {photo.extractedData.total}</div>
                                  )}
                                  {photo.extractedData.items && (
                                    <div>Items: {photo.extractedData.items.length}</div>
                                  )}
                                </div>
                              )}
                              {photo.processingStatus === 'error' && (
                                <div style={{ color: 'red' }}>{photo.error}</div>
                              )}
                            </div>
                          }
                        />
                      </Card>
                    </List.Item>
                  )}
                />
              </>
            )}
            
            {photos.length > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px dashed #d9d9d9'
              }}>
                <Button 
                  onClick={processAllPhotos}
                  disabled={photos.every(p => p.processingStatus !== 'pending')}
                  loading={photos.some(p => p.processingStatus === 'processing')}
                  icon={<ScanOutlined />}
                >
                  Process All Photos
                </Button>
                
                <Space>
                  <div>
                    <Tooltip title="When enabled, we'll automatically merge items and totals. You can review for duplicates after merging.">
                      <Switch 
                        checkedChildren="Auto-merge" 
                        unCheckedChildren="Manual merge"
                        checked={autoMerge}
                        onChange={setAutoMerge}
                        style={{ marginRight: 8 }}
                      />
                    </Tooltip>
                    Auto-merge
                  </div>
                  
                  <Button 
                    type="primary"
                    onClick={mergeReceipt}
                    disabled={!canMerge}
                    icon={<MergeCellsOutlined />}
                    loading={isMerging}
                  >
                    Merge & Continue
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card bordered={false}>
            <Title level={5}>Multi-Photo Scanning Guide</Title>
            <Paragraph>
              <strong>When to use this feature:</strong>
            </Paragraph>
            <ul>
              <li>Long receipts that don't fit in a single photo</li>
              <li>Double-sided receipts</li>
              <li>Receipts with continuation pages</li>
            </ul>
            
            <Paragraph>
              <strong>How to take good receipt photos:</strong>
            </Paragraph>
            <ul>
              <li>Use good lighting to avoid shadows</li>
              <li>Keep the receipt flat and unwrinkled</li>
              <li>Make sure all text is legible</li>
              <li>For long receipts, take overlapping photos to ensure no information is missed</li>
            </ul>
            
            <Paragraph>
              <strong>After merging:</strong>
            </Paragraph>
            <ul>
              <li>Review the merged data carefully</li>
              <li>Check for and remove duplicate items</li>
              <li>Verify the total amount is correct</li>
            </ul>
            
            <Collapse ghost style={{ marginTop: 16 }}>
              <Panel header="Advanced Tips" key="1">
                <ul>
                  <li>For best results, make sure each photo section has clear item entries</li>
                  <li>If the receipt has a barcode or QR code, include it in at least one photo</li>
                  <li>If auto-merge is enabled, the total will be calculated by summing all detected totals</li>
                  <li>If auto-merge is disabled, only the first detected total will be used</li>
                  <li>You can always edit the final receipt to correct any issues</li>
                </ul>
              </Panel>
            </Collapse>
          </Card>
        </Col>
      </Row>
      
      {renderPreviewModal()}
    </div>
  );
};

export default MultiPhotoReceiptScanner;