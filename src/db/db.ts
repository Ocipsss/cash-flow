// src/db/db.ts
import Dexie, { type Table } from 'dexie';

export interface Wallet {
  id?: number;
  name: string;
  balance: number;
}

export interface Category {
  id?: number;
  name: string;
  type: 'income' | 'expense';
}

export interface Transaction {
  id?: number;
  type: 'income' | 'expense' | 'transfer' | 'debt_repayment';
  walletId: number;
  targetWalletId?: number;
  category?: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Debt {
  id?: number;
  fromWalletId: number; // Dompet Peminjam (Utang)
  toWalletId: number;   // Dompet Pemberi Pinjaman (Piutang)
  amount: number;       // Nominal
  notes?: string;
  isPaid: boolean;      // Status Lunas
  date: string;
}

export class FinancialDB extends Dexie {
  wallets!: Table<Wallet>;
  categories!: Table<Category>;
  transactions!: Table<Transaction>;
  debts!: Table<Debt>;

  constructor() {
    super('FinancialAppDB');

    // Upgrade ke versi 2 untuk menambahkan tabel debts
    this.version(2).stores({
      wallets: '++id, name',
      categories: '++id, name, type',
      transactions: '++id, type, walletId, category, date',
      debts: '++id, fromWalletId, toWalletId, isPaid, date'
    });

    this.on('populate', async () => {
      await this.wallets.bulkAdd([
        { name: 'Cash', balance: 0 },
        { name: 'Rekening Septian', balance: 0 },
        { name: 'Rekening Warung', balance: 0 },
        { name: 'RDN', balance: 0 }
      ]);

      await this.categories.bulkAdd([
        // Pendapatan
        { name: 'Gaji', type: 'income' },
        { name: 'Ojol', type: 'income' },
        { name: 'Freelance', type: 'income' },
        { name: 'Warung', type: 'income' },
        // Pengeluaran
        { name: 'JaBin', type: 'expense' },
        { name: 'Makan', type: 'expense' },
        { name: 'Rokok', type: 'expense' },
        { name: 'Bensin', type: 'expense' },
        { name: 'Jajan Pribadi', type: 'expense' },
        { name: 'Jajan Keluarga', type: 'expense' },
        { name: 'Sosial', type: 'expense' },
        { name: 'Lain-lain', type: 'expense' }
      ]);
    });
  }
}

export const db = new FinancialDB();
