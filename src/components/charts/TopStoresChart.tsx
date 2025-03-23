import React, { useMemo } from 'react';
import { Pie, Column } from '@ant-design/plots';
import { Empty, Spin, Radio } from 'antd';
import { Receipt } from '../../types';

interface TopStoresChartProps {
  receipts: Receipt[];
  currency?: string;
  loading?: boolean;
  height?: number;
  limit?: number;
  type?: 'pie' | 'column';
  onTypeChange?: (type: 'pie' | 'column') => void;
}

const TopStoresChart: React.FC<TopStoresChartProps> = ({ 
  receipts, 
  currency,
  loading = false,
  height = 300,
  limit = 5,
  type = 'pie',
  onTypeChange
}) => {
  // Calculate spending by store
  const storeData = useMemo(() => {
    // Filter receipts by currency if specified
    const filteredReceipts = currency 
      ? receipts.filter(receipt => receipt.currency === currency)
      : receipts;

    // Map to collect spending by store
    const storeMap: Record<string, number> = {};
    
    filteredReceipts.forEach(receipt => {
      const storeName = receipt.storeName || 'Unknown';
      storeMap[storeName] = (storeMap[storeName] || 0) + receipt.total;
    });
    
    // Convert to array and sort by amount
    const storeArray = Object.entries(storeMap)
      .map(([store, value]) => ({
        store,
        value: Number(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);
    
    // Take only the top stores
    return storeArray.slice(0, limit);
  }, [receipts, currency, limit]);
  
  if (loading) {
    return <Spin tip="Loading chart data..." style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />;
  }
  
  if (storeData.length === 0) {
    return <Empty description="No store data available" />;
  }

  // Pie chart configuration
  const pieConfig = {
    data: storeData,
    height,
    angleField: 'value',
    colorField: 'store',
    radius: 0.8,
    innerRadius: 0.5,
    label: {
      type: 'inner',
      offset: '-30%',
      formatter: (datum: any) => {
        if (!datum || typeof datum !== 'object') return '';
        const percent = datum.percent || 0;
        return `${Math.round(percent * 100)}%`;
      },
      style: {
        fontSize: 14,
        textAlign: 'center',
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        if (!datum || typeof datum !== 'object') return { name: '', value: '' };
        return { 
          name: datum.store || 'Unknown', 
          value: `${datum.value || 0} ${currency || ''}` 
        };
      },
    },
    interactions: [
      { type: 'element-active' },
    ],
    legend: {
      position: 'bottom',
      flipPage: true,
    },
    statistic: {
      title: {
        content: 'Top Stores',
        style: {
          fontSize: '14px',
          fontWeight: 'normal',
        },
      },
      content: {
        style: {
          fontSize: '20px',
          fontWeight: 'bold',
        },
        formatter: () => {
          const total = storeData.reduce((sum, item) => sum + item.value, 0);
          return `${total.toFixed(2)} ${currency || ''}`;
        },
      },
    },
    // Add padding for better layout
    appendPadding: [10, 20, 10, 10],
  };

  // Column chart configuration
  const columnConfig = {
    data: storeData,
    height,
    xField: 'store',
    yField: 'value',
    columnWidthRatio: 0.6,
    label: {
      position: 'top',
      formatter: (datum: any) => {
        if (!datum || typeof datum !== 'object') return '';
        return `${datum.value || 0}`;
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        if (!datum || typeof datum !== 'object') return { name: '', value: '' };
        return { 
          name: datum.store || 'Unknown', 
          value: `${datum.value || 0} ${currency || ''}` 
        };
      },
    },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: false,
        formatter: (text: string) => {
          return text && text.length > 10 ? `${text.substring(0, 10)}...` : text;
        },
      },
    },
    yAxis: {
      title: {
        text: currency ? `Amount (${currency})` : 'Amount',
      },
    },
    color: '#1890ff',
    interactions: [
      { type: 'element-active' },
    ],
  };
  
  return (
    <div>
      {onTypeChange && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Radio.Group value={type} onChange={(e) => onTypeChange(e.target.value)} size="small">
            <Radio.Button value="pie">Pie</Radio.Button>
            <Radio.Button value="column">Column</Radio.Button>
          </Radio.Group>
        </div>
      )}
      
      {type === 'pie' ? <Pie {...pieConfig} /> : <Column {...columnConfig} />}
    </div>
  );
};

export default TopStoresChart;