<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  query: string;
}

interface Emits {
  (e: 'search', query: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localQuery = ref(props.query);

const handleSearch = () => {
  emit('search', localQuery.value);
};

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  localQuery.value = target.value;
  emit('search', localQuery.value);
};
</script>

<template>
  <div class="route-search">
    <label for="search">Buscar Ruta:</label>
    <input
      id="search"
      v-model="localQuery"
      type="text"
      placeholder="Ej: Quito - Guayaquil"
      @input="handleInput"
      @keyup.enter="handleSearch"
      class="search-input"
    />
  </div>
</template>

<style scoped>
.route-search {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.search-input {
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
}
</style>