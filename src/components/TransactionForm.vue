<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFinance } from '@/composables/useFinance'

const emit = defineEmits(['close', 'saved'])
const { wallets, categories, addTransaction, borrowMoney, formatRupiah } = useFinance()

const getCurrentLocalDateTime = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 16)
}

const type = ref<'expense' | 'income' | 'transfer' | 'borrow'>('expense')

const walletId = ref<string | null>(null)
const targetWalletId = ref<string | null>(null)

const category = ref<string>('')
const amount = ref<number | null>(null)
const notes = ref<string>('')
const transactionDate = ref<string>(getCurrentLocalDateTime())
const isSubmitting = ref(false)

// Filter dompet: Sembunyikan RDN jika Pemasukan ATAU Pengeluaran
const availableWallets = computed(() => {
  if (!wallets.value) return []
  if (type.value === 'income' || type.value === 'expense') {
    return wallets.value.filter(w => !w.name.toLowerCase().includes('rdn'))
  }
  return wallets.value
})

// Pasang default walletId pertama secara otomatis saat data dompet loaded/berubah
watch(availableWallets, (newWallets) => {
  if (newWallets && newWallets.length > 0) {
    const exists = newWallets.some(w => w.id === walletId.value)
    if (!walletId.value || !exists) {
      walletId.value = newWallets[0].id
    }
  }
}, { immediate: true })

// Cek apakah dompet yang dipilih adalah "Rekening Warung"
const isWarungWallet = computed(() => {
  if (!walletId.value || !wallets.value) return false
  const selected = wallets.value.find(w => w.id === walletId.value)
  return selected?.name.toLowerCase().includes('warung') ?? false
})

// Kunci kategori ke "Warung" jika dompet Rekening Warung dipilih
watch([type, walletId], () => {
  if ((type.value === 'income' || type.value === 'expense') && isWarungWallet.value) {
    category.value = 'Warung'
  } else if (category.value === 'Warung' && !isWarungWallet.value) {
    category.value = ''
  }
})

const filteredCategories = computed(() => {
  if (!categories.value) return []
  return categories.value.filter(c => c.type === type.value)
})

const handleTypeChange = (newType: 'expense' | 'income' | 'transfer' | 'borrow') => {
  type.value = newType
  
  if ((newType === 'income' || newType === 'expense') && isWarungWallet.value) {
    category.value = 'Warung'
  } else {
    category.value = ''
  }

  if (newType === 'transfer' || newType === 'borrow') {
    // Set target wallet default ke pilihan kedua jika ada
    const otherWallet = wallets.value?.find(w => w.id !== walletId.value)
    targetWalletId.value = otherWallet ? otherWallet.id : null
  } else {
    targetWalletId.value = null
  }
}

const handleSubmit = async () => {
  if (!walletId.value) return alert('Pilih dompet terlebih dahulu!')
  if ((type.value === 'transfer' || type.value === 'borrow') && !targetWalletId.value) {
    return alert('Pilih dompet pasangan/tujuan!')
  }

  const finalCategory = ((type.value === 'income' || type.value === 'expense') && isWarungWallet.value) 
    ? 'Warung' 
    : category.value

  if ((type.value === 'expense' || type.value === 'income') && !finalCategory) {
    return alert('Pilih kategori!')
  }
  if (!amount.value || amount.value <= 0) return alert('Nominal harus lebih dari 0!')

  const selectedDate = new Date(transactionDate.value).toISOString()

  try {
    isSubmitting.value = true

    if (type.value === 'borrow') {
      await borrowMoney(walletId.value, targetWalletId.value, amount.value, notes.value, selectedDate)
    } else {
      await addTransaction({
        type: type.value,
        walletId: walletId.value,
        targetWalletId: type.value === 'transfer' ? targetWalletId.value : undefined,
        category: type.value !== 'transfer' ? finalCategory : undefined,
        amount: amount.value,
        notes: notes.value,
        date: selectedDate
      })
    }

    amount.value = null
    notes.value = ''
    category.value = ''
    transactionDate.value = getCurrentLocalDateTime()
    emit('saved')
  } catch (err: any) {
    alert(err.message || 'Gagal menyimpan transaksi')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="bg-white p-4 rounded-t-2xl sm:rounded-xl shadow-lg space-y-4 max-w-md w-full mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center border-b pb-2">
      <h3 class="text-lg font-bold text-gray-800">Tambah Transaksi</h3>
      <button 
        type="button"
        @click="emit('close')" 
        class="text-gray-400 hover:text-gray-600 font-bold px-2 text-xl leading-none"
      >
        &times;
      </button>
    </div>

    <!-- Tipe Transaksi (Tabs 4 Opsi) -->
    <div class="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg">
      <button 
        type="button"
        @click="handleTypeChange('expense')"
        :class="type === 'expense' ? 'bg-red-500 text-white font-semibold shadow' : 'text-gray-600'"
        class="py-2 text-[11px] rounded-md transition"
      >
        Pengeluaran
      </button>
      <button 
        type="button"
        @click="handleTypeChange('income')"
        :class="type === 'income' ? 'bg-emerald-500 text-white font-semibold shadow' : 'text-gray-600'"
        class="py-2 text-[11px] rounded-md transition"
      >
        Pemasukan
      </button>
      <button 
        type="button"
        @click="handleTypeChange('transfer')"
        :class="type === 'transfer' ? 'bg-blue-500 text-white font-semibold shadow' : 'text-gray-600'"
        class="py-2 text-[11px] rounded-md transition"
      >
        Transfer
      </button>
      <button 
        type="button"
        @click="handleTypeChange('borrow')"
        :class="type === 'borrow' ? 'bg-amber-500 text-white font-semibold shadow' : 'text-gray-600'"
        class="py-2 text-[11px] rounded-md transition"
      >
        Pinjam
      </button>
    </div>

    <!-- Tanggal & Waktu -->
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Tanggal & Waktu</label>
      <input 
        v-model="transactionDate"
        type="datetime-local"
        class="w-full p-2 border rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium"
      />
    </div>

    <!-- Input Nominal -->
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Nominal (Rp)</label>
      <div class="relative">
        <span class="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">Rp</span>
        <input 
          v-model.number="amount"
          type="number"
          inputmode="numeric"
          placeholder="0"
          class="w-full pl-10 pr-3 py-2 text-xl font-bold border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
      <p class="text-xs text-gray-400 mt-1 text-right">{{ formatRupiah(amount || 0) }}</p>
    </div>

    <!-- Selector Dompet untuk Transfer / Pinjam -->
    <div v-if="type === 'transfer' || type === 'borrow'" class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">
          {{ type === 'borrow' ? 'Dompet Peminjam' : 'Dari Dompet' }}
        </label>
        <select v-model="walletId" class="w-full p-2 border rounded-lg text-sm bg-white outline-none">
          <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">
          {{ type === 'borrow' ? 'Sumber Pinjaman' : 'Ke Dompet' }}
        </label>
        <select v-model="targetWalletId" class="w-full p-2 border rounded-lg text-sm bg-white outline-none">
          <option v-for="w in wallets" :key="w.id" :value="w.id" :disabled="w.id === walletId">
            {{ w.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Selector Dompet Biasa (Expense / Income) -->
    <div v-else>
      <label class="block text-xs font-medium text-gray-500 mb-1">Sumber Dompet</label>
      <select v-model="walletId" class="w-full p-2 border rounded-lg text-sm bg-white outline-none">
        <option v-for="w in availableWallets" :key="w.id" :value="w.id">{{ w.name }}</option>
      </select>
    </div>

    <!-- Grid Kategori -->
    <div v-if="type === 'expense' || type === 'income'">
      <label class="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
      
      <div v-if="isWarungWallet" class="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700 font-medium">
        ⚡ Otomatis dicatat sebagai transaksi <strong>Warung</strong>.
      </div>

      <div v-else class="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 border rounded-lg">
        <button
          v-for="cat in filteredCategories"
          :key="cat.id"
          type="button"
          @click="category = cat.name"
          :class="category === cat.name ? 'bg-indigo-50 text-indigo-600 border-indigo-400 font-bold' : 'bg-gray-50 text-gray-700 border-gray-200'"
          class="p-2 text-xs border rounded-lg text-center truncate transition active:scale-95"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- Catatan Tambahan -->
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Catatan (Opsional)</label>
      <input 
        v-model="notes"
        type="text"
        placeholder="Misal: Belanja Stok, Omzet Harian, Beli Bensin, dll"
        class="w-full p-2 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>

    <!-- Tombol Simpan -->
    <button 
      type="button"
      @click="handleSubmit"
      :disabled="isSubmitting"
      class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition active:scale-98 disabled:opacity-50"
    >
      {{ isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi' }}
    </button>
  </div>
</template>
