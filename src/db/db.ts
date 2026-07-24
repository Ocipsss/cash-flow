// db.ts
import Dexie, { type Table } from 'dexie';

export interface Wallet {
  id?: number;
  name: string;      // 'Cash', 'Rekening Septian', 'Rekening Warung', 'RDN'
  balance: number;   // Saldo saat ini
}

export interface Category {
  id?: number;
  name: string;      // 'Makan', 'Rokok', 'Gaji', dll.
  type: 'income' | 'expense';
}

export interface Transaction {
  id?: number;
  type: 'income' | 'expense' | 'transfer';
  walletId: number;         // Dompet asal / dompet transaksi
  targetWalletId?: number;  // Hanya diisi jika type === 'transfer'
  category?: string;        // 'Makan', 'Bensin', dll (null jika transfer)
  amount: number;
  date: string;             // ISO Date string (YYYY-MM-DDTHH:mm)
  notes?: string;
}

export class FinancialDB extends Dexie {
  wallets!: Table<Wallet>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;

  constructor() {
    super('FinancialAppDB');
    this.version(1).stores({
      wallets: '++id, name',
      categories: '++id, name, type',
      transactions: '++id, type, walletId, category, date'
    });
  }
}

export const db = new FinancialDB();
