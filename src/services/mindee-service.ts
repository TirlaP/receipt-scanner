import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Receipt, ReceiptItem } from '../types';

class MindeeService {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async processReceipt(imageData: string): Promise<Receipt> {
    try {
      console.log('Processing receipt with Mindee API');
      
      // Convert base64 image data to blob for upload
      const base64Data = imageData.split(',')[1];
      const blob = this.base64ToBlob(base64Data);
      
      // Create form data for API request
      const formData = new FormData();
      formData.append('document', blob, 'receipt.jpg');
      
      // Make API request to Mindee
      const response = await axios.post(
        'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
        formData,
        {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('Mindee response:', response.data);
      
      // Extract receipt data from Mindee API response
      return this.mapToReceipt(response.data, imageData);
    } catch (error) {
      console.error('Error processing receipt with Mindee:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Mindee API error response:', error.response.data);
        }
      }
      
      throw new Error('Failed to process receipt with Mindee API');
    }
  }
  
  private mapToReceipt(mindeeData: any, imageData: string): Receipt {
    // Initialize receipt with default values
    const receipt: Receipt = {
      id: uuidv4(),
      storeName: 'Unknown Merchant',
      date: new Date(),
      total: 0,
      items: [],
      imageData,
      createdAt: new Date(),
      updatedAt: new Date(),
      currency: 'RON' // Default to RON for Romanian receipts
    };
    
    try {
      // Extract receipt data from Mindee response - using Expense Receipts V5 format
      const document = mindeeData.document;
      const prediction = document.inference.prediction;
      
      // Extract merchant name
      if (prediction.supplier_name && prediction.supplier_name.value) {
        receipt.storeName = prediction.supplier_name.value;
      }
      
      // Extract merchant address
      if (prediction.supplier_address && prediction.supplier_address.value) {
        receipt.merchantAddress = prediction.supplier_address.value;
      }
      
      // Extract merchant phone
      if (prediction.supplier_phone_number && prediction.supplier_phone_number.value) {
        receipt.merchantPhone = prediction.supplier_phone_number.value;
      }
      
      // Extract date
      if (prediction.date && prediction.date.value) {
        receipt.date = new Date(prediction.date.value);
      }
      
      // Extract total amount and currency
      if (prediction.total_amount && prediction.total_amount.value !== null) {
        receipt.total = prediction.total_amount.value;
      }
      
      // Extract currency from locale
      if (prediction.locale && prediction.locale.currency) {
        receipt.currency = prediction.locale.currency;
      }
      
      // Extract tax amount
      if (prediction.total_tax && prediction.total_tax.value !== null) {
        receipt.taxAmount = prediction.total_tax.value;
      }
      
      // Extract payment method
      if (prediction.payment_method && prediction.payment_method.value) {
        receipt.paymentMethod = prediction.payment_method.value;
      }
      
      // Extract line items if available
      if (prediction.line_items && prediction.line_items.length > 0) {
        // Map each line item from the Mindee response to our ReceiptItem format
        receipt.items = prediction.line_items.map(item => {
          return {
            id: uuidv4(),
            name: item.description, // Direct access to the description property
            quantity: item.quantity || 1,
            price: item.unit_price || 0,
            totalAmount: item.total_amount || 0,
            unit: item.quantity > 1 ? 'pcs' : '', // Default unit based on quantity
            category: '' // No category information from Mindee API
          } as ReceiptItem;
        });
        
        console.log(`Extracted ${receipt.items.length} items from receipt`);
      }
      
      // If no items detected or something went wrong, create a dummy item for the total
      if (receipt.items.length === 0 && receipt.total > 0) {
        receipt.items.push({
          id: uuidv4(),
          name: 'Total Amount',
          quantity: 1,
          price: receipt.total,
          totalAmount: receipt.total,
          unit: 'pcs',
          category: ''
        });
        console.log('No items detected, created dummy item with total amount');
      }
      
    } catch (parseError) {
      console.error('Error parsing Mindee response:', parseError);
      // Return the basic receipt with at least the image if parsing fails
      receipt.items.push({
        id: uuidv4(),
        name: 'Receipt Total',
        quantity: 1,
        price: 0,
        totalAmount: 0,
        unit: 'pcs',
        category: ''
      });
    }
    
    return receipt;
  }
  
  private base64ToBlob(base64: string): Blob {
    const byteString = atob(base64);
    const mimeString = 'image/jpeg';
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  }
}

// Initialize with your API key
const mindeeService = new MindeeService('f2a72ef7ce669fb1422c93410b9465d7');

export default mindeeService;