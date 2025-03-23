import React, { useState } from 'react';
import { Tabs, Card, Typography } from 'antd';
import { 
  CameraOutlined,
  PictureOutlined
} from '@ant-design/icons';
import ReceiptScanner from './ReceiptScanner';
import MultiPhotoReceiptScanner from './MultiPhotoReceiptScanner';
import { Receipt } from '../types';

const { Title } = Typography;

interface CombinedReceiptScannerProps {
  onAddReceipt: (receipt: Receipt) => Promise<string | null>;
}

const CombinedReceiptScanner: React.FC<CombinedReceiptScannerProps> = ({ onAddReceipt }) => {
  const [activeTab, setActiveTab] = useState('single');
  
  // Log when this component mounts and when tabs are changed
  React.useEffect(() => {
    console.log('CombinedReceiptScanner mounted');
  }, []);
  
  const handleTabChange = (newTab: string) => {
    console.log(`Switching to scanner tab: ${newTab}`);
    setActiveTab(newTab);
  };

  return (
    <div className="combined-scanner-container">
      <Card
        title={<Title level={4}>Receipt Scanner</Title>}
        bordered={false}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          type="card"
          items={[
            {
              key: 'single',
              label: (
                <span>
                  <CameraOutlined /> Single Photo
                </span>
              ),
              children: <ReceiptScanner onAddReceipt={onAddReceipt} hideTitle />
            },
            {
              key: 'multi',
              label: (
                <span>
                  <PictureOutlined /> Multiple Photos
                </span>
              ),
              children: <MultiPhotoReceiptScanner onAddReceipt={onAddReceipt} hideTitle />
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default CombinedReceiptScanner;