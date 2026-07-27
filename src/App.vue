<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFinance } from '@/composables/useFinance'
import { syncToCloud } from '@/services/syncService'
import TransactionForm from '@/components/TransactionForm.vue'

const { 
  wallets, 
  recentTransactions, 
  activeDebts, 
  payDebt, 
  exportBackup, 
  importBackup, 
  formatRupiah,
  resetDatabase
} = useFinance()

const showForm = ref(false)
const isSyncing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Total saldo dari seluruh dompet
const calculatedTotal = computed(() => {
  if (!wallets.value) return 0
  return wallets.value.reduce((acc, curr) => acc + curr.balance, 0)
})

// Helper untuk mendapatkan nama dompet berdasarkan ID (string / UUID)
const getWalletName = (id: string) => {
  if (!wallets.value) return '-'
  const found = wallets.value.find(w => w.id === id)
  return found ? found.name : '-'
}

// Handler Sync Manual ke Cloud
const handleManualSync = async () => {
  try {
    isSyncing.value = true
    await syncToCloud()
  } catch (err: any) {
    alert('Gagal melakukan sync: ' + (err.message || 'Error tidak diketahui'))
  } finally {
    isSyncing.value = false
  }
}

// Handler Import Backup
const triggerImport = () => {
  fileInput.value?.click()
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    try {
      await importBackup(target.files[0])
      alert('Data backup berhasil dipulihkan!')
    } catch (err: any) {
      alert('Gagal mengimpor file backup: ' + (err.message || 'Format tidak valid'))
    } finally {
      target.value = ''
    }
  }
}

// Handler Pelunasan Utang (debtId bertipe string)
const handlePayDebt = async (debtId: string) => {
  if (confirm('Apakah kamu yakin ingin melunasi pinjaman ini? Saldo dompet terkait akan otomatis disesuaikan.')) {
    try {
      await payDebt(debtId)
    } catch (err: any) {
      alert(err.message || 'Gagal melunasi pinjaman')
    }
  }
}

// Handler Reset Database dengan Konfirmasi
const handleResetDatabase = async () => {
  if (confirm('⚠️ PERINGATAN: Tindakan ini akan menghapus database lokal dan membuat ulang struktur dompet UUID yang bersih. Lanjutkan?')) {
    await resetDatabase()
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 pb-24">
    <!-- Header / Total Saldo -->
    <header class="bg-indigo-600 text-white p-6 rounded-b-3xl shadow-md">
      <div class="max-w-md mx-auto space-y-2">
        <div class="flex justify-between items-center text-xs text-indigo-200">
          <span class="uppercase tracking-wider">Total Saldo Keseluruhan</span>
          <button 
            @click="handleManualSync" 
            :disabled="isSyncing"
            class="bg-indigo-700/80 hover:bg-indigo-800 px-3 py-1 rounded-full border border-indigo-400/30 text-[11px] flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <span :class="isSyncing ? 'animate-spin' : ''">🔄</span> 
            {{ isSyncing ? 'Syncing...' : 'Sync Data' }}
          </button>
        </div>
        <h1 class="text-3xl font-extrabold">{{ formatRupiah(calculatedTotal) }}</h1>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-md mx-auto p-4 space-y-6">
      
      <!-- Grid Dompet -->
      <section>
        <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Dompet & Rekening</h2>
        <div class="grid grid-cols-2 gap-3">
          <div 
            v-for="wallet in wallets" 
            :key="wallet.id" 
            class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"
          >
            <span class="text-xs font-medium text-gray-400 truncate">{{ wallet.name }}</span>
            <span class="text-base font-bold text-slate-700 mt-2">{{ formatRupiah(wallet.balance) }}</span>
          </div>
        </div>
      </section>

      <!-- Section Pinjaman / Utang Internal -->
      <section v-if="activeDebts?.length">
        <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Pinjaman Internal</h2>
        <div class="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
          <div 
            v-for="debt in activeDebts" 
            :key="debt.id" 
            class="flex justify-between items-center text-sm border-b border-amber-200/60 pb-3 last:border-0 last:pb-0"
          >
            <div>
              <p class="font-bold text-amber-900">{{ formatRupiah(debt.amount) }}</p>
              <p class="text-xs text-amber-700 font-medium mt-0.5">
                {{ getWalletName(debt.fromWalletId) }} → {{ getWalletName(debt.toWalletId) }}
              </p>
              <p v-if="debt.notes" class="text-[11px] text-amber-600/80 italic mt-0.5">
                "{{ debt.notes }}"
              </p>
            </div>
            <button 
              @click="handlePayDebt(debt.id!)"
              class="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-sm transition active:scale-95"
            >
              Lunasi
            </button>
          </div>
        </div>
      </section>

      <!-- Riwayat Transaksi -->
      <section>
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide">Transaksi Terakhir</h2>
        </div>

        <div v-if="!recentTransactions?.length" class="bg-white p-8 rounded-2xl text-center text-gray-400 text-sm shadow-sm border border-slate-100">
          Belum ada transaksi tercatat. <br>Yuk catat pengeluaran/pemasukan pertamamu!
        </div>

        <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y overflow-hidden">
          <div 
            v-for="tx in recentTransactions" 
            :key="tx.id" 
            class="p-4 flex justify-between items-center text-sm"
          >
            <div>
              <div class="font-semibold text-slate-700">
                {{ tx.type === 'transfer' ? 'Transfer Antar Dompet' : tx.type === 'debt_repayment' ? 'Pelunasan Pinjaman' : tx.category }}
              </div>
              <div class="text-xs text-gray-400 mt-0.5">
                {{ new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                <span v-if="tx.notes" class="italic"> • "{{ tx.notes }}"</span>
              </div>
            </div>
            <div 
              :class="tx.type === 'expense' ? 'text-red-500' : tx.type === 'income' ? 'text-emerald-600' : 'text-blue-500'" 
              class="font-bold text-base"
            >
              {{ tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '→' }} {{ formatRupiah(tx.amount) }}
            </div>
          </div>
        </div>
      </section>

      <!-- Cadangan & Pengaturan Database -->
      <section class="pt-2 space-y-3">
        <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide">Cadangan & Pengaturan</h2>
        
        <div class="grid grid-cols-2 gap-3">
          <button 
            @click="exportBackup"
            class="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <span>📥</span> Export JSON
          </button>
          
          <button 
            @click="triggerImport"
            class="p-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
          >
            <span>📤</span> Import JSON
          </button>

          <input 
            ref="fileInput"
            type="file" 
            accept=".json"
            class="hidden"
            @change="handleFileChange"
          />
        </div>

        <!-- Tombol Reset Database -->
        <button 
          @click="handleResetDatabase"
          class="w-full p-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 rounded-xl text-xs font-bold transition active:scale-95 text-center flex items-center justify-center gap-1.5"
        >
          <span>⚠️</span> Reset Database Lokal ke Versi UUID
        </button>
      </section>
    </main>

    <!-- FAB -->
    <div class="fixed bottom-6 right-6 z-40">
      <button 
        @click="showForm = true"
        class="bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition active:scale-95"
      >
        +
      </button>
    </div>

    <!-- Modal Form Transaksi -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center transition-opacity">
      <div class="w-full max-w-md animate-in fade-in slide-in-from-bottom duration-200">
        <TransactionForm @close="showForm = false" @saved="showForm = false" />
      </div>
    </div>
  </div>
</template>
