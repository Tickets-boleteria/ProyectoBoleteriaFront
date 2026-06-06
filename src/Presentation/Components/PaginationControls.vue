<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}>();

defineEmits<{
  (e: 'next'): void;
  (e: 'prev'): void;
  (e: 'setPage', page: number): void;
}>();

const visiblePages = computed(() => {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= props.totalPages; i++) {
    if (i === 1 || i === props.totalPages || (i >= props.currentPage - delta && i <= props.currentPage + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
})
</script>

<template>
  <div class="flex items-center justify-between px-6 py-4 rounded-3xl bg-white shadow-sm border border-slate-100">
    <!-- Mobile View -->
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        @click="$emit('prev')"
        :disabled="!hasPrevPage"
        class="btn-nav"
      >
        ← Anterior
      </button>
      <button
        @click="$emit('next')"
        :disabled="!hasNextPage"
        class="btn-nav ml-3"
      >
        Siguiente →
      </button>
    </div>

    <!-- Desktop View -->
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Página <span class="text-blue-600">{{ currentPage }}</span> de
          <span class="text-slate-900">{{ totalPages }}</span>
          <span class="mx-2 opacity-20">|</span>
          {{ totalItems }} Registros
        </p>
      </div>

      <div>
        <nav class="flex items-center gap-1.5" aria-label="Pagination">
          <button
            @click="$emit('prev')"
            :disabled="!hasPrevPage"
            class="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 transition-all hover:bg-slate-50 hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-white"
          >
            <span class="text-lg leading-none">‹</span>
          </button>
          
          <template v-for="(page, idx) in visiblePages" :key="idx">
            <span v-if="page === '...'" class="px-2 text-slate-300 font-black">...</span>
            <button
              v-else
              @click="$emit('setPage', Number(page))"
              class="h-9 min-w-[36px] px-2 flex items-center justify-center rounded-xl text-xs font-black transition-all"
              :class="page === currentPage 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-white text-slate-500 border border-slate-100 hover:border-blue-200 hover:text-blue-600'"
            >
              {{ page }}
            </button>
          </template>

          <button
            @click="$emit('next')"
            :disabled="!hasNextPage"
            class="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 transition-all hover:bg-slate-50 hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-white"
          >
            <span class="text-lg leading-none">›</span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.btn-nav {
  @apply relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-40;
}
</style>
