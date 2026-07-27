// src/composables/useFinance.ts
import { db } from '@/db/db'
import { syncToCloud } from '@/services/syncService'
import { useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'

export function useFinance() {
  // 1. Live Queries (Reaktif ke UI Vue)
  const wallets = useObservable(
    liveQuery(() => db.wallets.toArray())
  )

  const categories = useObservable(
    liveQuery(() => db.categories.toArray())
  )

  const recentTransactions = useObservable(
    liveQuery(() => db.transactions.orderBy('date').reverse().limit(20).toArray())
  )

  const activeDebts = useObservable(
    liveQuery(() => db.debts.where('isPaid').equals(false).toArray())
  )

  // 🔄 HELPER: Hitung Ulang Seluruh Saldo Dompet Berdasarkan Riwayat Transaksi
  async function recalculateWalletBalances() {
    await db.transaction('rw', [db.wallets, db.transactions], async () => {
      const allWallets = await db.wallets.toArray()
      const allTransactions = await db.transactions.toArray()

      for (const wallet of allWallets) {
        let newBalance = 0

        for (const tx of allTransactions) {
          // Saldo terpotong jika dompet ini adalah asal transaksi
          if (tx.walletId === wallet.id) {
            if (tx.type === 'expense') newBalance -= tx.amount
            if (tx.type === 'income') newBalance += tx.amount
            if (tx.type === 'transfer' || tx.type === 'debt_repayment') newBalance -= tx.amount
          }
          // Saldo bertambah jika dompet ini adalah tujuan transfer/pinjaman
          if (tx.targetWalletId === wallet.id) {
            if (tx.type === 'transfer' || tx.type === 'debt_repayment') newBalance += tx.amount
          }
        }

        // Update saldo akhir di database
        await db.wallets.update(wallet.id, { balance: newBalance })
      }
    })
  }

  // 🗑️ HELPER: Hapus Database Lama & Re-populate Default Identitas UUID
  async function resetDatabase() {
    try {
      await db.delete() // Hapus total database lokal dari IndexedDB
      await db.open()   // Buka kembali agar event 'populate' ter-trigger ulang dari awal

      await recalculateWalletBalances()
      alert('Database berhasil di-reset ke versi bersih!')
      window.location.reload()
    } catch (err: any) {
      alert('Gagal me-reset database: ' + (err.message || 'Error tidak diketahui'))
    }
  }

  // 2. Fungsi Pinjam Antar-Dompet
  async function borrowMoney(
    borrowerWalletId: string, 
    lenderWalletId: string, 
    amount: number, 
    notes?: string,
    customDate?: string
  ) {
    if (amount <= 0) throw new Error('Nominal pinjaman harus lebih dari 0')
    if (borrowerWalletId === lenderWalletId) throw new Error('Dompet peminjam dan pemberi tidak boleh sama')

    const date = customDate || new Date().toISOString()

    await db.transaction('rw', [db.wallets, db.transactions, db.debts], async () => {
      const lender = await db.wallets.get(lenderWalletId)
      const borrower = await db.wallets.get(borrowerWalletId)

      if (!lender || !borrower) throw new Error('Dompet tidak ditemukan')

      // Catat Utang Internal (UUID)
      await db.debts.add({
        id: crypto.randomUUID(),
        fromWalletId: borrowerWalletId,
        toWalletId: lenderWalletId,
        amount,
        notes: notes || `Pinjam dari ${lender.name}`,
        isPaid: false,
        date
      })

      // Catat Log Transaksi (UUID)
      await db.transactions.add({
        id: crypto.randomUUID(),
        type: 'transfer',
        walletId: lenderWalletId,
        targetWalletId: borrowerWalletId,
        amount,
        notes: `[Pinjaman] ${notes || ''}`,
        date
      })
    })

    // Hitung ulang saldo seluruh dompet
    await recalculateWalletBalances()

    // Sync latar belakang
    syncToCloud()
  }

  // 3. Fungsi Bayar Utang Internal
  async function payDebt(debtId: string, customDate?: string) {
    const date = customDate || new Date().toISOString()

    await db.transaction('rw', [db.wallets, db.transactions, db.debts], async () => {
      const debt = await db.debts.get(debtId)
      if (!debt) throw new Error('Data utang tidak ditemukan')

      // Tandai Lunas (Boolean)
      await db.debts.update(debtId, { isPaid: true })

      // Catat Log Pelunasan (UUID)
      await db.transactions.add({
        id: crypto.randomUUID(),
        type: 'debt_repayment',
        walletId: debt.fromWalletId,
        targetWalletId: debt.toWalletId,
        amount: debt.amount,
        notes: `[Pelunasan] ${debt.notes || ''}`,
        date
      })
    })

    // Hitung ulang saldo seluruh dompet
    await recalculateWalletBalances()

    syncToCloud()
  }

  // 4. Transaksi Reguler (Pengeluaran / Pemasukan / Transfer)
  async function addTransaction(payload: {
    type: 'income' | 'expense' | 'transfer'
    walletId: string
    targetWalletId?: string
    category?: string
    amount: number
    notes?: string
    date?: string
  }) {
    if (payload.amount <= 0) throw new Error('Nominal transaksi harus lebih dari 0')

    const txDate = payload.date || new Date().toISOString()

    await db.transaction('rw', [db.wallets, db.transactions], async () => {
      const sourceWallet = await db.wallets.get(payload.walletId)
      if (!sourceWallet) throw new Error('Dompet asal tidak ditemukan')

      await db.transactions.add({
        id: crypto.randomUUID(),
        type: payload.type,
        walletId: payload.walletId,
        targetWalletId: payload.targetWalletId,
        category: payload.category,
        amount: payload.amount,
        notes: payload.notes,
        date: txDate
      })
    })

    // Hitung ulang saldo seluruh dompet berdasarkan transaksi yang ada
    await recalculateWalletBalances()

    syncToCloud()
  }

  // 5. Update Transaksi Eksisting (Fitur Edit)
  // src/composables/useFinance.ts
async function updateTransaction(
  id: string,
  payload: {
    type: 'income' | 'expense' | 'transfer'
    walletId: string
    targetWalletId?: string
    category?: string
    amount: number
    notes?: string
    date?: string
  }
) {
  if (payload.amount <= 0) throw new Error('Nominal transaksi harus lebih dari 0')

  const txDate = payload.date || new Date().toISOString()

  await db.transaction('rw', [db.wallets, db.transactions], async () => {
    const existingTx = await db.transactions.get(id)
    if (!existingTx) throw new Error('Transaksi tidak ditemukan')

    // Pastikan field opsional dibersihkan jika tipe transaksi berubah
    await db.transactions.put({
      ...existingTx,
      type: payload.type,
      walletId: payload.walletId,
      targetWalletId: payload.type === 'transfer' ? payload.targetWalletId : undefined,
      category: payload.type !== 'transfer' ? payload.category : undefined,
      amount: payload.amount,
      notes: payload.notes,
      date: txDate,
      updated_at: new Date().toISOString()
    })
  })

  await recalculateWalletBalances()
  syncToCloud()
}


  // 6. Fitur Backup & Restore (JSON Manual)
  async function exportBackup() {
    const walletsData = await db.wallets.toArray()
    const categoriesData = await db.categories.toArray()
    const transactionsData = await db.transactions.toArray()
    const debtsData = await db.debts.toArray()

    const backupObj = {
      version: 3,
      exportedAt: new Date().toISOString(),
      wallets: walletsData,
      categories: categoriesData,
      transactions: transactionsData,
      debts: debtsData
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `backup_keuangan_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  async function importBackup(file: File) {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string
          const parsed = JSON.parse(content)

          if (!parsed.wallets || !parsed.transactions) {
            throw new Error('Format file backup tidak valid')
          }

          await db.transaction('rw', [db.wallets, db.categories, db.transactions, db.debts], async () => {
            await db.wallets.clear()
            await db.categories.clear()
            await db.transactions.clear()
            await db.debts.clear()

            if (parsed.wallets?.length) await db.wallets.bulkAdd(parsed.wallets)
            if (parsed.categories?.length) await db.categories.bulkAdd(parsed.categories)
            if (parsed.transactions?.length) await db.transactions.bulkAdd(parsed.transactions)
            if (parsed.debts?.length) await db.debts.bulkAdd(parsed.debts)
          })

          await recalculateWalletBalances()
          syncToCloud()
          resolve()
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Gagal membaca file'))
      reader.readAsText(file)
    })
  }

  // 7. Helper Formatter Angka
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0)
  }

  return {
    wallets,
    categories,
    recentTransactions,
    activeDebts,
    borrowMoney,
    payDebt,
    addTransaction,
    updateTransaction,
    exportBackup,
    importBackup,
    formatRupiah,
    recalculateWalletBalances,
    resetDatabase
  }
}
