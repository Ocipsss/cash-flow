// src/services/syncService.ts
import { db } from '@/db/db'
import { supabase } from './supabase'

export async function syncToCloud() {
  if (!navigator.onLine) return // Skip jika HP offline

  try {
    // -------------------------------------------------------------
    // 1. PULL: Tarik Data Terbaru dari Supabase Cloud ke IndexedDB HP
    // -------------------------------------------------------------
    const { data: cloudWallets } = await supabase.from('wallets').select('*')
    if (cloudWallets && cloudWallets.length > 0) {
      await db.wallets.bulkPut(cloudWallets)
    }

    const { data: cloudTransactions } = await supabase.from('transactions').select('*')
    if (cloudTransactions && cloudTransactions.length > 0) {
      await db.transactions.bulkPut(cloudTransactions)
    }

    const { data: cloudDebts } = await supabase.from('debts').select('*')
    if (cloudDebts && cloudDebts.length > 0) {
      await db.debts.bulkPut(cloudDebts)
    }

    // -------------------------------------------------------------
    // 2. PUSH: Kirim Data Lokal HP ke Supabase Cloud
    // -------------------------------------------------------------
    const localWallets = await db.wallets.toArray()
    if (localWallets.length > 0) {
      await supabase.from('wallets').upsert(localWallets)
    }

    const localTransactions = await db.transactions.toArray()
    if (localTransactions.length > 0) {
      await supabase.from('transactions').upsert(localTransactions)
    }

    const localDebts = await db.debts.toArray()
    if (localDebts.length > 0) {
      await supabase.from('debts').upsert(localDebts)
    }

    console.log('✅ Synchronized 2-Way with Supabase successfully!')
  } catch (err) {
    console.error('❌ Sync failed:', err)
  }
}
