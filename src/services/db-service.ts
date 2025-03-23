import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Receipt } from '../types';

interface ReceiptDB extends DBSchema {
  receipts: {
    key: string;
    value: Receipt;
    indexes: {
      'by-date': Date;
      'by-store': string;
      'by-currency': string;
    };
  };
}

class DBService {
  private dbName = 'receipt-scanner-db';
  private dbVersion = 1;
  private db: Promise<IDBPDatabase<ReceiptDB>>;

  constructor() {
    this.db = this.initDB();
  }

  private async initDB(): Promise<IDBPDatabase<ReceiptDB>> {
    return openDB<ReceiptDB>(this.dbName, this.dbVersion, {
      upgrade(db) {
        const receiptStore = db.createObjectStore('receipts', { keyPath: 'id' });
        receiptStore.createIndex('by-date', 'date');
        receiptStore.createIndex('by-store', 'storeName');
        receiptStore.createIndex('by-currency', 'currency');
      },
    });
  }

  // Save a receipt to the database
  async saveReceipt(receipt: Receipt): Promise<string> {
    const db = await this.db;
    return db.put('receipts', receipt);
  }

  // Get a receipt by ID
  async getReceipt(id: string): Promise<Receipt | undefined> {
    const db = await this.db;
    return db.get('receipts', id);
  }

  // Get all receipts
  async getAllReceipts(): Promise<Receipt[]> {
    const db = await this.db;
    return db.getAll('receipts');
  }

  // Get receipts by date range
  async getReceiptsByDateRange(startDate: Date, endDate: Date): Promise<Receipt[]> {
    const db = await this.db;
    const index = db.transaction('receipts').store.index('by-date');
    
    let cursor = await index.openCursor(IDBKeyRange.bound(startDate, endDate));
    const results: Receipt[] = [];
    
    while (cursor) {
      results.push(cursor.value);
      cursor = await cursor.continue();
    }
    
    return results;
  }

  // Get receipts by store name
  async getReceiptsByStore(storeName: string): Promise<Receipt[]> {
    const db = await this.db;
    return db.getAllFromIndex('receipts', 'by-store', storeName);
  }

  // Get receipts by currency
  async getReceiptsByCurrency(currency: string): Promise<Receipt[]> {
    const db = await this.db;
    return db.getAllFromIndex('receipts', 'by-currency', currency);
  }

  // Delete a receipt
  async deleteReceipt(id: string): Promise<void> {
    const db = await this.db;
    return db.delete('receipts', id);
  }

  // Update a receipt
  async updateReceipt(receipt: Receipt): Promise<string> {
    const db = await this.db;
    receipt.updatedAt = new Date();
    return db.put('receipts', receipt);
  }

  // Clear all receipts (dangerous!)
  async clearAllReceipts(): Promise<void> {
    const db = await this.db;
    return db.clear('receipts');
  }
}

// Export as a singleton
export const dbService = new DBService();