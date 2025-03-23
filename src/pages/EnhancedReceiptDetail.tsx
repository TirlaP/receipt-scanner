import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Divider, 
  Form, 
  Input, 
  DatePicker, 
  message, 
  Tabs,
  Table,
  Modal,
  Space,
  Tag,
  Popconfirm,
  Drawer,
  Select,
  Empty,
  Skeleton,
  Image,
  InputNumber,
  Tooltip,
  Badge,
  Checkbox,
  Statistic
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  PlusOutlined,
  TagOutlined,
  ShoppingOutlined,
  CameraOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  CreditCardOutlined,
  ShopOutlined,
  PhoneOutlined,
  TagsOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
  CloseOutlined,
  ExportOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { Receipt, ReceiptItem } from '../types';
import { dbService } from '../services/db-service';
import { firebaseService } from '../services/firebase/firebase-service';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface EnhancedReceiptDetailProps {
  receipts: Receipt[];
  onUpdateReceipt: (receipt: Receipt) => Promise<void>;
  onDeleteReceipt: (id: string) => Promise<void>;
  categories?: string[];
}

const EnhancedReceiptDetail: React.FC<EnhancedReceiptDetailProps> = ({ 
  receipts, 
  onUpdateReceipt, 
  onDeleteReceipt,
  categories = [] 
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<ReceiptItem | null>(null);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [imageDrawerVisible, setImageDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();

  // Predefined categories based on common receipt items
  const predefinedCategories = [
    ...categories,
    'Groceries',
    'Restaurant',
    'Electronics',
    'Clothing',
    'Healthcare',
    'Household',
    'Entertainment',
    'Transportation',
    'Utilities',
    'Personal Care',
    'Office Supplies',
    'Gifts',
    'Other'
  ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
  
  // Predefined payment methods
  const paymentMethods = [
    'Cash',
    'Credit Card',
    'Debit Card',
    'Mobile Payment',
    'Bank Transfer',
    'Check',
    'Gift Card',
    'Other'
  ];
  
  // Predefined tags
  const predefinedTags = [
    'Work',
    'Personal',
    'Business',
    'Family',
    'Tax Deductible',
    'Reimbursable',
    'Vacation',
    'Emergency',
    'Subscription',
    'Sale',
    'Gift'
  ];

  // Load receipt data
  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);
        
        // First try to find in local state
        const foundReceipt = receipts.find(r => r.id === id);
        
        if (foundReceipt) {
          setReceipt(foundReceipt);
        } else if (currentUser) {
          // If not found locally and user is logged in, try to fetch from cloud
          const cloudReceipt = await firebaseService.getReceipt(id!);
          if (cloudReceipt) {
            setReceipt(cloudReceipt);
          } else {
            message.error('Receipt not found');
            navigate('/receipts');
          }
        } else {
          message.error('Receipt not found');
          navigate('/receipts');
        }
      } catch (error) {
        console.error('Error fetching receipt:', error);
        message.error('Failed to load receipt details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchReceipt();
    }
  }, [id, receipts, navigate, currentUser]);

  // Update form when receipt changes or editing mode is enabled
  useEffect(() => {
    if (receipt && editing) {
      form.setFieldsValue({
        storeName: receipt.storeName,
        date: receipt.date ? new Date(receipt.date) : null,
        total: receipt.total,
        currency: receipt.currency || 'USD',
        taxAmount: receipt.taxAmount,
        taxRate: receipt.taxRate,
        documentType: receipt.documentType || 'Receipt',
        merchantAddress: receipt.merchantAddress,
        merchantPhone: receipt.merchantPhone,
        paymentMethod: receipt.paymentMethod,
        notes: receipt.notes,
        tags: receipt.tags || []
      });
    }
  }, [receipt, editing, form]);

  // Handle edit toggle
  const handleEditToggle = () => {
    setEditing(!editing);
  };

  // Handle receipt save
  const handleSaveReceipt = async (values: any) => {
    if (!receipt) return;
    
    try {
      const updatedReceipt: Receipt = {
        ...receipt,
        storeName: values.storeName,
        date: new Date(values.date),
        total: parseFloat(values.total),
        currency: values.currency,
        taxAmount: values.taxAmount ? parseFloat(values.taxAmount) : undefined,
        taxRate: values.taxRate ? parseFloat(values.taxRate) : undefined,
        documentType: values.documentType,
        merchantAddress: values.merchantAddress,
        merchantPhone: values.merchantPhone,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
        tags: values.tags,
        updatedAt: new Date()
      };
      
      await onUpdateReceipt(updatedReceipt);
      
      setReceipt(updatedReceipt);
      setEditing(false);
      message.success('Receipt updated successfully');
    } catch (error) {
      console.error('Error updating receipt:', error);
      message.error('Failed to update receipt');
    }
  };

  // Handle receipt delete
  const handleDeleteReceipt = async () => {
    if (!receipt) return;
    
    try {
      await onDeleteReceipt(receipt.id);
      message.success('Receipt deleted successfully');
      navigate('/receipts');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      message.error('Failed to delete receipt');
    }
  };

  // Handle item modal
  const showAddItemModal = () => {
    setEditingItem(null);
    itemForm.resetFields();
    setItemModalVisible(true);
  };

  const showEditItemModal = (item: ReceiptItem) => {
    setEditingItem(item);
    itemForm.setFieldsValue({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      unit: item.unit,
      category: item.category
    });
    setItemModalVisible(true);
  };

  const handleItemModalSave = async () => {
    try {
      const values = await itemForm.validateFields();
      
      if (!receipt) return;
      
      const updatedReceipt = { ...receipt };
      
      if (editingItem) {
        // Update existing item
        updatedReceipt.items = updatedReceipt.items.map(item => 
          item.id === editingItem.id 
            ? { ...item, ...values } 
            : item
        );
      } else {
        // Add new item
        const newItem: ReceiptItem = {
          id: uuidv4(),
          name: values.name,
          quantity: values.quantity,
          price: values.price,
          totalAmount: values.price * values.quantity,
          unit: values.unit,
          category: values.category
        };
        
        updatedReceipt.items = [...updatedReceipt.items, newItem];
      }
      
      // Recalculate total if needed
      if (values.recalculateTotal) {
        updatedReceipt.total = updatedReceipt.items.reduce(
          (sum, item) => sum + (item.price * item.quantity), 
          0
        );
      }
      
      await onUpdateReceipt(updatedReceipt);
      
      setReceipt(updatedReceipt);
      setItemModalVisible(false);
      message.success(editingItem ? 'Item updated successfully' : 'Item added successfully');
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!receipt) return;
    
    try {
      const updatedReceipt = { ...receipt };
      updatedReceipt.items = updatedReceipt.items.filter(item => item.id !== itemId);
      
      await onUpdateReceipt(updatedReceipt);
      
      setReceipt(updatedReceipt);
      message.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  // Handle tags
  const handleTagsModalSave = async (values: { tags: string[] }) => {
    if (!receipt) return;
    
    try {
      const updatedReceipt = { 
        ...receipt, 
        tags: values.tags,
        updatedAt: new Date()
      };
      
      await onUpdateReceipt(updatedReceipt);
      
      setReceipt(updatedReceipt);
      setTagsModalVisible(false);
      message.success('Tags updated successfully');
    } catch (error) {
      console.error('Error updating tags:', error);
      message.error('Failed to update tags');
    }
  };

  // Handle receipt export
  const handleExportReceipt = () => {
    navigate(`/export?receiptId=${receipt?.id}`);
  };

  if (loading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }

  if (!receipt) {
    return (
      <Card>
        <Empty description="Receipt not found" />
      </Card>
    );
  }

  // Table columns for items
  const itemColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ReceiptItem) => (
        <div>
          <Text>{text}</Text>
          {record.category && (
            <div>
              <Tag color="blue">{record.category}</Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record: ReceiptItem) => (
        <Text>{qty} {record.unit || ''}</Text>
      ),
      responsive: ['md'],
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text>{price.toFixed(2)}</Text>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (total: number | undefined, record: ReceiptItem) => {
        const itemTotal = total !== undefined ? total : record.price * record.quantity;
        return <Text strong>{itemTotal.toFixed(2)}</Text>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ReceiptItem) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditItemModal(record)}
          />
          <Popconfirm
            title="Are you sure you want to delete this item?"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Calculate overall statistics for the receipt
  const totalQuantity = receipt.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCategories = new Set(receipt.items.filter(item => item.category).map(item => item.category)).size;
  const totalWithCategories = receipt.items.filter(item => item.category).length;
  const categoriesPercentage = receipt.items.length > 0 
    ? Math.round((totalWithCategories / receipt.items.length) * 100) 
    : 0;
  
  return (
    <div className="receipt-detail-container">
      <Card
        bordered={false}
        title={
          <Space>
            <ShoppingOutlined />
            <span>{editing ? 'Edit Receipt' : 'Receipt Details'}</span>
          </Space>
        }
        extra={
          <Space>
            {!editing && (
              <>
                <Tooltip title="Export Receipt">
                  <Button 
                    icon={<ExportOutlined />} 
                    onClick={handleExportReceipt}
                  />
                </Tooltip>
                <Tooltip title="View Receipt Image">
                  <Badge dot={receipt.additionalImages && receipt.additionalImages.length > 0}>
                    <Button 
                      icon={<CameraOutlined />} 
                      onClick={() => setImageDrawerVisible(true)}
                    />
                  </Badge>
                </Tooltip>
                <Tooltip title="Manage Tags">
                  <Button 
                    icon={<TagsOutlined />} 
                    onClick={() => setTagsModalVisible(true)}
                  />
                </Tooltip>
              </>
            )}
            <Button
              type={editing ? 'primary' : 'default'}
              icon={editing ? <SaveOutlined /> : <EditOutlined />}
              onClick={handleEditToggle}
            >
              {editing ? 'Cancel' : 'Edit'}
            </Button>
            {!editing && (
              <Popconfirm
                title="Are you sure you want to delete this receipt?"
                onConfirm={handleDeleteReceipt}
                okText="Yes"
                cancelText="No"
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                >
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {editing ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveReceipt}
            initialValues={{
              storeName: receipt.storeName,
              date: receipt.date ? new Date(receipt.date) : null,
              total: receipt.total,
              currency: receipt.currency || 'USD',
              taxAmount: receipt.taxAmount,
              taxRate: receipt.taxRate,
              documentType: receipt.documentType || 'Receipt',
              merchantAddress: receipt.merchantAddress,
              merchantPhone: receipt.merchantPhone,
              paymentMethod: receipt.paymentMethod,
              notes: receipt.notes,
              tags: receipt.tags || []
            }}
          >
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="storeName"
                  label="Store Name"
                  rules={[{ required: true, message: 'Please enter the store name' }]}
                >
                  <Input prefix={<ShopOutlined />} />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="date"
                  label="Receipt Date"
                  rules={[{ required: true, message: 'Please select the receipt date' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              
              <Col xs={12} sm={8}>
                <Form.Item
                  name="total"
                  label="Total Amount"
                  rules={[{ required: true, message: 'Please enter the total amount' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    precision={2}
                    min={0}
                    step={0.01}
                    prefix={<DollarOutlined />}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={12} sm={4}>
                <Form.Item
                  name="currency"
                  label="Currency"
                >
                  <Select>
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                    <Option value="GBP">GBP</Option>
                    <Option value="RON">RON</Option>
                    <Option value="CAD">CAD</Option>
                    <Option value="AUD">AUD</Option>
                    <Option value="JPY">JPY</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={12} sm={6}>
                <Form.Item
                  name="taxAmount"
                  label="Tax Amount"
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    precision={2} 
                    min={0}
                    step={0.01}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={12} sm={6}>
                <Form.Item
                  name="taxRate"
                  label="Tax Rate (%)"
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    precision={2} 
                    min={0}
                    step={0.01}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="documentType"
                  label="Document Type"
                >
                  <Select>
                    <Option value="Receipt">Receipt</Option>
                    <Option value="Invoice">Invoice</Option>
                    <Option value="Credit Note">Credit Note</Option>
                    <Option value="Ticket">Ticket</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="paymentMethod"
                  label="Payment Method"
                >
                  <Select>
                    {paymentMethods.map(method => (
                      <Option key={method} value={method}>{method}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24}>
                <Form.Item
                  name="merchantAddress"
                  label="Merchant Address"
                >
                  <Input prefix={<EnvironmentOutlined />} />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  name="merchantPhone"
                  label="Merchant Phone"
                >
                  <Input prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              
              <Col xs={24}>
                <Form.Item
                  name="notes"
                  label="Notes"
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Col>
            </Row>
            
            <Divider />
            
            <Row>
              <Col span={24} style={{ textAlign: 'right' }}>
                <Space>
                  <Button onClick={handleEditToggle}>Cancel</Button>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    Save Receipt
                  </Button>
                </Space>
              </Col>
            </Row>
          </Form>
        ) : (
          <>
            <Row gutter={[24, 16]}>
              <Col xs={24} md={12}>
                <Card className="info-card" bordered={false} size="small">
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Space align="start">
                        <ShopOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                        <div>
                          <Title level={4} style={{ margin: 0 }}>{receipt.storeName}</Title>
                          {receipt.merchantAddress && (
                            <Text type="secondary">
                              <EnvironmentOutlined /> {receipt.merchantAddress}
                            </Text>
                          )}
                        </div>
                      </Space>
                    </Col>
                    
                    <Col xs={12}>
                      <Statistic 
                        title={<Space><CalendarOutlined /> Date</Space>}
                        value={format(new Date(receipt.date), 'dd MMM yyyy')}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                    
                    <Col xs={12}>
                      <Statistic 
                        title={<Space><FileTextOutlined /> Receipt Type</Space>}
                        value={receipt.documentType || 'Receipt'}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                    
                    <Col xs={12}>
                      <Statistic 
                        title={<Space><DollarOutlined /> Total</Space>}
                        value={receipt.total}
                        precision={2}
                        suffix={receipt.currency}
                        valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}
                      />
                    </Col>
                    
                    <Col xs={12}>
                      <Statistic 
                        title={<Space><CreditCardOutlined /> Payment</Space>}
                        value={receipt.paymentMethod || 'Not specified'}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                    
                    {receipt.taxAmount && (
                      <Col xs={12}>
                        <Statistic 
                          title={<Space><InfoCircleOutlined /> Tax Amount</Space>}
                          value={receipt.taxAmount}
                          precision={2}
                          suffix={receipt.currency}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                    )}
                    
                    {receipt.taxRate && (
                      <Col xs={12}>
                        <Statistic 
                          title={<Space><BarChartOutlined /> Tax Rate</Space>}
                          value={receipt.taxRate}
                          suffix="%"
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                    )}
                    
                    {receipt.merchantPhone && (
                      <Col xs={24}>
                        <Statistic 
                          title={<Space><PhoneOutlined /> Phone</Space>}
                          value={receipt.merchantPhone}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                    )}
                  </Row>
                </Card>
                
                {receipt.tags && receipt.tags.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Tags:</Text>
                    <div style={{ marginTop: 8 }}>
                      {receipt.tags.map(tag => (
                        <Tag color="blue" key={tag} style={{ marginBottom: 8 }}>
                          <TagOutlined /> {tag}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                
                {receipt.notes && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">Notes:</Text>
                    <Paragraph style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                      {receipt.notes}
                    </Paragraph>
                  </div>
                )}
              </Col>
              
              <Col xs={24} md={12}>
                <Card 
                  className="receipt-image-card" 
                  bordered={false} 
                  size="small"
                  cover={
                    <div 
                      style={{ 
                        maxHeight: 300, 
                        overflow: 'hidden', 
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: '#f5f5f5'
                      }}
                      onClick={() => setImageDrawerVisible(true)}
                    >
                      <img 
                        alt="Receipt" 
                        src={receipt.imageData || '/placeholder-receipt.png'} 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 300, 
                          objectFit: 'contain' 
                        }} 
                        onError={(e) => {
                          console.log('Image failed to load, using placeholder');
                          const target = e.target as HTMLImageElement;
                          if (target.src !== '/placeholder-receipt.png') {
                            target.src = '/placeholder-receipt.png';
                          }
                        }}
                      />
                    </div>
                  }
                >
                  <div style={{ textAlign: 'center' }}>
                    <Space>
                      <Button 
                        type="link" 
                        icon={<CameraOutlined />} 
                        onClick={() => setImageDrawerVisible(true)}
                      >
                        View Full Image
                      </Button>
                      
                      {receipt.additionalImages && receipt.additionalImages.length > 0 && (
                        <Badge count={receipt.additionalImages.length}>
                          <Text type="secondary">Additional Images</Text>
                        </Badge>
                      )}
                    </Space>
                  </div>
                </Card>
                
                <Card style={{ marginTop: 16 }} bordered={false} size="small">
                  <Statistic
                    title="Item Summary"
                    value={receipt.items.length}
                    suffix={`item${receipt.items.length !== 1 ? 's' : ''}`}
                    valueStyle={{ fontSize: '16px' }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Total Quantity: </Text>
                    <Text strong>{totalQuantity}</Text>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Categories: </Text>
                    <Text strong>{totalCategories}</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">{totalWithCategories} of {receipt.items.length} items categorized ({categoriesPercentage}%)</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <div className="receipt-items-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4}>
                  <Space>
                    <ShoppingCartOutlined />
                    <span>Receipt Items</span>
                  </Space>
                </Title>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={showAddItemModal}
                >
                  Add Item
                </Button>
              </div>
              
              <Table
                dataSource={receipt.items}
                columns={itemColumns}
                rowKey="id"
                pagination={false}
                size="middle"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={itemColumns.length - 1}>
                        <Text strong>Total</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <Text strong>{receipt.total.toFixed(2)} {receipt.currency}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          </>
        )}
      </Card>
      
      {/* Item Modal */}
      <Modal
        title={editingItem ? 'Edit Item' : 'Add Item'}
        open={itemModalVisible}
        onOk={handleItemModalSave}
        onCancel={() => setItemModalVisible(false)}
        maskClosable={false}
      >
        <Form
          form={itemForm}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Item Name"
            rules={[{ required: true, message: 'Please enter the item name' }]}
          >
            <Input />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Quantity"
                rules={[{ required: true, message: 'Please enter the quantity' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }} 
                  min={0.01} 
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="unit"
                label="Unit (optional)"
              >
                <Input placeholder="e.g., kg, pcs" />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="price"
            label="Price per Unit"
            rules={[{ required: true, message: 'Please enter the price' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              min={0} 
              step={0.01}
              precision={2}
            />
          </Form.Item>
          
          <Form.Item
            name="category"
            label="Category (optional)"
          >
            <Select
              showSearch
              allowClear
              placeholder="Select a category"
              optionFilterProp="children"
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="Add new category"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Would normally add new category here
                        }
                      }}
                    />
                    <Button type="text" icon={<PlusOutlined />} />
                  </Space>
                </>
              )}
            >
              {predefinedCategories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>
          
          {editingItem && (
            <Form.Item
              name="recalculateTotal"
              valuePropName="checked"
            >
              <Checkbox>Recalculate receipt total based on items</Checkbox>
            </Form.Item>
          )}
        </Form>
      </Modal>
      
      {/* Tags Modal */}
      <Modal
        title="Manage Tags"
        open={tagsModalVisible}
        onCancel={() => setTagsModalVisible(false)}
        maskClosable={false}
        footer={null}
      >
        <Form
          layout="vertical"
          initialValues={{ tags: receipt?.tags || [] }}
          onFinish={handleTagsModalSave}
        >
          <Form.Item
            name="tags"
            label="Tags"
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Add tags"
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ padding: '0 8px 4px' }}>
                    <Text type="secondary">
                      Type to create a custom tag or select from suggestions
                    </Text>
                  </div>
                </>
              )}
            >
              {predefinedTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setTagsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Save Tags
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
      
      {/* Image Drawer */}
      <Drawer
        title="Receipt Images"
        placement="right"
        onClose={() => setImageDrawerVisible(false)}
        open={imageDrawerVisible}
        width={window.innerWidth > 600 ? 600 : '100%'}
        extra={
          <Button 
            icon={<CloseOutlined />} 
            onClick={() => setImageDrawerVisible(false)}
          />
        }
      >
        <div className="receipt-image-viewer">
          <Tabs defaultActiveKey="main">
            <TabPane tab="Main Image" key="main">
              <div style={{ textAlign: 'center' }}>
                <Image
                  src={receipt.imageData || '/placeholder-receipt.png'}
                  alt="Receipt"
                  style={{ maxWidth: '100%' }}
                  fallback="/placeholder-receipt.png"
                  preview={{
                    mask: 'View Full Size'
                  }}
                />
              </div>
            </TabPane>
            
            {/* Display additional images from base64 data */}
            {receipt.additionalImages && receipt.additionalImages.length > 0 && 
              receipt.additionalImages.map((img, index) => (
                <TabPane tab={`Image ${index + 2}`} key={`additional-${index}`}>
                  <div style={{ textAlign: 'center' }}>
                    <Image
                      src={img || '/placeholder-receipt.png'}
                      alt={`Additional Receipt Image ${index + 1}`}
                      style={{ maxWidth: '100%' }}
                      fallback="/placeholder-receipt.png"
                      preview={{
                        mask: 'View Full Size'
                      }}
                    />
                  </div>
                </TabPane>
              ))
            }
          </Tabs>
        </div>
      </Drawer>
    </div>
  );
};

export default EnhancedReceiptDetail;