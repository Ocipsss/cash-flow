// src/services/syncService.ts
import { db } from '@/db/db'
import { supabase } from './supabase'

export async function syncToCloud() {
  if (!navigator.onLine) {
    console.log('⚠️ Peranti sedang offline. Menunda sync.')
    return
  }

  try {
    console.log('🔄 Memulai 2-Way Sync...')

    // -------------------------------------------------------------
    // 1. PULL: Tarik Data dari Cloud ke Dexie Lokal HP
    // -------------------------------------------------------------
    const { data: cloudWallets, error: errWallets } = await supabase.from('wallets').select('*')
    if (errWallets) console.error('❌ Error Pull Wallets:', errWallets.message)
    if (cloudWallets && cloudWallets.length > 0) {
      await db.wallets.bulkPut(cloudWallets)
    }

    const { data: cloudTransactions, error: errTx } = await supabase.from('transactions').select('*')
    if (errTx) console.error('❌ Error Pull Transactions:', errTx.message)
    if (cloudTransactions && cloudTransactions.length > 0) {
      await db.transactions.bulkPut(cloudTransactions)
    }

    const { data: cloudDebts, error: errDebts } = await supabase.from('debts').select('*')
    if (errDebts) console.error('❌ Error Pull Debts:', errDebts.message)
    if (cloudDebts && cloudDebts.length > 0) {
      await db.debts.bulkPut(cloudDebts)
    }

    // -------------------------------------------------------------
    // 2. PUSH: Kirim Data Lokal HP ke Cloud
    // -------------------------------------------------------------
    const localWallets = await db.wallets.toArray()
    if (localWallets.length > 0) {
      const { error } = await supabase.from('wallets').upsert(localWallets)
      if (error) console.error('❌ Error Push Wallets:', error.message)
    }

    const localTransactions = await db.transactions.toArray()
    if (localTransactions.length > 0) {
      const { error } = await supabase.from('transactions').upsert(localTransactions)
      if (error) console.error('❌ Error Push Transactions:', error.message)
    }

    const localDebts = await db.debts.toArray()
    if (localDebts.length > 0) {
      const { error } = await supabase.from('debts').upsert(localDebts)
      if (error) console.error('❌ Error Push Debts:', error.message)
    }

    console.log('✅ Sinkronisasi 2 arah berhasil!')
  } catch (err) {
    console.error('❌ Sync mengalami kegagalan fatal:', err)
  }
}
