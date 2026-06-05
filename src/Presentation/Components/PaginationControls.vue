<script setup lang="ts">
defineProps<{
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
</script>

<template>
  <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        @click="$emit('prev')"
        :disabled="!hasPrevPage"
        class="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Anterior
      </button>
      <button
        @click="$emit('next')"
        :disabled="!hasNextPage"
        class="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Siguiente
      </button>
    </div>
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <p class="text-xs text-slate-500">
          Mostrando página <span class="font-black text-slate-900">{{ currentPage }}</span> de
          <span class="font-black text-slate-900">{{ totalPages }}</span>
          ({{ totalItems }} registros en total)
        </p>
      </div>
      <div>
        <nav class="isolate inline-flex -space-x-px rounded-xl shadow-sm gap-1" aria-label="Pagination">
          <button
            @click="$emit('prev')"
            :disabled="!hasPrevPage"
            class="relative inline-flex items-center rounded-l-xl px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40"
          >
            <span class="sr-only">Anterior</span>
            <span class="text-lg">‹</span>
          </button>
          
          <button
            v-for="page in totalPages"
            :key="page"
            @click="$emit('setPage', page)"
            aria-current="page"
            class="relative inline-flex items-center px-4 py-2 text-xs font-black ring-1 ring-inset ring-slate-200 focus:z-20 focus:outline-offset-0 transition-all rounded-lg"
            :class="page === currentPage 
              ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ring-blue-600' 
              : 'text-slate-900 hover:bg-slate-50'"
          >
            {{ page }}
          </button>

          <button
            @click="$emit('next')"
            :disabled="!hasNextPage"
            class="relative inline-flex items-center rounded-r-xl px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40"
          >
            <span class="sr-only">Siguiente</span>
            <span class="text-lg">›</span>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>
