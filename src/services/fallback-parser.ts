import { v4 as uuidv4 } from 'uuid';
import { Receipt, ReceiptItem } from '../types';

/**
 * This is a fallback service that provides basic receipt parsing
 * without requiring an external API. It uses simple regex patterns
 * to extract information from receipt text.
 */
class FallbackParser {
  /**
   * Parse receipt data directly from an image without an external API.
   * This is a simplified version that creates a basic receipt structure
   * for manual editing.
   */
  createFallbackReceipt(imageData: string): Receipt {
    // Create a basic receipt with default values
    const receipt: Receipt = {
      id: uuidv4(),
      storeName: 'Unknown Store',
      date: new Date(),
      total: 0,
      items: [],
      imageData,
      createdAt: new Date(),
      updatedAt: new Date(),
      currency: 'RON', // Default to RON for Romanian receipts
      notes: 'Added using fallback parser. Please edit details manually.'
    };
    
    // Add a placeholder item
    receipt.items.push({
      id: uuidv4(),
      name: 'Item',
      quantity: 1,
      price: 0,
      unit: 'pcs',
      category: ''
    });
    
    return receipt;
  }
  
  /**
   * Process receipt text if OCR has already been performed.
   * This attempts to extract basic information using regex patterns.
   */
  parseReceiptFromText(text: string, imageData: string): Receipt {
    // Default receipt structure
    const receipt: Receipt = {
      id: uuidv4(),
      storeName: 'Unknown Store',
      date: new Date(),
      total: 0,
      items: [],
      imageData,
      createdAt: new Date(),
      updatedAt: new Date(),
      currency: 'RON'
    };
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Extract store name (typically in the first few lines)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('kaufland') || line.includes('carrefour') || 
          line.includes('lidl') || line.includes('auchan') ||
          line.includes('mega image') || line.includes('penny')) {
        receipt.storeName = lines[i];
        break;
      }
    }
    
    // Extract total - look for keywords and nearby numbers
    const totalPatterns = [
      /total\s*:?\s*(\d+[\.,]\d+)/i,
      /suma\s*:?\s*(\d+[\.,]\d+)/i,
      /total\s*(\d+[\.,]\d+)/i
    ];
    
    for (const line of lines) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          receipt.total = parseFloat(match[1].replace(',', '.'));
          break;
        }
      }
      
      if (receipt.total > 0) break;
    }
    
    // Extract date - look for date patterns
    const datePatterns = [
      /(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/,  // DD/MM/YYYY or DD.MM.YYYY
      /(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/     // YYYY/MM/DD or YYYY.MM.DD
    ];
    
    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            // If first number is year (2000+)
            if (parseInt(match[1]) > 2000) {
              receipt.date = new Date(parseInt(match[1]), parseInt(match[2])-1, parseInt(match[3]));
            } else {
              // Assume European format: day/month/year
              const year = parseInt(match[3]);
              const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
              receipt.date = new Date(fullYear, parseInt(match[2])-1, parseInt(match[1]));
            }
            break;
          } catch (e) {
            // Invalid date, continue searching
          }
        }
      }
      
      if (receipt.date !== new Date()) break;
    }
    
    // Try to extract items - this is very basic and prone to errors
    const itemLine = /(.+?)\s+(\d+[\.,]?\d*)\s*x?\s*(\d+[\.,]?\d*)/;
    
    for (let i = 5; i < lines.length - 5; i++) {
      const line = lines[i];
      
      // Skip lines that are likely headers or footers
      if (line.toLowerCase().includes('total') || 
          line.toLowerCase().includes('subtotal') ||
          line.toLowerCase().includes('suma')) {
        continue;
      }
      
      const match = line.match(itemLine);
      if (match) {
        const name = match[1].trim();
        const price = parseFloat(match[3].replace(',', '.'));
        
        if (name && price > 0) {
          receipt.items.push({
            id: uuidv4(),
            name,
            quantity: 1,
            price,
            unit: 'pcs',
            category: ''
          });
        }
      }
    }
    
    // If no items found but we have a total, add a single item with the total
    if (receipt.items.length === 0 && receipt.total > 0) {
      receipt.items.push({
        id: uuidv4(),
        name: 'Total',
        quantity: 1,
        price: receipt.total,
        unit: 'pcs',
        category: ''
      });
    }
    
    return receipt;
  }
}

// Export as a singleton
export const fallbackParser = new FallbackParser();