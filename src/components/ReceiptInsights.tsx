import React, { useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Divider, 
  List, 
  Tag,
  Empty,
  Tooltip,
  Statistic,
  Space,
  Progress,
  Badge
} from 'antd';
import {
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  FireOutlined,
  StarOutlined
} from '@ant-design/icons';
import { format, subDays, isAfter } from 'date-fns';

import { Receipt, ReceiptItem } from '../types';

const { Title, Text, Paragraph } = Typography;

interface ReceiptInsightsProps {
  receipts: Receipt[];
  selectedCurrency?: string;
}

interface ItemPriceHistory {
  name: string;
  prices: Array<{
    price: number;
    date: Date;
    store: string;
    receiptId: string;
  }>;
  priceChanges: Array<{
    oldPrice: number;
    newPrice: number;
    percentChange: number;
    date: Date;
    store: string;
    receiptId: string;
  }>;
}

const ReceiptInsights: React.FC<ReceiptInsightsProps> = ({ receipts, selectedCurrency }) => {
  // Filter receipts by currency if specified
  const filteredReceipts = selectedCurrency 
    ? receipts.filter(r => r.currency === selectedCurrency) 
    : receipts;
  
  // Get most frequent stores
  const storeFrequency = useMemo(() => {
    const stores: Record<string, { count: number, total: number, lastVisit: Date }> = {};
    
    filteredReceipts.forEach(receipt => {
      const store = receipt.storeName;
      if (!stores[store]) {
        stores[store] = { count: 0, total: 0, lastVisit: new Date(0) };
      }
      
      stores[store].count += 1;
      stores[store].total += receipt.total;
      
      const receiptDate = new Date(receipt.date);
      if (receiptDate > stores[store].lastVisit) {
        stores[store].lastVisit = receiptDate;
      }
    });
    
    return Object.entries(stores)
      .map(([store, data]) => ({
        store,
        count: data.count,
        total: data.total,
        lastVisit: data.lastVisit,
        avgSpend: data.total / data.count
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReceipts]);
  
  // Analyze items and their price history
  const itemPriceHistory = useMemo(() => {
    const itemsMap = new Map<string, ItemPriceHistory>();
    
    // Process each receipt to build item price history
    filteredReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        // Normalize item name (lowercase, trim)
        const normalizedName = item.name.toLowerCase().trim();
        
        if (!itemsMap.has(normalizedName)) {
          itemsMap.set(normalizedName, {
            name: item.name,
            prices: [],
            priceChanges: []
          });
        }
        
        const historyEntry = itemsMap.get(normalizedName)!;
        
        // Add this price point
        historyEntry.prices.push({
          price: item.price,
          date: new Date(receipt.date),
          store: receipt.storeName,
          receiptId: receipt.id
        });
      });
    });
    
    // Sort prices by date and compute price changes
    itemsMap.forEach(history => {
      // Sort prices by date (oldest first)
      history.prices.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Calculate price changes
      for (let i = 1; i < history.prices.length; i++) {
        const oldPrice = history.prices[i - 1].price;
        const newPrice = history.prices[i].price;
        
        // Only include if same store and price changed
        if (history.prices[i].store === history.prices[i - 1].store && oldPrice !== newPrice) {
          const percentChange = ((newPrice - oldPrice) / oldPrice) * 100;
          
          history.priceChanges.push({
            oldPrice,
            newPrice,
            percentChange,
            date: history.prices[i].date,
            store: history.prices[i].store,
            receiptId: history.prices[i].receiptId
          });
        }
      }
    });
    
    return itemsMap;
  }, [filteredReceipts]);
  
  // Extract significant price changes
  const priceChanges = useMemo(() => {
    const allChanges: Array<{
      item: string;
      store: string;
      oldPrice: number;
      newPrice: number;
      percentChange: number;
      date: Date;
      receiptId: string;
    }> = [];
    
    itemPriceHistory.forEach((history, itemName) => {
      history.priceChanges.forEach(change => {
        allChanges.push({
          item: history.name,
          store: change.store,
          oldPrice: change.oldPrice,
          newPrice: change.newPrice,
          percentChange: change.percentChange,
          date: change.date,
          receiptId: change.receiptId
        });
      });
    });
    
    // Sort by absolute percent change (largest first)
    return allChanges.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));
  }, [itemPriceHistory]);
  
  // Get most purchased items
  const mostPurchasedItems = useMemo(() => {
    const items: Record<string, { count: number, totalSpent: number, category?: string }> = {};
    
    filteredReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const normalizedName = item.name.toLowerCase().trim();
        
        if (!items[normalizedName]) {
          items[normalizedName] = { 
            count: 0, 
            totalSpent: 0,
            category: item.category 
          };
        }
        
        items[normalizedName].count += 1;
        items[normalizedName].totalSpent += item.price * item.quantity;
      });
    });
    
    return Object.entries(items)
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalSpent: data.totalSpent,
        category: data.category
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReceipts]);
  
  // Calculate spending habits
  const spendingHabits = useMemo(() => {
    if (filteredReceipts.length === 0) return null;
    
    // Calculate average receipt totals
    const totals = filteredReceipts.map(r => r.total);
    const averageTotal = totals.reduce((sum, total) => sum + total, 0) / totals.length;
    
    // Find outlier receipts (significantly above average)
    const outliers = filteredReceipts
      .filter(r => r.total > averageTotal * 1.5)
      .sort((a, b) => b.total - a.total);
    
    // Find most recent receipt
    const mostRecent = [...filteredReceipts].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    // Calculate days since last purchase
    const daysSinceLastPurchase = Math.floor(
      (new Date().getTime() - new Date(mostRecent.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Check frequency of shopping (e.g., days between receipts)
    const dates = filteredReceipts
      .map(r => new Date(r.date).getTime())
      .sort((a, b) => a - b);
    
    const timeBetweenShops: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const daysBetween = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
      timeBetweenShops.push(daysBetween);
    }
    
    const averageShoppingFrequency = timeBetweenShops.length > 0 
      ? timeBetweenShops.reduce((sum, days) => sum + days, 0) / timeBetweenShops.length
      : 0;
    
    return {
      averageTotal,
      outliers,
      mostRecent,
      daysSinceLastPurchase,
      averageShoppingFrequency
    };
  }, [filteredReceipts]);
  
  if (filteredReceipts.length === 0) {
    return (
      <Card>
        <Empty 
          description="No receipts available for analysis"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }
  
  return (
    <div className="receipt-insights">
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <TrophyOutlined style={{ color: '#faad14' }} />
                <span>Shopping Habits</span>
              </Space>
            }
            bordered={false}
          >
            {spendingHabits && (
              <List
                itemLayout="horizontal"
                dataSource={[
                  {
                    title: 'Average Spending',
                    content: (
                      <Statistic 
                        value={spendingHabits.averageTotal.toFixed(2)} 
                        suffix={selectedCurrency} 
                        precision={2}
                      />
                    )
                  },
                  {
                    title: 'Shopping Frequency',
                    content: (
                      <Tooltip title="Average days between shopping trips">
                        <Space>
                          <Text strong>Every {Math.round(spendingHabits.averageShoppingFrequency)} days</Text>
                          <QuestionCircleOutlined />
                        </Space>
                      </Tooltip>
                    )
                  },
                  {
                    title: 'Most Visited Store',
                    content: storeFrequency.length > 0 ? (
                      <Space direction="vertical" size={0}>
                        <Text strong>{storeFrequency[0].store}</Text>
                        <Text type="secondary">
                          {storeFrequency[0].count} visits • Avg: {storeFrequency[0].avgSpend.toFixed(2)} {selectedCurrency}
                        </Text>
                      </Space>
                    ) : (
                      <Text>No data available</Text>
                    )
                  },
                  {
                    title: 'Last Purchase',
                    content: (
                      <Space direction="vertical" size={0}>
                        <Text strong>{format(new Date(spendingHabits.mostRecent.date), 'dd MMM yyyy')}</Text>
                        <Text type="secondary">
                          {spendingHabits.daysSinceLastPurchase} {spendingHabits.daysSinceLastPurchase === 1 ? 'day' : 'days'} ago
                        </Text>
                      </Space>
                    )
                  }
                ]}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.title}
                      description={item.content}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card 
            title={
              <Space>
                <FireOutlined style={{ color: '#cf1322' }} />
                <span>Most Purchased Items</span>
              </Space>
            }
            bordered={false}
          >
            <List
              size="small"
              dataSource={mostPurchasedItems.slice(0, 5)}
              renderItem={item => (
                <List.Item
                  extra={
                    <Space>
                      <Badge count={item.count} showZero color="#108ee9" />
                      <Tag color="green">{item.totalSpent.toFixed(2)} {selectedCurrency}</Tag>
                    </Space>
                  }
                >
                  <List.Item.Meta
                    title={item.name}
                    description={item.category && <Tag color="blue">{item.category}</Tag>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <RiseOutlined style={{ color: '#52c41a' }} />
                <FallOutlined style={{ color: '#f5222d' }} />
                <span>Price Changes</span>
              </Space>
            }
            bordered={false}
          >
            {priceChanges.length > 0 ? (
              <List
                dataSource={priceChanges.slice(0, 10)}
                renderItem={change => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{change.item}</Text>
                          <Text type="secondary" style={{ fontSize: '0.9em' }}>
                            at {change.store}
                          </Text>
                        </Space>
                      }
                      description={
                        <Space>
                          <Text delete={change.percentChange > 0}>{change.oldPrice.toFixed(2)}</Text>
                          <Text type="secondary">→</Text>
                          <Text strong>{change.newPrice.toFixed(2)}</Text>
                          <Tag 
                            color={change.percentChange > 0 ? 'error' : 'success'}
                            style={{ margin: 0 }}
                          >
                            {change.percentChange > 0 ? '+' : ''}{change.percentChange.toFixed(1)}%
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '0.9em' }}>
                            on {format(new Date(change.date), 'dd MMM yyyy')}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No price changes detected yet. Continue scanning receipts to track price changes."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card 
            title={
              <Space>
                <StarOutlined style={{ color: '#faad14' }} />
                <span>Recommended Actions</span>
              </Space>
            }
            bordered={false}
          >
            <List
              dataSource={[
                {
                  title: 'Categorize Items',
                  description: 'Assign categories to your receipt items for better insights',
                  progress: Math.floor(
                    (filteredReceipts.reduce((count, receipt) => {
                      return count + receipt.items.filter(item => item.category).length;
                    }, 0) / 
                    filteredReceipts.reduce((count, receipt) => {
                      return count + receipt.items.length;
                    }, 0)) * 100
                  ),
                  action: 'Review Items'
                },
                {
                  title: 'Add Missing Information',
                  description: 'Complete store addresses, payment methods, and other details',
                  progress: Math.floor(
                    (filteredReceipts.filter(receipt => 
                      receipt.paymentMethod && receipt.merchantAddress
                    ).length / filteredReceipts.length) * 100
                  ),
                  action: 'Review Receipts'
                },
                {
                  title: 'Tag Receipts',
                  description: 'Add tags to your receipts for easier filtering and organization',
                  progress: Math.floor(
                    (filteredReceipts.filter(receipt => 
                      receipt.tags && receipt.tags.length > 0
                    ).length / filteredReceipts.length) * 100
                  ),
                  action: 'Add Tags'
                }
              ]}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={
                      <div>
                        <Paragraph>{item.description}</Paragraph>
                        <Progress percent={item.progress} status="active" strokeColor="#1890ff" />
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReceiptInsights;