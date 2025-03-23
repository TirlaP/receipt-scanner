import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Table, 
  Tag, 
  Button, 
  Select, 
  DatePicker, 
  Empty, 
  Typography,
  Space,
  Segmented,
  Alert
} from 'antd';
import { 
  DollarOutlined, 
  FileTextOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  TagOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { format, subMonths, isAfter } from 'date-fns';
import { RangePickerProps } from 'antd/es/date-picker';

import { Receipt } from '../types';
import SpendingTrendChart from '../components/charts/SpendingTrendChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import TopStoresChart from '../components/charts/TopStoresChart';
import { useAuth } from '../contexts/AuthContext';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface EnhancedDashboardProps {
  receipts: Receipt[];
}

const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({ receipts }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [currency, setCurrency] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [timeFrame, setTimeFrame] = useState<'all' | '30days' | '90days' | '12months'>('30days');
  const [storeChartType, setStoreChartType] = useState<'pie' | 'column'>('pie');
  
  // Get all unique currencies
  const currencies = Array.from(new Set(receipts.map(r => r.currency || 'Unknown')));
  
  // Calculate date range based on time frame
  const calculatedDateRange = useMemo(() => {
    const now = new Date();
    if (timeFrame === '30days') {
      return [subMonths(now, 1), now] as [Date, Date];
    } else if (timeFrame === '90days') {
      return [subMonths(now, 3), now] as [Date, Date];
    } else if (timeFrame === '12months') {
      return [subMonths(now, 12), now] as [Date, Date];
    }
    return null;
  }, [timeFrame]);
  
  // Use explicit date range if set, otherwise use calculated range
  const effectiveDateRange = dateRange || calculatedDateRange;
  
  // Filter receipts by selected criteria
  const filteredReceipts = receipts.filter(receipt => {
    // Filter by currency
    if (currency && receipt.currency !== currency) {
      return false;
    }
    
    // Filter by date range
    if (effectiveDateRange) {
      const receiptDate = new Date(receipt.date);
      return receiptDate >= effectiveDateRange[0] && receiptDate <= effectiveDateRange[1];
    }
    
    return true;
  });
  
  // Calculate recent receipts (last 30 days)
  const recentReceipts = receipts.filter(receipt => {
    const receiptDate = new Date(receipt.date);
    return isAfter(receiptDate, subMonths(new Date(), 1));
  });
  
  // Calculate total spending for each currency
  const totalSpendingByCurrency: Record<string, number> = {};
  filteredReceipts.forEach(receipt => {
    const curr = receipt.currency || 'Unknown';
    totalSpendingByCurrency[curr] = (totalSpendingByCurrency[curr] || 0) + receipt.total;
  });
  
  // Calculate recent spending for each currency
  const recentSpendingByCurrency: Record<string, number> = {};
  recentReceipts.forEach(receipt => {
    const curr = receipt.currency || 'Unknown';
    recentSpendingByCurrency[curr] = (recentSpendingByCurrency[curr] || 0) + receipt.total;
  });
  
  // Extract information about receipt items
  const itemStats = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    let totalItems = 0;
    let uniqueItems = new Set<string>();
    
    filteredReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        totalItems += 1;
        uniqueItems.add(item.name.toLowerCase());
        
        const category = item.category || 'Uncategorized';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    });
    
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));
    
    return {
      totalItems,
      uniqueItems: uniqueItems.size,
      topCategories
    };
  }, [filteredReceipts]);
  
  // Handle date range change
  const handleDateRangeChange: RangePickerProps['onChange'] = (dates) => {
    if (dates) {
      setDateRange([dates[0]!.toDate(), dates[1]!.toDate()]);
      setTimeFrame('all'); // Switch to "All time" when custom date range is selected
    } else {
      setDateRange(null);
    }
  };
  
  // Table columns
  const columns = [
    {
      title: 'Store',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: Date) => format(new Date(date), 'dd MMM yyyy'),
      sorter: (a: Receipt, b: Receipt) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      responsive: ['md'],
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number, record: Receipt) => (
        <span>
          {total.toFixed(2)} {record.currency || ''}
        </span>
      ),
      sorter: (a: Receipt, b: Receipt) => a.total - b.total,
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: any[]) => items.length,
      responsive: ['lg'],
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">Processed</Tag>,
      responsive: ['lg'],
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record: Receipt) => (
        <Button type="link" onClick={() => navigate(`/receipt/${record.id}`)}>
          View
        </Button>
      ),
    },
  ];
  
  // Get the currency symbol for display
  const getCurrencySymbol = (currencyCode?: string) => {
    switch (currencyCode) {
      case 'RON': return 'lei';
      case 'EUR': return '€';
      case 'USD': return '$';
      default: return '';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Filters and quick actions */}
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card bordered={false} className="dashboard-filters">
            <Row gutter={16} align="middle">
              <Col xs={24} md={12} lg={8}>
                <Space style={{ marginBottom: { xs: 16, md: 0 }, width: '100%' }}>
                  <Select
                    placeholder="Currency"
                    style={{ width: '100%', minWidth: 120 }}
                    allowClear
                    onChange={(value) => setCurrency(value)}
                    value={currency || undefined}
                  >
                    {currencies.map(curr => (
                      <Option key={curr} value={curr}>
                        {curr} {getCurrencySymbol(curr)}
                      </Option>
                    ))}
                  </Select>
                  
                  <Segmented
                    options={[
                      { label: '30d', value: '30days' },
                      { label: '90d', value: '90days' },
                      { label: '1y', value: '12months' },
                      { label: 'All', value: 'all' },
                    ]}
                    value={timeFrame}
                    onChange={(value) => {
                      setTimeFrame(value as any);
                      setDateRange(null); // Clear custom date range
                    }}
                  />
                </Space>
              </Col>
              
              <Col xs={24} md={12} lg={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <RangePicker
                    onChange={handleDateRangeChange}
                    value={dateRange as any}
                    style={{ marginRight: 16 }}
                  />
                  
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/scan')}
                  >
                    Scan Receipt
                  </Button>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} onClick={() => navigate('/receipts')} style={{ cursor: 'pointer' }}>
            <Statistic
              title="Total Receipts"
              value={filteredReceipts.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Text type="secondary">
              {recentReceipts.length} in the last 30 days
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic
              title="Items Scanned"
              value={itemStats.totalItems}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary">
              {itemStats.uniqueItems} unique items
            </Text>
          </Card>
        </Col>
        
        {Object.entries(totalSpendingByCurrency).slice(0, 2).map(([curr, amount]) => (
          <Col xs={24} sm={12} lg={6} key={curr}>
            <Card bordered={false}>
              <Statistic
                title={`Total (${curr})`}
                value={amount}
                precision={2}
                prefix={<DollarOutlined />}
                suffix={getCurrencySymbol(curr)}
                valueStyle={{ color: '#fa8c16' }}
              />
              <Text type="secondary">
                {recentSpendingByCurrency[curr]?.toFixed(2) || 0} in the last 30 days
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* Main Content */}
      {filteredReceipts.length > 0 ? (
        <>
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card 
                bordered={false} 
                title={
                  <Space>
                    <LineChartOutlined />
                    <span>Spending Trend</span>
                    {currency && <Tag color="blue">{currency}</Tag>}
                  </Space>
                }
              >
                <SpendingTrendChart receipts={filteredReceipts} currency={currency} />
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card 
                bordered={false} 
                title={
                  <Space>
                    <PieChartOutlined />
                    <span>Top Stores</span>
                    {currency && <Tag color="blue">{currency}</Tag>}
                  </Space>
                }
                extra={
                  <Segmented
                    options={[
                      {
                        value: 'pie',
                        icon: <PieChartOutlined />,
                      },
                      {
                        value: 'column',
                        icon: <BarChartOutlined />,
                      },
                    ]}
                    value={storeChartType}
                    onChange={(value) => setStoreChartType(value as 'pie' | 'column')}
                  />
                }
              >
                <TopStoresChart 
                  receipts={filteredReceipts} 
                  currency={currency} 
                  type={storeChartType}
                />
              </Card>
            </Col>
          </Row>
          
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card 
                bordered={false} 
                title={
                  <Space>
                    <TagOutlined />
                    <span>Spending by Category</span>
                    {currency && <Tag color="blue">{currency}</Tag>}
                  </Space>
                }
              >
                <CategoryPieChart receipts={filteredReceipts} currency={currency} />
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card 
                bordered={false} 
                title={
                  <Space>
                    <AppstoreOutlined />
                    <span>Recent Receipts</span>
                  </Space>
                }
                extra={
                  <Button type="link" onClick={() => navigate('/receipts')} icon={<ArrowRightOutlined />}>
                    View All
                  </Button>
                }
              >
                <Table
                  columns={columns}
                  dataSource={filteredReceipts.slice(0, 5)}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  onRow={(record) => ({
                    onClick: () => navigate(`/receipt/${record.id}`),
                    style: { cursor: 'pointer' }
                  })}
                />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card bordered={false}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center">
                    <Text>No receipts found for the selected filters.</Text>
                    <Text type="secondary">Try adjusting your filter criteria or scan a new receipt.</Text>
                  </Space>
                }
              >
                <Button type="primary" onClick={() => navigate('/scan')}>
                  Scan New Receipt
                </Button>
              </Empty>
            </Card>
          </Col>
        </Row>
      )}
      
      {/* Cloud Sync Status */}
      {currentUser && (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Alert
              type="info"
              showIcon
              message="Your receipts are synced to the cloud"
              description={
                <Text type="secondary">
                  Logged in as {currentUser.email}. Your data is securely backed up and available on all your devices.
                </Text>
              }
              action={
                <Button size="small" onClick={() => navigate('/settings')}>
                  Settings
                </Button>
              }
            />
          </Col>
        </Row>
      )}
    </div>
  );
};

export default EnhancedDashboard;