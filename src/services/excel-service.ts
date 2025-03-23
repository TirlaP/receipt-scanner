import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Receipt, ExportOptionsType } from '../types';

class ExcelService {
  // Convert receipts to Excel format and trigger download
  async exportToExcel(receipts: Receipt[], options: ExportOptionsType): Promise<void> {
    if (!receipts.length) {
      throw new Error('No receipts to export');
    }

    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      if (options.groupBy === 'none' || !options.groupBy) {
        // Create main sheet with all receipts
        const summaryData = this.createSummaryData(receipts, options);
        const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Receipts Summary');
        
        // Optionally create detailed items sheet
        if (options.includeItems) {
          const itemsData = this.createItemsData(receipts);
          const itemsWorksheet = XLSX.utils.json_to_sheet(itemsData);
          XLSX.utils.book_append_sheet(workbook, itemsWorksheet, 'Receipt Items');
        }
      } else {
        // Group by the specified field
        const groupedReceipts = this.groupReceipts(receipts, options.groupBy);
        
        // Create a sheet for each group
        Object.entries(groupedReceipts).forEach(([groupName, groupReceipts]) => {
          const groupData = this.createSummaryData(groupReceipts, options);
          const groupWorksheet = XLSX.utils.json_to_sheet(groupData);
          XLSX.utils.book_append_sheet(workbook, groupWorksheet, groupName.substring(0, 31)); // Excel sheet name max length is 31
          
          // Add items sheet for each group if requested
          if (options.includeItems) {
            const itemsData = this.createItemsData(groupReceipts);
            const itemsWorksheet = XLSX.utils.json_to_sheet(itemsData);
            XLSX.utils.book_append_sheet(workbook, itemsWorksheet, `${groupName.substring(0, 27)} Items`);
          }
        });
      }
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Construct filename
      const filename = options.filename || `receipt-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      // Trigger download
      saveAs(blob, filename);
    } catch (error) {
      console.error('Excel export error:', error);
      throw new Error('Failed to export receipts to Excel');
    }
  }

  private createSummaryData(receipts: Receipt[], options: ExportOptionsType): any[] {
    return receipts.map(receipt => ({
      'Store': receipt.storeName,
      'Date': format(new Date(receipt.date), 'yyyy-MM-dd'),
      'Total': receipt.total.toFixed(2),
      'Items Count': receipt.items.length,
      'Scanned Date': format(new Date(receipt.createdAt), 'yyyy-MM-dd')
    }));
  }

  private createItemsData(receipts: Receipt[]): any[] {
    const items: any[] = [];
    
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        items.push({
          'Store': receipt.storeName,
          'Receipt Date': format(new Date(receipt.date), 'yyyy-MM-dd'),
          'Item': item.name,
          'Quantity': item.quantity,
          'Price': item.price.toFixed(2),
          'Total': (item.quantity * item.price).toFixed(2),
          'Category': item.category || ''
        });
      });
    });
    
    return items;
  }

  private groupReceipts(receipts: Receipt[], groupBy: string): Record<string, Receipt[]> {
    const grouped: Record<string, Receipt[]> = {};
    
    receipts.forEach(receipt => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'store':
          groupKey = receipt.storeName || 'Unknown Store';
          break;
        case 'date':
          groupKey = format(new Date(receipt.date), 'yyyy-MM');
          break;
        case 'category':
          // We'll group by the most common category in the receipt
          const categories = receipt.items
            .map(item => item.category || 'Uncategorized')
            .reduce<Record<string, number>>((acc, cat) => {
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {});
          
          let maxCount = 0;
          let maxCategory = 'Uncategorized';
          
          Object.entries(categories).forEach(([cat, count]) => {
            if (count > maxCount) {
              maxCount = count;
              maxCategory = cat;
            }
          });
          
          groupKey = maxCategory;
          break;
        default:
          groupKey = 'All Receipts';
      }
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      
      grouped[groupKey].push(receipt);
    });
    
    return grouped;
  }
}

// Export as a singleton
export const excelService = new ExcelService();