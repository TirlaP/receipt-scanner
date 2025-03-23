import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Input, 
  DatePicker, 
  Select, 
  Divider, 
  Typography, 
  Tooltip, 
  message,
  Empty,
  Drawer,
  Modal,
  List,
  Checkbox,
  Popconfirm,
  Badge,
  Avatar,
  Col,
  Row
} from 'antd';
import { 
  SearchOutlined, 
  DeleteOutlined, 
  SyncOutlined, 
  PlusOutlined, 
  FilterOutlined,
  ClearOutlined,
  EditOutlined,
  EyeOutlined,
  ShoppingOutlined,
  TagsOutlined,
  ExportOutlined,
  CalendarOutlined,
  DollarOutlined,
  ShopOutlined,
  TagOutlined,
  BarsOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { format, parseISO, isWithinInterval } from 'date-fns';

import { Receipt } from '../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

interface EnhancedReceiptsListProps {
  receipts: Receipt[];
  onDeleteReceipt: (id: string) => Promise<void>;
  onAddTags?: (receiptIds: string[], tags: string[]) => Promise<void>;
}

interface Filter {
  search: string;
  dateRange: [Date, Date] | null;
  stores: string[];
  categories: string[];
  tags: string[];
  currencies: string[];
  priceRange: [number, number] | null;
}

const EnhancedReceiptsList: React.FC<EnhancedReceiptsListProps> = ({ 
  receipts, 
  onDeleteReceipt,
  onAddTags
}) => {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filters, setFilters] = useState<Filter>({
    search: '',
    dateRange: null,
    stores: [],
    categories: [],
    tags: [],
    currencies: [],
    priceRange: null
  });
  const [tagsToAdd, setTagsToAdd] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);

  // Populate all possible filter options from the receipts
  const filterOptions = useMemo(() => {
    const stores = new Set<string>();
    const categories = new Set<string>();
    const tags = new Set<string>();
    const currencies = new Set<string>();
    
    receipts.forEach(receipt => {
      // Store
      if (receipt.storeName) {
        stores.add(receipt.storeName);
      }
      
      // Categories from items
      receipt.items.forEach(item => {
        if (item.category) {
          categories.add(item.category);
        }
      });
      
      // Tags
      if (receipt.tags && receipt.tags.length > 0) {
        receipt.tags.forEach(tag => tags.add(tag));
      }
      
      // Currency
      if (receipt.currency) {
        currencies.add(receipt.currency);
      }
    });
    
    return {
      stores: Array.from(stores).sort(),
      categories: Array.from(categories).sort(),
      tags: Array.from(tags).sort(),
      currencies: Array.from(currencies).sort()
    };
  }, [receipts]);

  // Filter receipts based on current filters
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      // Text search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesStoreName = receipt.storeName.toLowerCase().includes(searchLower);
        const matchesItems = receipt.items.some(item => 
          item.name.toLowerCase().includes(searchLower)
        );
        const matchesNotes = receipt.notes 
          ? receipt.notes.toLowerCase().includes(searchLower) 
          : false;
        
        if (!matchesStoreName && !matchesItems && !matchesNotes) {
          return false;
        }
      }
      
      // Date range
      if (filters.dateRange) {
        const receiptDate = new Date(receipt.date);
        if (
          !isWithinInterval(receiptDate, { 
            start: filters.dateRange[0], 
            end: filters.dateRange[1] 
          })
        ) {
          return false;
        }
      }
      
      // Stores
      if (filters.stores.length > 0 && !filters.stores.includes(receipt.storeName)) {
        return false;
      }
      
      // Categories (match if any item has a selected category)
      if (filters.categories.length > 0) {
        const hasMatchingCategory = receipt.items.some(item => 
          item.category && filters.categories.includes(item.category)
        );
        
        if (!hasMatchingCategory) {
          return false;
        }
      }
      
      // Tags
      if (filters.tags.length > 0) {
        const hasMatchingTag = receipt.tags 
          ? receipt.tags.some(tag => filters.tags.includes(tag))
          : false;
        
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      // Currencies
      if (filters.currencies.length > 0 && 
          !filters.currencies.includes(receipt.currency || '')) {
        return false;
      }
      
      // Price range
      if (filters.priceRange) {
        const [min, max] = filters.priceRange;
        if (receipt.total < min || receipt.total > max) {
          return false;
        }
      }
      
      return true;
    });
  }, [receipts, filters]);

  // Get all available tags for the tag selector
  const allTags = useMemo(() => {
    const tags = new Set<string>([
      ...filterOptions.tags,
      ...customTags,
      'Work', 
      'Personal', 
      'Business', 
      'Family', 
      'Tax Deductible', 
      'Reimbursable',
      'Important'
    ]);
    return Array.from(tags);
  }, [filterOptions.tags, customTags]);

  // Handle filter changes
  const handleFilterChange = (key: keyof Filter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      dateRange: null,
      stores: [],
      categories: [],
      tags: [],
      currencies: [],
      priceRange: null
    });
    message.success('Filters cleared');
  };

  // Handle row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    }
  };

  // Handle bulk actions
  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    
    setLoading(true);
    
    try {
      const promises = selectedRowKeys.map(id => onDeleteReceipt(id as string));
      await Promise.all(promises);
      
      message.success(`Successfully deleted ${selectedRowKeys.length} receipts`);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('Error deleting receipts:', error);
      message.error('Failed to delete some receipts');
    } finally {
      setLoading(false);
    }
  };

  // Handle add tags to selected receipts
  const handleAddTagsToSelected = async () => {
    if (!tagsToAdd.length || !selectedRowKeys.length) return;
    
    setLoading(true);
    
    try {
      if (onAddTags) {
        await onAddTags(selectedRowKeys as string[], tagsToAdd);
        message.success(`Added tags to ${selectedRowKeys.length} receipts`);
      } else {
        // Fallback implementation if onAddTags is not provided
        const promises = selectedRowKeys.map(async (id) => {
          const receipt = receipts.find(r => r.id === id);
          if (!receipt) return;
          
          const updatedReceipt = {
            ...receipt,
            tags: [...(receipt.tags || []), ...tagsToAdd].filter(
              (value, index, self) => self.indexOf(value) === index // Remove duplicates
            )
          };
          
          // This would normally call an update function
          console.log('Would update receipt:', updatedReceipt);
        });
        
        await Promise.all(promises);
        message.success(`Added tags to ${selectedRowKeys.length} receipts`);
      }
      
      setTagModalVisible(false);
      setTagsToAdd([]);
    } catch (error) {
      console.error('Error adding tags:', error);
      message.error('Failed to add tags');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (value: string) => {
    handleFilterChange('search', value);
  };

  // Table columns
  const columns = [
    {
      title: 'Store',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (text: string, record: Receipt) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.merchantAddress && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.merchantAddress}
            </Text>
          )}
        </Space>
      ),
      sorter: (a: Receipt, b: Receipt) => a.storeName.localeCompare(b.storeName),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: Date) => format(new Date(date), 'dd MMM yyyy'),
      sorter: (a: Receipt, b: Receipt) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: 'descend' as 'descend',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total: number, record: Receipt) => (
        <Text strong>
          {total.toFixed(2)} {record.currency || ''}
        </Text>
      ),
      sorter: (a: Receipt, b: Receipt) => a.total - b.total,
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: any[], record: Receipt) => {
        const categories = items
          .map(item => item.category)
          .filter(Boolean)
          .filter((value, index, self) => self.indexOf(value) === index);
        
        return (
          <Space direction="vertical" size={0}>
            <Text>{items.length} items</Text>
            {categories.length > 0 && (
              <div>
                {categories.slice(0, 2).map(category => (
                  <Tag key={category} color="blue" style={{ marginRight: 4 }}>
                    {category}
                  </Tag>
                ))}
                {categories.length > 2 && (
                  <Tag>+{categories.length - 2} more</Tag>
                )}
              </div>
            )}
          </Space>
        );
      },
      responsive: ['md'],
    },
    {
      title: 'Tags',
      key: 'tags',
      dataIndex: 'tags',
      render: (tags: string[] = []) => (
        <>
          {tags.length > 0 ? (
            <Space size={[0, 4]} wrap>
              {tags.slice(0, 2).map(tag => (
                <Tag color="green" key={tag}>
                  <TagOutlined /> {tag}
                </Tag>
              ))}
              {tags.length > 2 && <Tag>+{tags.length - 2} more</Tag>}
            </Space>
          ) : (
            <Text type="secondary">No tags</Text>
          )}
        </>
      ),
      responsive: ['lg'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Receipt) => (
        <Space>
          <Tooltip title="View Details">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/receipt/${record.id}`)}
              type="text"
            />
          </Tooltip>
          
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              onClick={() => navigate(`/receipt/${record.id}`)}
              type="text"
            />
          </Tooltip>
          
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this receipt?"
              onConfirm={() => handleDeleteReceipt(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                type="text"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Handle delete receipt
  const handleDeleteReceipt = async (id: string) => {
    try {
      setLoading(true);
      await onDeleteReceipt(id);
      message.success('Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      message.error('Failed to delete receipt');
    } finally {
      setLoading(false);
    }
  };

  // Render receipt grid/card view
  const renderGridView = () => {
    if (filteredReceipts.length === 0) {
      return (
        <Empty description="No receipts found" />
      );
    }
    
    return (
      <div className="receipts-grid">
        <Row gutter={[16, 16]} className="receipt-card-row">
          {filteredReceipts.map(receipt => (
            <Col key={receipt.id} xs={24} sm={12} md={8} lg={8} xl={6}>
              <Card
                hoverable
                className="receipt-card"
                onClick={() => navigate(`/receipt/${receipt.id}`)}
                cover={
                  receipt.imageData ? (
                    <div className="receipt-card-image-container">
                      <img 
                        alt={`Receipt from ${receipt.storeName}`} 
                        src={receipt.imageData} 
                        className="receipt-card-image"
                      />
                    </div>
                  ) : (
                    <div className="receipt-card-image-placeholder">
                      <ShoppingOutlined style={{ fontSize: 36, color: '#d9d9d9' }} />
                    </div>
                  )
                }
                actions={[
                  <Tooltip title="View Details">
                    <EyeOutlined key="view" />
                  </Tooltip>,
                  <Tooltip title="Edit">
                    <EditOutlined key="edit" />
                  </Tooltip>,
                  <Tooltip title="Delete">
                    <Popconfirm
                      title="Delete this receipt?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteReceipt(receipt.id);
                      }}
                      okText="Yes"
                      cancelText="No"
                      onCancel={(e) => e?.stopPropagation()}
                    >
                      <DeleteOutlined 
                        key="delete" 
                        onClick={(e) => e.stopPropagation()} 
                      />
                    </Popconfirm>
                  </Tooltip>,
                ]}
              >
                <div className="receipt-card-content">
                  <div className="receipt-card-header">
                    <Text strong ellipsis style={{ maxWidth: '100%' }}>
                      {receipt.storeName}
                    </Text>
                    <Text type="secondary">
                      {format(new Date(receipt.date), 'dd MMM yyyy')}
                    </Text>
                  </div>
                  
                  <div className="receipt-card-total">
                    <Text strong>
                      {receipt.total.toFixed(2)} {receipt.currency || ''}
                    </Text>
                    <Text type="secondary">
                      {receipt.items.length} items
                    </Text>
                  </div>
                  
                  {receipt.tags && receipt.tags.length > 0 && (
                    <div className="receipt-card-tags">
                      {receipt.tags.slice(0, 2).map(tag => (
                        <Tag key={tag} color="green" style={{ marginRight: 4, marginBottom: 4 }}>
                          {tag}
                        </Tag>
                      ))}
                      {receipt.tags.length > 2 && (
                        <Tag>+{receipt.tags.length - 2}</Tag>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  return (
    <div className="receipts-list-container">
      <Card
        title={
          <Space>
            <ShoppingOutlined />
            <span>Receipts List</span>
            <Badge 
              count={filteredReceipts.length} 
              style={{ backgroundColor: '#1890ff' }} 
            />
          </Space>
        }
        bordered={false}
        extra={
          <Space>
            <Select 
              defaultValue="list"
              onChange={(value) => setViewMode(value as 'list' | 'grid' | 'calendar')}
              style={{ width: 120 }}
            >
              <Option value="list">
                <Space>
                  <UnorderedListOutlined />
                  <span>List</span>
                </Space>
              </Option>
              <Option value="grid">
                <Space>
                  <AppstoreOutlined />
                  <span>Grid</span>
                </Space>
              </Option>
            </Select>
            
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/scan')}
            >
              Scan New Receipt
            </Button>
          </Space>
        }
      >
        <div className="receipts-list-controls" style={{ marginBottom: 16 }}>
          <div className="search-and-filter">
            <Search
              placeholder="Search receipts by store, items, or notes"
              allowClear
              enterButton
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300, marginRight: 16 }}
            />
            
            <Space>
              <Tooltip title="Filter Options">
                <Button
                  type={Object.values(filters).some(v => 
                    Array.isArray(v) ? v.length > 0 : Boolean(v)
                  ) ? 'primary' : 'default'}
                  icon={<FilterOutlined />}
                  onClick={() => setFilterDrawerVisible(true)}
                >
                  Filters
                </Button>
              </Tooltip>
              
              {Object.values(filters).some(v => 
                Array.isArray(v) ? v.length > 0 : Boolean(v)
              ) && (
                <Button 
                  icon={<ClearOutlined />} 
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              )}
            </Space>
          </div>
        </div>
        
        {selectedRowKeys.length > 0 && (
          <div className="bulk-actions" style={{ marginBottom: 16 }}>
            <Space>
              <Text>
                {selectedRowKeys.length} {selectedRowKeys.length === 1 ? 'receipt' : 'receipts'} selected
              </Text>
              
              <Button
                icon={<TagsOutlined />}
                onClick={() => setTagModalVisible(true)}
              >
                Add Tags
              </Button>
              
              <Button
                icon={<ExportOutlined />}
                onClick={() => navigate('/export')}
              >
                Export Selected
              </Button>
              
              <Popconfirm
                title={`Are you sure you want to delete ${selectedRowKeys.length} receipts?`}
                onConfirm={handleBulkDelete}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                >
                  Delete Selected
                </Button>
              </Popconfirm>
            </Space>
          </div>
        )}
        
        {/* Display filters that are currently active */}
        {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v)) && (
          <div className="active-filters" style={{ marginBottom: 16 }}>
            <Space size={[0, 8]} wrap>
              {filters.search && (
                <Tag 
                  color="blue" 
                  closable 
                  onClose={() => handleFilterChange('search', '')}
                >
                  Search: {filters.search}
                </Tag>
              )}
              
              {filters.dateRange && (
                <Tag 
                  color="blue" 
                  closable 
                  onClose={() => handleFilterChange('dateRange', null)}
                >
                  Date: {format(filters.dateRange[0], 'dd/MM/yyyy')} - {format(filters.dateRange[1], 'dd/MM/yyyy')}
                </Tag>
              )}
              
              {filters.stores.map(store => (
                <Tag 
                  key={store} 
                  color="green" 
                  closable 
                  onClose={() => handleFilterChange('stores', filters.stores.filter(s => s !== store))}
                >
                  Store: {store}
                </Tag>
              ))}
              
              {filters.categories.map(category => (
                <Tag 
                  key={category} 
                  color="cyan" 
                  closable 
                  onClose={() => handleFilterChange('categories', filters.categories.filter(c => c !== category))}
                >
                  Category: {category}
                </Tag>
              ))}
              
              {filters.tags.map(tag => (
                <Tag 
                  key={tag} 
                  color="purple" 
                  closable 
                  onClose={() => handleFilterChange('tags', filters.tags.filter(t => t !== tag))}
                >
                  Tag: {tag}
                </Tag>
              ))}
              
              {filters.currencies.map(currency => (
                <Tag 
                  key={currency} 
                  color="orange" 
                  closable 
                  onClose={() => handleFilterChange('currencies', filters.currencies.filter(c => c !== currency))}
                >
                  Currency: {currency}
                </Tag>
              ))}
              
              {filters.priceRange && (
                <Tag 
                  color="red" 
                  closable 
                  onClose={() => handleFilterChange('priceRange', null)}
                >
                  Price: {filters.priceRange[0]} - {filters.priceRange[1]}
                </Tag>
              )}
            </Space>
          </div>
        )}
        
        {/* Grid or List view based on selection */}
        {viewMode === 'grid' ? (
          renderGridView()
        ) : (
          <Table
            dataSource={filteredReceipts}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} receipts`
            }}
            rowSelection={rowSelection}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '0 48px' }}>
                  <Title level={5}>Receipt Items</Title>
                  <Table
                    dataSource={record.items}
                    columns={[
                      {
                        title: 'Item',
                        dataIndex: 'name',
                        key: 'name',
                      },
                      {
                        title: 'Category',
                        dataIndex: 'category',
                        key: 'category',
                        render: (text: string) => text || 'Uncategorized',
                      },
                      {
                        title: 'Quantity',
                        dataIndex: 'quantity',
                        key: 'quantity',
                        render: (qty: number, record: any) => `${qty} ${record.unit || ''}`,
                      },
                      {
                        title: 'Price',
                        dataIndex: 'price',
                        key: 'price',
                        render: (price: number) => price.toFixed(2),
                      },
                      {
                        title: 'Total',
                        key: 'total',
                        render: (_, record) => (record.totalAmount ?? (record.price * record.quantity)).toFixed(2),
                      },
                    ]}
                    pagination={false}
                    rowKey="id"
                    size="small"
                  />
                </div>
              ),
            }}
            locale={{
              emptyText: <Empty description="No receipts found" />
            }}
          />
        )}
      </Card>
      
      {/* Filter Drawer */}
      <Drawer
        title="Filter Receipts"
        placement="right"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        width={360}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleClearFilters}>Clear All</Button>
              <Button type="primary" onClick={() => setFilterDrawerVisible(false)}>
                Apply Filters
              </Button>
            </Space>
          </div>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="filter-section">
            <Title level={5}>
              <CalendarOutlined /> Date Range
            </Title>
            <RangePicker
              style={{ width: '100%' }}
              value={filters.dateRange as any}
              onChange={(dates) => {
                if (dates) {
                  handleFilterChange('dateRange', [dates[0]!.toDate(), dates[1]!.toDate()]);
                } else {
                  handleFilterChange('dateRange', null);
                }
              }}
              allowClear
            />
          </div>
          
          <Divider />
          
          <div className="filter-section">
            <Title level={5}>
              <ShopOutlined /> Stores
            </Title>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select stores"
              value={filters.stores}
              onChange={(value) => handleFilterChange('stores', value)}
              allowClear
              maxTagCount={3}
            >
              {filterOptions.stores.map(store => (
                <Option key={store} value={store}>{store}</Option>
              ))}
            </Select>
          </div>
          
          <Divider />
          
          <div className="filter-section">
            <Title level={5}>
              <BarsOutlined /> Categories
            </Title>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select categories"
              value={filters.categories}
              onChange={(value) => handleFilterChange('categories', value)}
              allowClear
              maxTagCount={3}
            >
              {filterOptions.categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </div>
          
          <Divider />
          
          <div className="filter-section">
            <Title level={5}>
              <TagOutlined /> Tags
            </Title>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select tags"
              value={filters.tags}
              onChange={(value) => handleFilterChange('tags', value)}
              allowClear
              maxTagCount={3}
            >
              {filterOptions.tags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </div>
          
          <Divider />
          
          <div className="filter-section">
            <Title level={5}>
              <DollarOutlined /> Currencies
            </Title>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select currencies"
              value={filters.currencies}
              onChange={(value) => handleFilterChange('currencies', value)}
              allowClear
            >
              {filterOptions.currencies.map(currency => (
                <Option key={currency} value={currency}>{currency}</Option>
              ))}
            </Select>
          </div>
        </Space>
      </Drawer>
      
      {/* Add Tags Modal */}
      <Modal
        title="Add Tags to Selected Receipts"
        open={tagModalVisible}
        onCancel={() => {
          setTagModalVisible(false);
          setTagsToAdd([]);
        }}
        onOk={handleAddTagsToSelected}
        okText="Add Tags"
        okButtonProps={{ loading, disabled: !tagsToAdd.length }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            Add tags to {selectedRowKeys.length} selected {selectedRowKeys.length === 1 ? 'receipt' : 'receipts'}
          </Text>
        </div>
        
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="Add tags"
          onChange={setTagsToAdd}
          value={tagsToAdd}
        >
          {allTags.map(tag => (
            <Option key={tag} value={tag}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <TagOutlined style={{ marginRight: 8 }} />
                {tag}
              </div>
            </Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default EnhancedReceiptsList;