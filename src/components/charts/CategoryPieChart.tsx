import React, { useMemo } from 'react';
import { Pie } from '@ant-design/plots';
import { Empty, Spin } from 'antd';
import { Receipt, ReceiptItem } from '../../types';

interface CategoryPieChartProps {
  receipts: Receipt[];
  currency?: string;
  loading?: boolean;
  height?: number;
  limit?: number;
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ 
  receipts, 
  currency,
  loading = false,
  height = 300,
  limit = 6
}) => {
  // Calculate spending by category
  const categoryData = useMemo(() => {
    // Filter receipts by currency if specified
    const filteredReceipts = currency 
      ? receipts.filter(receipt => receipt.currency === currency)
      : receipts;

    // Map to collect spending by category
    const categoryMap: Record<string, number> = {};
    
    filteredReceipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const category = item.category || 'Uncategorized';
        const itemTotal = (item.totalAmount !== undefined && item.totalAmount !== null) 
          ? item.totalAmount 
          : item.price * item.quantity;
        
        categoryMap[category] = (categoryMap[category] || 0) + itemTotal;
      });
    });
    
    // Convert to array and sort by amount
    const categoryArray = Object.entries(categoryMap)
      .map(([category, value]) => ({
        category,
        value: Number(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);
    
    // Group smaller categories as "Other" if we have more than the limit
    if (categoryArray.length > limit) {
      const mainCategories = categoryArray.slice(0, limit - 1);
      const otherCategories = categoryArray.slice(limit - 1);
      
      const otherTotal = otherCategories.reduce((sum, item) => sum + item.value, 0);
      
      return [
        ...mainCategories,
        { category: 'Other', value: Number(otherTotal.toFixed(2)) }
      ];
    }
    
    return categoryArray;
  }, [receipts, currency, limit]);
  
  if (loading) {
    return <Spin tip="Loading chart data..." style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />;
  }
  
  if (categoryData.length === 0) {
    return <Empty description="No category data available" />;
  }
  
  const config = {
    data: categoryData,
    height,
    angleField: 'value',
    colorField: 'category',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      // Change from 'outer' to 'inner' to avoid the shape.outer error
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
          name: datum.category || 'Unknown', 
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
        content: 'Categories',
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
          const total = categoryData.reduce((sum, item) => sum + item.value, 0);
          return `${total.toFixed(2)} ${currency || ''}`;
        },
      },
    },
    // Add a paddingRight to ensure labels don't get cut off
    appendPadding: [10, 20, 10, 10],
  };
  
  return <Pie {...config} />;
};

export default CategoryPieChart;