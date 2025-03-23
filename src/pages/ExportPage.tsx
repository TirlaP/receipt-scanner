import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  DatePicker, 
  Checkbox, 
  Select, 
  Button, 
  Typography, 
  Divider,
  message,
  Alert,
  Row,
  Col,
  Radio,
  Tooltip
} from 'antd';
import { 
  DownloadOutlined, 
  FileExcelOutlined, 
  FileTextOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { RangePickerProps } from 'antd/es/date-picker';

import { Receipt, ExportOptions } from '../types';
import { fileService } from '../services/file-service';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ExportPageProps {
  receipts: Receipt[];
}

const ExportPage: React.FC<ExportPageProps> = ({ receipts }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileFormat, setFileFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [includeItems, setIncludeItems] = useState(true);
  
  // Count receipts in selected date range
  const [selectedDateRange, setSelectedDateRange] = useState<[Date, Date] | null>(null);
  
  // Filter receipts by selected date range
  const filteredReceipts = receipts.filter(receipt => {
    if (!selectedDateRange) return true;
    
    const receiptDate = new Date(receipt.date);
    return receiptDate >= selectedDateRange[0] && receiptDate <= selectedDateRange[1];
  });
  
  // Get all unique currencies
  const currencies = Array.from(new Set(receipts.map(r => r.currency || 'Unknown')));
  
  // Count spending by currency
  const spendingByCurrency: Record<string, number> = {};
  filteredReceipts.forEach(receipt => {
    const currency = receipt.currency || 'Unknown';
    spendingByCurrency[currency] = (spendingByCurrency[currency] || 0) + receipt.total;
  });

  const handleExport = async (values: any) => {
    try {
      setLoading(true);
      
      const exportOptions: ExportOptions = {
        filename: values.filename || `receipts-export-${new Date().toISOString().slice(0, 10)}`,
        includeItems,
        groupBy: values.groupBy || 'none',
        fileFormat: fileFormat,
        ...(selectedDateRange && { dateRange: { startDate: selectedDateRange[0], endDate: selectedDateRange[1] } })
      };
      
      await fileService.exportReceipts(filteredReceipts, exportOptions);
      
      message.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange: RangePickerProps['onChange'] = (dates) => {
    if (dates) {
      setSelectedDateRange([dates[0]!.toDate(), dates[1]!.toDate()]);
    } else {
      setSelectedDateRange(null);
    }
  };

  return (
    <div className="export-page-container">
      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card bordered={false}>
            <Title level={4}>Export Receipt Data</Title>
            <Paragraph>
              Export your receipt data to Excel or CSV format. You can customize the output
              by selecting dates, grouping options, and more.
            </Paragraph>
            
            <Form
              form={form}
              layout="vertical"
              onFinish={handleExport}
              initialValues={{
                groupBy: 'none',
                filename: `receipts-export-${new Date().toISOString().slice(0, 10)}`
              }}
            >
              <Form.Item
                name="filename"
                label="Export Filename"
                rules={[{ required: true, message: 'Please enter a filename' }]}
              >
                <Input 
                  addonAfter={`.${fileFormat}`} 
                  placeholder="receipts-export"
                />
              </Form.Item>
              
              <Form.Item
                label="Date Range"
                name="dateRange"
              >
                <RangePicker 
                  style={{ width: '100%' }} 
                  onChange={handleDateRangeChange} 
                />
              </Form.Item>
              
              <Form.Item
                name="fileFormat"
                label="File Format"
              >
                <Radio.Group 
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                >
                  <Radio.Button value="xlsx">
                    <FileExcelOutlined /> Excel (.xlsx)
                  </Radio.Button>
                  <Radio.Button value="csv">
                    <FileTextOutlined /> CSV (.csv)
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>
              
              <Form.Item
                name="groupBy"
                label="Group By"
              >
                <Select>
                  <Option value="none">No Grouping</Option>
                  <Option value="store">Store</Option>
                  <Option value="date">Month</Option>
                  <Option value="currency">Currency</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                label={
                  <span>
                    Include Items
                    <Tooltip title="When enabled, each receipt item will be included in the export. Receipt totals will only appear once per receipt.">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </span>
                }
              >
                <Checkbox 
                  checked={includeItems} 
                  onChange={(e) => setIncludeItems(e.target.checked)}
                >
                  Include detailed item breakdown
                </Checkbox>
              </Form.Item>
              
              <Form.Item>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  htmlType="submit"
                  loading={loading}
                  disabled={filteredReceipts.length === 0}
                >
                  Export Data
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Title level={5}>Export Summary</Title>
            <Paragraph>
              <Text strong>Receipts to Export: </Text>
              <Text>{filteredReceipts.length}</Text>
            </Paragraph>
            
            <Divider />
            
            {Object.entries(spendingByCurrency).length > 0 ? (
              <>
                <Title level={5}>Spending by Currency</Title>
                {Object.entries(spendingByCurrency).map(([currency, amount]) => (
                  <div key={currency} style={{ marginBottom: 8 }}>
                    <Text strong>{currency}: </Text>
                    <Text>{amount.toFixed(2)}</Text>
                  </div>
                ))}
              </>
            ) : (
              <Alert
                message="No Data Selected"
                description="Please select a date range to see spending summary."
                type="info"
                showIcon
              />
            )}
            
            <Divider />
            
            <Title level={5}>Export Format Details</Title>
            <Paragraph>
              <Text strong>Excel (.xlsx): </Text>
              Full-featured export with multiple sheets for grouped data.
            </Paragraph>
            <Paragraph>
              <Text strong>CSV (.csv): </Text>
              Simple format compatible with most applications. No grouping support.
            </Paragraph>
            
            {fileFormat === 'csv' && form.getFieldValue('groupBy') !== 'none' && (
              <Alert
                message="Note about CSV exports"
                description="CSV format supports only a single sheet of data. When grouping is enabled, only the first group will be exported."
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
            
            {includeItems && (
              <Alert
                message="Note about item exports"
                description="When exporting with items, receipt totals will only appear once per receipt to avoid duplication."
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExportPage;