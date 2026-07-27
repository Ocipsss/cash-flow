// src/db/db.ts
import Dexie, { type Table } from 'dexie'

export interface Wallet {
  id: string // Gunakan UUID (string) alih-alih number
  name: string
  balance: number
  updated_at?: string
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  updated_at?: string
}

export interface Transaction {
  id: string
  type: 'income' | 'expense' | 'transfer' | 'debt_repayment'
  walletId: string
  targetWalletId?: string
  category?: string
  amount: number
  date: string
  notes?: string
  updated_at?: string
}

export interface Debt {
  id: string
  fromWalletId: string
  toWalletId: string
  amount: number
  notes?: string
  isPaid: boolean
  date: string
  updated_at?: string
}

export class FinancialDB extends Dexie {
  wallets!: Table<Wallet, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  debts!: Table<Debt, string>

  constructor() {
    super('FinancialAppDB')

    // Versi 3: ID menggunakan String / UUID murni (tanpa ++id)
    this.version(3).stores({
      wallets: 'id, name',
      categories: 'id, name, type',
      transactions: 'id, type, walletId, category, date',
      debts: 'id, fromWalletId, toWalletId, isPaid, date'
    })

    this.on('populate', async () => {
      // Default Wallets dengan Fixed UUID
      await this.wallets.bulkAdd([
        { id: 'w-cash', name: 'Cash', balance: 0 },
        { id: 'w-septian', name: 'Rekening Septian', balance: 0 },
        { id: 'w-warung', name: 'Rekening Warung', balance: 0 },
        { id: 'w-rdn', name: 'RDN', balance: 0 }
      ])

      // Default Categories dengan Fixed UUID
      await this.categories.bulkAdd([
        { id: 'c-gaji', name: 'Gaji', type: 'income' },
        { id: 'c-ojol', name: 'Ojol', type: 'income' },
        { id: 'c-freelance', name: 'Freelance', type: 'income' },
        { id: 'c-warung-inc', name: 'Warung', type: 'income' },
        { id: 'c-jabin', name: 'JaBin', type: 'expense' },
        { id: 'c-makan', name: 'Makan', type: 'expense' },
        { id: 'c-rokok', name: 'Rokok', type: 'expense' },
        { id: 'c-bensin', name: 'Bensin', type: 'expense' },
        { id: 'c-jajan-pr', name: 'Jajan Pribadi', type: 'expense' },
        { id: 'c-jajan-kl', name: 'Jajan Keluarga', type: 'expense' },
        { id: 'c-sosial', name: 'Sosial', type: 'expense' },
        { id: 'c-lain', name: 'Lain-lain', type: 'expense' }
      ])
    })
  }
}

export const db = new FinancialDB()
