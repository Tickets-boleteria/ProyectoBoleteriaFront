<script setup lang="ts">
import { ref, computed } from 'vue';
import RouteSearch from '../Components/RouteSearch.vue';
import CooperativeFilter from '../Components/CooperativeFilter.vue';
import ChassisFilter from '../Components/ChassisFilter.vue';
import RoutesList from '../Components/RoutesList.vue';
import { useSales } from '../Composables/useSales';

const { routes, filters, searchRoutes, filterByCooperative, filterByChassis } = useSales();

const searchQuery = ref('');
const selectedCooperative = ref('');
const selectedChassis = ref('');

const handleSearch = (query: string) => {
  searchQuery.value = query;
  searchRoutes(query);
};

const handleCooperativeFilter = (cooperative: string) => {
  selectedCooperative.value = cooperative;
  filterByCooperative(cooperative);
};

const handleChassisFilter = (chassis: string) => {
  selectedChassis.value = chassis;
  filterByChassis(chassis);
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedCooperative.value = '';
  selectedChassis.value = '';
  searchRoutes('');
};
</script>

<template>
  <div class="sales-view">
    <div class="sales-header">
      <h1>Venta de Boletos</h1>
      <p>Busca y filtra las rutas disponibles</p>
    </div>

    <div class="filters-container">
      <RouteSearch @search="handleSearch" :query="searchQuery" />
      <CooperativeFilter @filter="handleCooperativeFilter" :selected="selectedCooperative" />
      <ChassisFilter @filter="handleChassisFilter" :selected="selectedChassis" />
      <button @click="clearFilters" class="btn-clear">Limpiar Filtros</button>
    </div>

    <RoutesList :routes="routes" />
  </div>
</template>

<style scoped>
.sales-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.sales-header {
  text-align: center;
  margin-bottom: 2rem;
}

.sales-header h1 {
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.sales-header p {
  font-size: 1.1rem;
  color: #666;
}

.filters-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-clear {
  padding: 0.75rem 1.5rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.btn-clear:hover {
  background-color: #c82333;
}
</style>