import { ref, computed, watch, Ref } from 'vue';

export function usePagination<T>(items: Ref<T[]>, pageSize: number = 10) {
  const currentPage = ref(1);
  const itemsPerPage = ref(pageSize);

  const totalItems = computed(() => items.value.length);
  const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value));

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return items.value.slice(start, end);
  });

  const hasNextPage = computed(() => currentPage.value < totalPages.value);
  const hasPrevPage = computed(() => currentPage.value > 1);

  const nextPage = () => {
    if (hasNextPage.value) {
      currentPage.value++;
    }
  };

  const prevPage = () => {
    if (hasPrevPage.value) {
      currentPage.value--;
    }
  };

  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  // Reset to first page when items change (e.g., search/filter)
  watch(items, () => {
    currentPage.value = 1;
  });

  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    setPage,
  };
}
