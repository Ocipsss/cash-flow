// src/services/syncService.ts
import { db } from '@/db/db'
import { supabase } from './supabase'

export async function syncToCloud() {
  if (!navigator.onLine) return

  try {
    const tables = ['wallets', 'categories', 'transactions', 'debts'] as const

    for (const tableName of tables) {
      // 1. PULL: Ambil data terbaru dari Supabase ke Dexie lokal
      const { data: cloudData, error } = await supabase.from(tableName).select('*')

      if (error) {
        console.error(`Gagal pull ${tableName}:`, error)
        continue
      }

      if (cloudData && cloudData.length > 0) {
        await db.table(tableName).bulkPut(cloudData)
      }

      // 2. PUSH: Kirim data lokal dari Dexie ke Supabase
      const localData = await db.table(tableName).toArray()
      if (localData.length > 0) {
        const { error: pushError } = await supabase.from(tableName).upsert(localData)
        if (pushError) {
          console.error(`Gagal push ${tableName}:`, pushError)
        }
      }
    }

    console.log('✅ Synchronized with Supabase Cloud successfully!')
  } catch (err) {
    console.error('❌ Sync failed:', err)
  }
}
