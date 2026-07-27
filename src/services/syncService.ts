// src/services/syncService.ts
import { db } from '@/db/db'
import { supabase } from './supabase'

export async function syncToCloud() {
<<<<<<< HEAD
  if (!navigator.onLine) return

  try {
    const tables = ['wallets', 'categories', 'transactions', 'debts'] as const

    for (const tableName of tables) {
      // 1. PULL: Ambil data dari Supabase dan simpan ke Dexie lokal
      const { data: cloudData, error } = await supabase.from(tableName).select('*')
      
      if (error) {
        console.error(`Gagal pull ${tableName}:`, error)
        continue
      }

      if (cloudData && cloudData.length > 0) {
        // Bulk put akan meng-update jika ID cocok, atau insert jika belum ada
        await db.table(tableName).bulkPut(cloudData)
      }

      // 2. PUSH: Ambil data terbaru dari Dexie lokal dan upsert ke Supabase
      const localData = await db.table(tableName).toArray()
      if (localData.length > 0) {
        const { error: pushError } = await supabase.from(tableName).upsert(localData)
        if (pushError) {
          console.error(`Gagal push ${tableName}:`, pushError)
        }
      }
=======
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
>>>>>>> origin/main
    }

    console.log('✅ Sinkronisasi 2 arah berhasil!')
  } catch (err) {
    console.error('❌ Sync mengalami kegagalan fatal:', err)
  }
}
