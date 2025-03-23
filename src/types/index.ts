// Receipt data types
export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  unit?: string;
  category?: string;
  totalAmount?: number;
}

export interface Receipt {
  id: string;
  storeName: string;
  date: Date;
  total: number;
  items: ReceiptItem[];
  imageData: string; // Base64 encoded image data
  imageUrl?: string; // URL to image in Firebase Storage
  additionalImages?: string[]; // For multi-photo receipts (base64)
  additionalImageUrls?: string[]; // For multi-photo receipts (URLs)
  createdAt: Date;
  updatedAt: Date;
  currency?: string;
  taxAmount?: number;
  taxRate?: number;
  documentType?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  paymentMethod?: string;
  notes?: string;
  tags?: string[];
}

export interface NewReceipt extends Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'> {}

// Export options
export interface ExportOptions {
  filename: string;
  includeItems: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  groupBy?: 'none' | 'store' | 'date' | 'category' | 'currency';
  fileFormat: 'xlsx' | 'csv' | 'pdf';
}

// Mindee API response types
export interface MindeePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MindeeField<T> {
  value: T;
  confidence: number;
  polygon: MindeePosition[];
}

export interface MindeeItem {
  description?: MindeeField<string>;
  quantity?: MindeeField<number>;
  unit_price?: MindeeField<number>;
  total_amount?: MindeeField<number>;
  tax_rate?: MindeeField<number>;
}

export interface MindeeInference {
  prediction: {
    locale: {
      currency: string;
      language: string;
      country: string;
    };
    date?: MindeeField<string>;
    time?: MindeeField<string>;
    total_amount?: MindeeField<number>;
    total_tax?: MindeeField<number>;
    tip?: MindeeField<number>;
    supplier_name?: MindeeField<string>;
    supplier_address?: MindeeField<string>;
    supplier_phone?: MindeeField<string>;
    supplier_company_registrations?: any[];
    taxes?: any[];
    payment_card?: MindeeField<string>;
    payment_method?: MindeeField<string>;
    line_items?: MindeeItem[];
  };
}

export interface MindeeResponse {
  document: {
    id: string;
    inference: MindeeInference;
  };
}

// Dashboard statistics
export interface DashboardStats {
  totalReceipts: number;
  totalSpending: Record<string, number>;
  recentSpending: Record<string, number>;
  topStores: Array<{
    store: string;
    amount: number;
    currency: string;
  }>;
  spendingByMonth: Array<{
    month: string;
    amount: number;
    currency: string;
  }>;
  spendingByCategory: Array<{
    category: string;
    amount: number;
    currency: string;
  }>;
}