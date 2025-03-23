import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Modal,
  FloatButton
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
  CameraOutlined,
  CloseOutlined,
  SwapOutlined
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
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Check if running on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobileDevice(isMobile);
    };
    
    checkMobile();
  }, []);
  
  // Handle camera setup and cleanup
  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else if (streamRef.current) {
      stopCamera();
    }
    
    return () => {
      if (streamRef.current) {
        stopCamera();
      }
    };
  }, [cameraActive, facingMode]);
  
  // Start the camera
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        stopCamera();
      }
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraActive(false);
    }
  };
  
  // Stop the camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };
  
  // Toggle camera on/off
  const toggleCamera = () => {
    setCameraActive(!cameraActive);
  };
  
  // Toggle between front/back camera
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };
  
  // Capture a photo from the camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setPreview(imageData);
    setCameraActive(false);
    
    // Convert base64 to File for processing
    fileService.base64ToFile(imageData, 'camera-capture.jpg')
      .then(file => {
        processReceipt(file);
      })
      .catch(err => {
        console.error('Error creating file from image:', err);
        setError('Failed to process camera image.');
      });
  };

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

  // Render the camera view for mobile devices
  const renderCameraView = () => {
    return (
      <Modal
        open={cameraActive}
        closable={false}
        footer={null}
        width="100%"
        bodyStyle={{ padding: 0, height: '100vh', position: 'relative' }}
        className="mobile-camera-modal"
        maskClosable={false}
        centered
        styles={{
          mask: { backdropFilter: 'blur(4px)' },
          body: { height: '100vh', overflow: 'hidden' }
        }}
      >
        <div className="mobile-camera-container">
          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          
          {/* Video preview */}
          <video 
            ref={videoRef} 
            className="camera-preview" 
            autoPlay 
            playsInline
          />
          
          {/* Camera controls */}
          <div className="camera-controls">
            <Button 
              className="close-camera-button"
              shape="circle" 
              icon={<CloseOutlined />} 
              onClick={() => setCameraActive(false)}
              size="large"
            />
            
            <Button
              className="mobile-camera-button"
              shape="circle"
              size="large"
              onClick={capturePhoto}
              icon={<CameraOutlined style={{ fontSize: 24 }} />}
            />
            
            <Button
              className="switch-camera-button"
              shape="circle"
              icon={<SwapOutlined />}
              onClick={toggleCameraFacing}
              size="large"
            />
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="receipt-scanner-container">
      {/* Render camera UI when active */}
      {renderCameraView()}
      
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card bordered={false} className="rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              {!hideTitle && <Title level={4} className="m-0">Scan Receipt</Title>}
              <Radio.Group 
                value={scanMode} 
                onChange={(e) => setScanMode(e.target.value)}
                disabled={isProcessing}
                buttonStyle="solid"
                size={isMobileDevice ? "middle" : "large"}
                className="w-full sm:w-auto"
              >
                <Tooltip title="Process with Mindee Cloud API (best accuracy)">
                  <Radio.Button value="mindee" className="w-1/2 sm:w-auto text-center">
                    <CloudOutlined /> <span className="hidden sm:inline">Mindee API</span>
                  </Radio.Button>
                </Tooltip>
                <Tooltip title="Create a blank receipt for manual editing">
                  <Radio.Button value="manual" className="w-1/2 sm:w-auto text-center">
                    <FormOutlined /> <span className="hidden sm:inline">Manual</span>
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
            
            {/* Mobile Camera Button */}
            {isMobileDevice && !isProcessing && (
              <div className="mobile-camera-button-container mb-4 flex justify-center">
                <Button 
                  type="primary" 
                  icon={<CameraOutlined />} 
                  size="large"
                  onClick={toggleCamera}
                  className="w-full sm:w-auto"
                >
                  Take Photo with Camera
                </Button>
              </div>
            )}
            
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${isProcessing ? 'opacity-50' : ''} 
                          rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-colors
                          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-transparent'}`}
              style={{ pointerEvents: isProcessing ? 'none' : 'auto' }}
            >
              <input {...getInputProps()} />
              
              {isProcessing ? (
                <div className="py-5 text-center">
                  <Spin
                    indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />}
                  />
                  <p className="mt-4">Processing receipt... {progress}%</p>
                  
                  <Progress percent={progress} status="active" />
                </div>
              ) : (
                <div className="py-5 text-center">
                  <InboxOutlined className="text-5xl text-blue-500" />
                  <p className="mt-4 text-base">
                    {isMobileDevice 
                      ? 'Tap to select a receipt image from your gallery' 
                      : 'Drag and drop a receipt image here, or click to select file'}
                  </p>
                  <p className="text-gray-500">
                    Supports PNG, JPG, or WEBP up to 5MB
                  </p>
                </div>
              )}
            </div>
            
            {preview && (
              <>
                <Divider>Receipt Preview</Divider>
                <div className="flex justify-center">
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
          <Card bordered={false} className="rounded-lg shadow-sm">
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
                <div className="flex items-center mb-4">
                  <Title level={4} style={{ margin: 0 }}>
                    {scanMode === 'mindee' 
                      ? 'Mindee API Scanner'
                      : 'Manual Receipt Entry'}
                  </Title>
                  <Tooltip title="Need help choosing a mode?">
                    <QuestionCircleOutlined className="ml-2 text-blue-500" />
                  </Tooltip>
                </div>
                
                {scanMode === 'mindee' ? (
                  <>
                    <Paragraph>
                      The Mindee API offers the best accuracy and can extract:
                    </Paragraph>
                    <ul className="pl-5">
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
                <ul className="pl-5">
                  <li>Ensure good lighting when taking the photo</li>
                  <li>Avoid shadows and glare on the receipt</li>
                  <li>Capture the entire receipt in one image</li>
                  <li>Keep the receipt flat and unwrinkled</li>
                </ul>
              </>
            )}
          </Card>
          
          {!isProcessing && !isMobileDevice && (
            <Card bordered={false} className="mt-4 rounded-lg shadow-sm">
              <Title level={5}>Mode Comparison</Title>
              <div className="mb-2">
                <Text strong>Mindee API:</Text> Highest accuracy, uses API quota (250 free pages)
              </div>
              <div>
                <Text strong>Manual:</Text> No automatic extraction, complete control over data entry
              </div>
            </Card>
          )}
        </Col>
      </Row>
      
      {/* Help button */}
      <FloatButton
        icon={<QuestionCircleOutlined />}
        type="primary"
        style={{ right: 24, bottom: isMobileDevice ? 84 : 24 }}
        tooltip="Need help?"
      />
    </div>
  );
};

export default ReceiptScanner;