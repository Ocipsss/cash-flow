// src/services/syncService.ts
import { db } from '@/db/db'
import { supabase } from './supabase'

export async function syncToCloud() {
  if (!navigator.onLine) return // Skip jika HP sedang offline

  try {
    // 1. Sync Wallets (Upsert/Update jika sudah ada ID-nya)
    const localWallets = await db.wallets.toArray()
    if (localWallets.length > 0) {
      await supabase.from('wallets').upsert(localWallets)
    }

    // 2. Sync Transactions
    const localTransactions = await db.transactions.toArray()
    if (localTransactions.length > 0) {
      await supabase.from('transactions').upsert(localTransactions)
    }

    // 3. Sync Debts
    const localDebts = await db.debts.toArray()
    if (localDebts.length > 0) {
      await supabase.from('debts').upsert(localDebts)
    }

    console.log('✅ Synchronized with Supabase Cloud successfully!')
  } catch (err) {
    console.error('❌ Sync failed:', err)
  }
}
