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
  Tooltip
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
  QuestionCircleOutlined
} from '@ant-design/icons';

import { Receipt } from '../types';
import { fileService } from '../services/file-service';
import mindeeService from '../services/mindee-service';
import { fallbackParser } from '../services/fallback-parser';

const { Title, Text, Paragraph } = Typography;

interface ReceiptScannerProps {
  onAddReceipt: (receipt: Receipt) => Promise<string | null>;
  hideTitle?: boolean;
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onAddReceipt, hideTitle = false }) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'mindee' | 'manual'>('mindee');

  const processReceipt = async (file: File) => {
    try {
      setIsProcessing(true);
      setProgress(10);
      setProcessingStep(0);
      setError(null);

      // Step 1: Validate file
      if (!fileService.isValidImage(file)) {
        setError('Please upload a valid image file (PNG, JPEG, or WEBP)');
        setIsProcessing(false);
        return;
      }

      if (!fileService.isValidSize(file)) {
        setError('File is too large. Maximum size is 5MB');
        setIsProcessing(false);
        return;
      }

      // Step 2: Convert to base64
      setProgress(20);
      setProcessingStep(1);
      const imageData = await fileService.fileToBase64(file);
      setPreview(imageData);

      let receipt: Receipt;

      // Step 3: Process with selected method
      try {
        setProgress(40);
        setProcessingStep(2);
        
        if (scanMode === 'mindee') {
          // Process with Mindee API
          receipt = await mindeeService.processReceipt(imageData);
        } else {
          // Manual mode - create blank receipt
          receipt = fallbackParser.createFallbackReceipt(imageData);
        }
      } catch (ocrError) {
        console.error('OCR Error:', ocrError);
        setError('Processing failed. Creating a basic receipt for manual editing.');
        
        // Fall back to manual
        receipt = fallbackParser.createFallbackReceipt(imageData);
      }
      
      // Step 4: Save processed receipt
      setProgress(80);
      setProcessingStep(3);
      
      const receiptId = await onAddReceipt(receipt);
      
      // Step 5: Complete
      setProgress(100);
      setProcessingStep(4);
      
      // Navigate to the receipt detail page
      if (receiptId) {
        setTimeout(() => {
          navigate(`/receipt/${receiptId}`);
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      // Keep processing state for a moment to show completion
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      
      const file = acceptedFiles[0];
      processReceipt(file);
    },
    [onAddReceipt, scanMode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  // Define step titles and icons based on scan mode
  const getProcessingStepItems = () => {
    const baseSteps = [
      {
        title: 'Validating file',
        description: 'Checking file type and size',
        icon: processingStep === 0 ? <LoadingOutlined /> : <CheckCircleOutlined />
      },
      {
        title: 'Preparing image',
        description: 'Converting for processing',
        icon: processingStep === 1 ? <LoadingOutlined /> : 
              processingStep > 1 ? <CheckCircleOutlined /> : <FileImageOutlined />
      }
    ];
    
    // Add step based on scan mode
    if (scanMode === 'mindee') {
      baseSteps.push({
        title: 'Cloud API Processing',
        description: 'Analyzing with Mindee API',
        icon: processingStep === 2 ? <LoadingOutlined /> :
              processingStep > 2 ? <CheckCircleOutlined /> : <CloudOutlined />
      });
    } else {
      baseSteps.push({
        title: 'Creating Receipt',
        description: 'Setting up basic structure',
        icon: processingStep === 2 ? <LoadingOutlined /> :
              processingStep > 2 ? <CheckCircleOutlined /> : <FormOutlined />
      });
    }
    
    // Add final steps
    baseSteps.push(
      {
        title: 'Saving data',
        description: 'Storing receipt information',
        icon: processingStep === 3 ? <LoadingOutlined /> : 
              processingStep > 3 ? <CheckCircleOutlined /> : <ScanOutlined />
      },
      {
        title: 'Complete',
        description: 'Receipt processed successfully',
        icon: processingStep === 4 ? <CheckCircleOutlined /> : <FormOutlined />
      }
    );
    
    return baseSteps;
  };

  return (
    <div className="receipt-scanner-container">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card bordered={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              {!hideTitle && <Title level={4}>Scan Receipt</Title>}
              <Radio.Group 
                value={scanMode} 
                onChange={(e) => setScanMode(e.target.value)}
                disabled={isProcessing}
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
              {scanMode === 'mindee' 
                ? 'Upload a receipt image and we\'ll use the Mindee API to automatically extract all details.'
                : 'Upload a receipt image and we\'ll create a blank receipt for manual editing.'}
              <br />
              {!hideTitle && (
                <Text>For long receipts that don't fit in one photo, use the <strong>Multiple Photos</strong> tab above.</Text>
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
              />
            )}
            
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${isProcessing ? 'opacity-50' : ''}`}
              style={{ 
                pointerEvents: isProcessing ? 'none' : 'auto',
                minHeight: 200,
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
                  <InboxOutlined style={{ fontSize: 48, color: '#40a9ff' }} />
                  <p style={{ marginTop: 16, fontSize: 16 }}>
                    Drag and drop a receipt image here, or click to select file
                  </p>
                  <p style={{ color: '#888' }}>
                    Supports PNG, JPG, or WEBP up to 5MB
                  </p>
                </div>
              )}
            </div>
            
            {preview && (
              <>
                <Divider>Receipt Preview</Divider>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Image
                    src={preview}
                    alt="Receipt preview"
                    className="receipt-image-preview"
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                  />
                </div>
              </>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card bordered={false}>
            {isProcessing ? (
              <>
                <Title level={4}>Processing Status</Title>
                <Steps
                  direction="vertical"
                  current={processingStep}
                  items={getProcessingStepItems()}
                />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {scanMode === 'mindee' 
                      ? 'Mindee API Scanner'
                      : 'Manual Receipt Entry'}
                  </Title>
                  <Tooltip title="Need help choosing a mode?">
                    <QuestionCircleOutlined style={{ marginLeft: 8, color: '#1890ff' }} />
                  </Tooltip>
                </div>
                
                {scanMode === 'mindee' ? (
                  <>
                    <Paragraph>
                      The Mindee API offers the best accuracy and can extract:
                    </Paragraph>
                    <ul>
                      <li>Store name and address</li>
                      <li>Date and time of purchase</li>
                      <li>Total amount and taxes</li>
                      <li>Line items with prices</li>
                      <li>Currency and payment method</li>
                    </ul>
                    <Paragraph>
                      <strong>Note:</strong> This uses your Mindee API subscription (250 free pages).
                    </Paragraph>
                  </>
                ) : (
                  <Paragraph>
                    In manual mode, we'll create a blank receipt with your uploaded image that you can fill in yourself.
                    This is useful when you want full control over the data entry or if automatic extraction doesn't work well with your receipt format.
                  </Paragraph>
                )}
                
                <Divider />
                <Title level={5}>Tips for Best Results</Title>
                <ul>
                  <li>Ensure good lighting when taking the photo</li>
                  <li>Avoid shadows and glare on the receipt</li>
                  <li>Capture the entire receipt in one image</li>
                  <li>Keep the receipt flat and unwrinkled</li>
                </ul>
              </>
            )}
          </Card>
          
          {!isProcessing && (
            <Card bordered={false} style={{ marginTop: 16 }}>
              <Title level={5}>Mode Comparison</Title>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Mindee API:</Text> Highest accuracy, uses API quota (250 free pages)
              </div>
              <div>
                <Text strong>Manual:</Text> No automatic extraction, complete control over data entry
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ReceiptScanner;