<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository'
import { GetUsuarios } from '../../Application/UseCases/GetUsuarios'
import { CrearUsuario } from '../../Application/UseCases/CrearUsuario'
import { DesactivarUsuario } from '../../Application/UseCases/DesactivarUsuario'

const repo = new SupabaseUsuarioRepository()
const usuarios = ref<any[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const mostrarFormulario = ref(false)
const filtroRol = ref('Todos')
const busqueda = ref('')

const nuevoUsuario = ref({
  cedula: '', nombres: '', apellidos: '',
  email: '', password: '', telefono: '',
  rol: 'Cliente', cooperativaId: null,
})

const cargarUsuarios = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const useCase = new GetUsuarios(repo)
    usuarios.value = await useCase.ejecutar()
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    isLoading.value = false
  }
}

const crearUsuario = async () => {
  errorMessage.value = ''
  try {
    const useCase = new CrearUsuario(repo)
    await useCase.ejecutar(nuevoUsuario.value)
    successMessage.value = 'Usuario creado correctamente.'
    mostrarFormulario.value = false
    nuevoUsuario.value = { cedula: '', nombres: '', apellidos: '', email: '', password: '', telefono: '', rol: 'Cliente', cooperativaId: null }
    await cargarUsuarios()
    setTimeout(() => successMessage.value = '', 3000)
  } catch (e: any) {
    errorMessage.value = e.message
  }
}

const desactivarUsuario = async (id: number) => {
  if (!confirm('¿Desactivar este usuario? Esta acción se puede revertir.')) return
  try {
    const useCase = new DesactivarUsuario(repo)
    await useCase.ejecutar(id)
    await cargarUsuarios()
  } catch (e: any) {
    errorMessage.value = e.message
  }
}

const usuariosFiltrados = computed(() => {
  return usuarios.value.filter(u => {
    const matchRol = filtroRol.value === 'Todos' || u.Rol === filtroRol.value
    const q = busqueda.value.toLowerCase().trim()
    const matchBusqueda = !q ||
      (u.Nombres || '').toLowerCase().includes(q) ||
      (u.Apellidos || '').toLowerCase().includes(q) ||
      (u.Email || '').toLowerCase().includes(q) ||
      (u.Cedula || '').toString().includes(q)
    return matchRol && matchBusqueda
  })
})

const rolColor = (rol: string) => {
  switch (rol) {
    case 'Admin':
    case 'Administrador': return 'bg-blue-100 text-blue-700'
    case 'Oficinista':    return 'bg-emerald-100 text-emerald-700'
    case 'Chofer':        return 'bg-amber-100 text-amber-700'
    default:              return 'bg-slate-100 text-slate-700'
  }
}

onMounted(cargarUsuarios)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-black text-slate-900">Gestión de usuarios</h2>
        <p class="text-slate-500 text-sm">Administra cuentas de Administradores, Oficinistas, Choferes y Clientes.</p>
      </div>
      <button @click="mostrarFormulario = !mostrarFormulario"
        class="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-xl shadow-blue-100 transition-all hover:bg-blue-700">
        {{ mostrarFormulario ? 'Cancelar' : '+ Nuevo usuario' }}
      </button>
    </div>

    <!-- Mensajes -->
    <div v-if="successMessage" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
      ✓ {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
      ✗ {{ errorMessage }}
    </div>

    <!-- Form alta -->
    <section v-if="mostrarFormulario" class="rounded-2xl border border-white/70 bg-white/90 p-6 shadow-2xl backdrop-blur">
      <h3 class="text-lg font-black text-slate-900 mb-4">Nuevo usuario</h3>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Cédula</label>
          <input v-model="nuevoUsuario.cedula" maxlength="10" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Nombres</label>
          <input v-model="nuevoUsuario.nombres" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Apellidos</label>
          <input v-model="nuevoUsuario.apellidos" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Email</label>
          <input v-model="nuevoUsuario.email" type="email" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Contraseña</label>
          <input v-model="nuevoUsuario.password" type="password" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3">
          <label class="text-xs font-bold text-slate-700">Teléfono</label>
          <input v-model="nuevoUsuario.telefono" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
        </div>
        <div class="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
          <label class="text-xs font-bold text-slate-700">Rol</label>
          <select v-model="nuevoUsuario.rol" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            <option>Administrador</option>
            <option>Oficinista</option>
            <option>Chofer</option>
            <option>Cliente</option>
          </select>
        </div>
      </div>
      <div class="mt-5 flex gap-3">
        <button @click="crearUsuario" class="rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700">
          Guardar usuario
        </button>
        <button @click="mostrarFormulario = false" class="rounded-2xl bg-slate-100 px-6 py-3 font-bold text-slate-700 hover:bg-slate-200">
          Cancelar
        </button>
      </div>
    </section>

    <!-- Filtros -->
    <section class="rounded-2xl bg-white p-4 shadow-md border border-slate-100 flex flex-wrap items-end gap-3">
      <div class="flex-1 min-w-[200px]">
        <label class="text-xs font-bold text-slate-700">Buscar</label>
        <input v-model="busqueda" type="text"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"/>
      </div>
      <div>
        <label class="text-xs font-bold text-slate-700">Rol</label>
        <select v-model="filtroRol" class="rounded-xl border border-slate-200 bg-white px-4 py-2 mt-1">
          <option>Todos</option>
          <option>Administrador</option>
          <option>Oficinista</option>
          <option>Chofer</option>
          <option>Cliente</option>
        </select>
      </div>
    </section>

    <!-- Tabla -->
    <section class="rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-slate-500">Cargando usuarios...</div>
      <table v-else-if="usuariosFiltrados.length > 0" class="w-full">
        <thead class="bg-blue-700 text-white">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Cédula</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Nombre</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Email</th>
            <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">Rol</th>
            <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="u in usuariosFiltrados" :key="u.Id" class="hover:bg-slate-50 transition-colors">
            <td class="px-4 py-3 text-sm">{{ u.Cedula }}</td>
            <td class="px-4 py-3 text-sm font-bold text-slate-900">{{ u.Nombres }} {{ u.Apellidos }}</td>
            <td class="px-4 py-3 text-sm text-slate-600">{{ u.Email }}</td>
            <td class="px-4 py-3">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-bold" :class="rolColor(u.Rol)">{{ u.Rol }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="desactivarUsuario(u.Id)"
                class="rounded-xl bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs font-bold transition-colors">
                Desactivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="p-8 text-center text-slate-500">No hay usuarios que coincidan con tu búsqueda.</div>
    </section>
  </div>
</template>
