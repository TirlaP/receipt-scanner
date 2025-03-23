import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Receipt, ExportOptions } from '../types';

class FileService {
  // Convert File object to base64 string
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  // Convert base64 string to File object for camera captures
  async base64ToFile(base64String: string, fileName: string): Promise<File> {
    // Extract the MIME type from the base64 string
    const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string format');
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const byteString = atob(base64Data);
    
    // Convert base64 to binary
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      uint8Array[i] = byteString.charCodeAt(i);
    }
    
    // Create Blob and File object
    const blob = new Blob([arrayBuffer], { type: mimeType });
    
    // Create File object with current date
    return new File([blob], fileName, { 
      type: mimeType,
      lastModified: Date.now()
    });
  }

  // Check if file is a valid image
  isValidImage(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    return validTypes.includes(file.type);
  }

  // Check if file size is within limits
  isValidSize(file: File, maxSizeMB: number = 5): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  // Generate a thumbnail from the image
  async generateThumbnail(imageData: string, maxWidth: number = 300): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions, maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        const width = Math.min(maxWidth, img.width);
        const height = width / aspectRatio;
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get data URL
        try {
          const thumbnailData = canvas.toDataURL('image/jpeg', 0.7);
          resolve(thumbnailData);
        } catch (error) {
          reject(new Error('Failed to generate thumbnail'));
        }
      };
      
      img.onerror = () => {
        reject(new Error('Error loading image'));
      };
      
      img.src = imageData;
    });
  }

  // Convert a data URL to Blob
  dataURLToBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  // Export receipts to Excel/CSV
  async exportReceipts(receipts: Receipt[], options: ExportOptions): Promise<void> {
    try {
      // Filter receipts by date range if provided
      let filteredReceipts = receipts;
      if (options.dateRange) {
        filteredReceipts = receipts.filter(receipt => {
          const receiptDate = new Date(receipt.date);
          return (
            receiptDate >= options.dateRange!.startDate &&
            receiptDate <= options.dateRange!.endDate
          );
        });
      }

      // Group receipts if needed
      let groupedData: any;
      
      switch (options.groupBy) {
        case 'store':
          groupedData = this.groupReceiptsByStore(filteredReceipts, options.includeItems);
          break;
        case 'date':
          groupedData = this.groupReceiptsByDate(filteredReceipts, options.includeItems);
          break;
        case 'currency':
          groupedData = this.groupReceiptsByCurrency(filteredReceipts, options.includeItems);
          break;
        default:
          groupedData = {
            'All Receipts': this.formatReceiptsForExport(filteredReceipts, options.includeItems)
          };
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Add sheets for each group
      Object.entries(groupedData).forEach(([groupName, data]) => {
        const worksheet = XLSX.utils.json_to_sheet(data as any[]);
        XLSX.utils.book_append_sheet(workbook, worksheet, groupName.substring(0, 31)); // Excel has 31 char limit
      });

      // Export based on file format
      switch (options.fileFormat) {
        case 'xlsx':
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(excelBlob, options.filename + '.xlsx');
          break;
        case 'csv':
          // Export first sheet as CSV
          const firstSheetName = Object.keys(groupedData)[0];
          const csvContent = XLSX.utils.sheet_to_csv(
            XLSX.utils.json_to_sheet(groupedData[firstSheetName] as any[])
          );
          const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
          saveAs(csvBlob, options.filename + '.csv');
          break;
        default:
          throw new Error(`Unsupported export format: ${options.fileFormat}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw new Error('Failed to export receipts');
    }
  }

  private formatReceiptsForExport(receipts: Receipt[], includeItems: boolean): any[] {
    if (!includeItems) {
      // Format summary data without line items
      return receipts.map(receipt => ({
        'Store': receipt.storeName,
        'Date': this.formatDate(receipt.date),
        'Total': receipt.total,
        'Currency': receipt.currency || '',
        'Items Count': receipt.items.length,
        'Scanned Date': this.formatDate(receipt.createdAt),
        'Tax Amount': receipt.taxAmount || '',
        'Payment Method': receipt.paymentMethod || '',
        'Notes': receipt.notes || ''
      }));
    } else {
      // Format with line items, but with only one total per receipt
      const rows: any[] = [];
      
      receipts.forEach(receipt => {
        if (receipt.items.length === 0) {
          // Add one row for receipts without items
          rows.push({
            'Store': receipt.storeName,
            'Receipt Date': this.formatDate(receipt.date),
            'Item': 'No items',
            'Quantity': '',
            'Unit': '',
            'Price': '',
            'Item Total': '',
            'Receipt Total': receipt.total,
            'Currency': receipt.currency || '',
            'Category': ''
          });
        } else {
          // Add a row for each item, but include receipt total only in the first row
          receipt.items.forEach((item, index) => {
            rows.push({
              'Store': receipt.storeName,
              'Receipt Date': this.formatDate(receipt.date),
              'Item': item.name,
              'Quantity': item.quantity,
              'Unit': item.unit || '',
              'Price': item.price,
              'Item Total': (item.quantity * item.price),
              'Receipt Total': index === 0 ? receipt.total : '',  // Only include total in first row
              'Currency': receipt.currency || '',
              'Category': item.category || ''
            });
          });
        }
      });
      
      return rows;
    }
  }

  private groupReceiptsByStore(receipts: Receipt[], includeItems: boolean): Record<string, any[]> {
    const grouped: Record<string, Receipt[]> = {};
    
    receipts.forEach(receipt => {
      const storeName = receipt.storeName || 'Unknown Store';
      
      if (!grouped[storeName]) {
        grouped[storeName] = [];
      }
      
      grouped[storeName].push(receipt);
    });
    
    const result: Record<string, any[]> = {};
    
    Object.entries(grouped).forEach(([store, storeReceipts]) => {
      result[store] = this.formatReceiptsForExport(storeReceipts, includeItems);
    });
    
    return result;
  }

  private groupReceiptsByDate(receipts: Receipt[], includeItems: boolean): Record<string, any[]> {
    const grouped: Record<string, Receipt[]> = {};
    
    receipts.forEach(receipt => {
      const date = new Date(receipt.date);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[yearMonth]) {
        grouped[yearMonth] = [];
      }
      
      grouped[yearMonth].push(receipt);
    });
    
    const result: Record<string, any[]> = {};
    
    Object.entries(grouped).forEach(([yearMonth, dateReceipts]) => {
      result[yearMonth] = this.formatReceiptsForExport(dateReceipts, includeItems);
    });
    
    return result;
  }

  private groupReceiptsByCurrency(receipts: Receipt[], includeItems: boolean): Record<string, any[]> {
    const grouped: Record<string, Receipt[]> = {};
    
    receipts.forEach(receipt => {
      const currency = receipt.currency || 'Unknown';
      
      if (!grouped[currency]) {
        grouped[currency] = [];
      }
      
      grouped[currency].push(receipt);
    });
    
    const result: Record<string, any[]> = {};
    
    Object.entries(grouped).forEach(([currency, currencyReceipts]) => {
      result[currency] = this.formatReceiptsForExport(currencyReceipts, includeItems);
    });
    
    return result;
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

// Export as a singleton
export const fileService = new FileService();