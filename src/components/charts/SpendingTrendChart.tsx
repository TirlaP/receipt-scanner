import React from 'react';
import { Line } from '@ant-design/plots';
import { Empty, Spin } from 'antd';
import { format, parseISO, isValid } from 'date-fns';
import { Receipt } from '../../types';

interface SpendingTrendChartProps {
  receipts: Receipt[];
  currency?: string;
  loading?: boolean;
  dateFormat?: string;
  height?: number;
}

const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ 
  receipts, 
  currency,
  loading = false,
  dateFormat = 'MMM yyyy',
  height = 300
}) => {
  // Filter receipts by currency if specified
  const filteredReceipts = currency 
    ? receipts.filter(receipt => receipt.currency === currency)
    : receipts;
  
  // Group receipts by month
  const monthlySpending: Record<string, number> = {};
  
  filteredReceipts.forEach(receipt => {
    // Ensure receipt.date is a valid Date object
    const date = receipt.date instanceof Date 
      ? receipt.date 
      : typeof receipt.date === 'string' && isValid(parseISO(receipt.date))
        ? parseISO(receipt.date)
        : new Date(receipt.date);
    
    // Format the date to get the month key
    const monthKey = format(date, 'yyyy-MM');
    
    // Add the receipt total to the monthly total
    monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + receipt.total;
  });
  
  // Convert to array and sort chronologically
  const data = Object.entries(monthlySpending)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: format(parseISO(`${month}-01`), dateFormat),
      originalMonth: month, // Keep original for sorting
      amount: Number(amount.toFixed(2))
    }));
  
  if (loading) {
    return <Spin tip="Loading chart data..." />;
  }
  
  if (data.length === 0) {
    return <Empty description="No spending data available" />;
  }
  
  // Get min and max values for better y-axis configuration
  const values = data.map(item => item.amount);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;
  
  const config = {
    data,
    height,
    xField: 'month',
    yField: 'amount',
    seriesField: 'type',
    yAxis: {
      title: {
        text: currency ? `Amount (${currency})` : 'Amount',
      },
      min: Math.max(0, minValue - valueRange * 0.1), // Add 10% padding below, but not below zero
      max: maxValue + valueRange * 0.1, // Add 10% padding above
    },
    xAxis: {
      title: {
        text: 'Month',
      },
    },
    tooltip: {
      title: 'month',
      formatter: (datum: any) => {
        return { name: 'Spending', value: `${datum.amount} ${currency || ''}` };
      },
    },
    point: {
      size: 5,
      shape: 'diamond',
      style: {
        fill: 'white',
        stroke: '#1890ff',
        lineWidth: 2,
      },
    },
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    color: '#1890ff',
    // Add area under the line for better visualization
    area: {
      style: {
        fill: 'l(270) 0:#ffffff 0.5:#1890ff10 1:#1890ff20',
      },
    },
  };
  
  return <Line {...config} />;
};

export default SpendingTrendChart;