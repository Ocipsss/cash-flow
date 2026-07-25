// src/composables/useFinance.ts
import { db } from '@/db/db';
import { useObservable } from '@vueuse/rxjs';
import { liveQuery } from 'dexie';

export function useFinance() {
  // 1. Live Queries (Otomatis Sync ke UI)
  const wallets = useObservable(
    liveQuery(() => db.wallets.toArray())
  );

  const categories = useObservable(
    liveQuery(() => db.categories.toArray())
  );

  const recentTransactions = useObservable(
    liveQuery(() => db.transactions.orderBy('date').reverse().limit(20).toArray())
  );

  const activeDebts = useObservable(
    liveQuery(() => db.debts.where('isPaid').equals(0).toArray())
  );

  // 2. Fungsi Pinjam Antar-Dompet
  async function borrowMoney(
    borrowerWalletId: number, 
    lenderWalletId: number, 
    amount: number, 
    notes?: string,
    customDate?: string
  ) {
    if (amount <= 0) throw new Error('Nominal pinjaman harus lebih dari 0');
    if (borrowerWalletId === lenderWalletId) throw new Error('Dompet peminjam dan pemberi tidak boleh sama');

    const date = customDate || new Date().toISOString();

    await db.transaction('rw', [db.wallets, db.transactions, db.debts], async () => {
      const lender = await db.wallets.get(lenderWalletId);
      const borrower = await db.wallets.get(borrowerWalletId);

      if (!lender || !borrower) throw new Error('Dompet tidak ditemukan');

      // Potong saldo pemberi, tambah saldo peminjam
      await db.wallets.update(lenderWalletId, { balance: lender.balance - amount });
      await db.wallets.update(borrowerWalletId, { balance: borrower.balance + amount });

      // Catat Utang
      await db.debts.add({
        fromWalletId: borrowerWalletId,
        toWalletId: lenderWalletId,
        amount,
        notes: notes || `Pinjam dari ${lender.name}`,
        isPaid: false,
        date
      });

      // Catat Log Transaksi
      await db.transactions.add({
        type: 'transfer',
        walletId: lenderWalletId,
        targetWalletId: borrowerWalletId,
        amount,
        notes: `[Pinjaman] ${notes || ''}`,
        date
      });
    });
  }

  // 3. Fungsi Bayar Utang Internal
  async function payDebt(debtId: number, customDate?: string) {
    const date = customDate || new Date().toISOString();

    await db.transaction('rw', [db.wallets, db.transactions, db.debts], async () => {
      const debt = await db.debts.get(debtId);
      if (!debt) throw new Error('Data utang tidak ditemukan');

      const borrower = await db.wallets.get(debt.fromWalletId);
      const lender = await db.wallets.get(debt.toWalletId);

      if (!borrower || !lender) throw new Error('Dompet terkait tidak ditemukan');

      // Kembalikan Saldo (Peminjam bayar balik ke pemberi pinjaman)
      await db.wallets.update(debt.fromWalletId, { balance: borrower.balance - debt.amount });
      await db.wallets.update(debt.toWalletId, { balance: lender.balance + debt.amount });

      // Tandai Lunas
      await db.debts.update(debtId, { isPaid: true });

      // Catat Log Pelunasan
      await db.transactions.add({
        type: 'debt_repayment',
        walletId: debt.fromWalletId,
        targetWalletId: debt.toWalletId,
        amount: debt.amount,
        notes: `[Pelunasan] ${debt.notes || ''}`,
        date
      });
    });
  }

  // 4. Transaksi Reguler (Pengeluaran / Pemasukan / Transfer)
  async function addTransaction(payload: {
    type: 'income' | 'expense' | 'transfer';
    walletId: number;
    targetWalletId?: number;
    category?: string;
    amount: number;
    notes?: string;
    date?: string;
  }) {
    if (payload.amount <= 0) throw new Error('Nominal transaksi harus lebih dari 0');

    const txDate = payload.date || new Date().toISOString();

    await db.transaction('rw', [db.wallets, db.transactions], async () => {
      const sourceWallet = await db.wallets.get(payload.walletId);
      if (!sourceWallet) throw new Error('Dompet asal tidak ditemukan');

      if (payload.type === 'expense') {
        await db.wallets.update(payload.walletId, { balance: sourceWallet.balance - payload.amount });
      } else if (payload.type === 'income') {
        await db.wallets.update(payload.walletId, { balance: sourceWallet.balance + payload.amount });
      } else if (payload.type === 'transfer' && payload.targetWalletId) {
        const targetWallet = await db.wallets.get(payload.targetWalletId);
        if (!targetWallet) throw new Error('Dompet tujuan tidak ditemukan');

        await db.wallets.update(payload.walletId, { balance: sourceWallet.balance - payload.amount });
        await db.wallets.update(payload.targetWalletId, { balance: targetWallet.balance + payload.amount });
      }

      await db.transactions.add({
        type: payload.type,
        walletId: payload.walletId,
        targetWalletId: payload.targetWalletId,
        category: payload.category,
        amount: payload.amount,
        notes: payload.notes,
        date: txDate
      });
    });
  }

  // 5. Helper Formatter Angka
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return {
    wallets,
    categories,
    recentTransactions,
    activeDebts,
    borrowMoney,
    payDebt,
    addTransaction,
    formatRupiah
  };
}
