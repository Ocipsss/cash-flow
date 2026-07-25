<script setup lang="ts">
import { ref } from 'vue'
import { useFinance } from '@/composables/useFinance'
import TransactionForm from '@/components/TransactionForm.vue'

const { wallets, recentTransactions, formatRupiah } = useFinance()
const showForm = ref(false)

// Hitung total keseluruhan saldo dari semua dompet
const totalBalance = ref(0)
// Karena pakai RxJS/liveQuery, kita bisa hitung total dari array wallets
import { computed } from 'vue'
const calculatedTotal = computed(() => {
  if (!wallets.value) return 0
  return wallets.value.reduce((acc, curr) => acc + curr.balance, 0)
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 pb-24">
    <!-- Header / Total Saldo -->
    <header class="bg-indigo-600 text-white p-6 rounded-b-3xl shadow-md">
      <div class="max-w-md mx-auto">
        <p class="text-xs uppercase tracking-wider text-indigo-200">Total Saldo Keseluruhan</p>
        <h1 class="text-3xl font-extrabold mt-1">{{ formatRupiah(calculatedTotal) }}</h1>
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
                {{ tx.type === 'transfer' ? 'Transfer Antar Dompet' : tx.category }}
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
    </main>

    <!-- Floating Action Button (FAB) untuk Buka Form -->
    <div class="fixed bottom-6 right-6 z-40">
      <button 
        @click="showForm = true"
        class="bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition active:scale-95"
      >
        +
      </button>
    </div>

    <!-- Modal / Bottom Sheet Form Transaksi -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center transition-opacity">
      <div class="w-full max-w-md animate-in fade-in slide-in-from-bottom duration-200">
        <TransactionForm @close="showForm = false" @saved="showForm = false" />
      </div>
    </div>
  </div>
</template>
