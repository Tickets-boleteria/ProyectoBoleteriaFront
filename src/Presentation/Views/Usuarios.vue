<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../../Infrastructure/Api/supabaseClient'
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository'
import { GetUsuarios } from '../../Application/UseCases/GetUsuarios'
import { CrearUsuario } from '../../Application/UseCases/CrearUsuario'
import { ActualizarUsuario } from '../../Application/UseCases/ActualizarUsuario'
import { Cedula } from '../../Domain/ValueObjects/Cedula'
import PaginationControls from '../Components/PaginationControls.vue'
import PremiumSelect from '../Components/PremiumSelect.vue'

const repo = new SupabaseUsuarioRepository()
const usuarios = ref<any[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const mostrarModal = ref(false)
const esModoEdicion = ref(false)
const esModoLectura = ref(false)
const usuarioSeleccionadoId = ref<string | null>(null)

const filtroRol = ref('Todos')
const busqueda = ref('')

// Paginación
const paginaActual = ref(1)
const registrosPorPagina = ref(10)

const ROLES = ['Administrador', 'Oficinista', 'Chofer', 'Usuario Final']
const TIPOS_LICENCIA = ['Tipo C', 'Tipo D', 'Tipo E', 'Tipo G']


// Resetear página al filtrar o cambiar tamaño
watch([busqueda, filtroRol, registrosPorPagina], () => {
  paginaActual.value = 1
})

const cargarUsuarios = async () => {
  isLoading.value = true
  try {
    const useCase = new GetUsuarios(repo)
    usuarios.value = await useCase.ejecutar()
  } catch (e: any) {
    errorMessage.value = 'Error al cargar usuarios: ' + e.message
  } finally {
    isLoading.value = false
  }
}

const usuarioForm = ref({
  cedula: '', nombres: '', apellidos: '',
  email: '', password: '', confirmPassword: '', telefono: '',
  rol: 'Usuario Final', activo: true, cooperativaId: null,
  numeroLicencia: '', tipoLicencia: 'Tipo E'
})

// Errores Inline
const errors = ref({
  cedula: '', nombres: '', apellidos: '', email: '', 
  password: '', confirmPassword: '', telefono: '', 
  numeroLicencia: ''
})

// --- Lógica de Restricción de Entrada ---
const soloNumeros = (val: string) => val.replace(/\D/g, '')
const soloLetras = (val: string) => val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '')

watch(() => usuarioForm.value.cedula, (newVal) => {
  usuarioForm.value.cedula = soloNumeros(newVal).slice(0, 10)
  validarCedulaInline(usuarioForm.value.cedula)
  // En Ecuador la licencia es igual a la cédula
  if (usuarioForm.value.rol === 'Chofer') {
    usuarioForm.value.numeroLicencia = usuarioForm.value.cedula
  }
})

watch(() => usuarioForm.value.nombres, (newVal) => {
  usuarioForm.value.nombres = soloLetras(newVal)
  errors.value.nombres = usuarioForm.value.nombres.length < 3 ? 'Mínimo 3 letras' : ''
})

watch(() => usuarioForm.value.apellidos, (newVal) => {
  usuarioForm.value.apellidos = soloLetras(newVal)
  errors.value.apellidos = usuarioForm.value.apellidos.length < 3 ? 'Mínimo 3 letras' : ''
})

watch(() => usuarioForm.value.telefono, (newVal) => {
  usuarioForm.value.telefono = newVal.replace(/[^0-9+]/g, '').slice(0, 13)
  const tel = usuarioForm.value.telefono
  if (tel.startsWith('+593')) {
    errors.value.telefono = tel.length !== 13 ? 'Formato +593XXXXXXXXX' : ''
  } else if (tel.startsWith('09')) {
    errors.value.telefono = tel.length !== 10 ? 'Deben ser 10 dígitos (09...)' : ''
  } else {
    errors.value.telefono = 'Debe empezar con 09 o +593'
  }
})

watch(() => usuarioForm.value.email, (newVal) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  errors.value.email = !regex.test(newVal) ? 'Email inválido (ejemplo@dominio.com)' : ''
})

watch(() => usuarioForm.value.password, (newVal) => {
  if (esModoEdicion.value) return
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  errors.value.password = !regex.test(newVal) ? '8+ chars, Mayús, Min y Núm' : ''
})

watch(() => usuarioForm.value.confirmPassword, (newVal) => {
  if (esModoEdicion.value) return
  errors.value.confirmPassword = newVal !== usuarioForm.value.password ? 'Las contraseñas no coinciden' : ''
})

// --- Validación Pro de Cédula ---
const validarCedulaInline = (val: string) => {
  if (val.length < 10) {
    errors.value.cedula = 'Faltan dígitos (10 requeridos)'
    return
  }
  try {
    Cedula.crear(val)
    errors.value.cedula = ''
  } catch (e: any) {
    errors.value.cedula = 'Número de cédula inválido'
  }
}


const guardarUsuario = async () => {
  if (esModoLectura.value || isSubmitting.value) return
  
  // Verificación final antes de enviar
  const hasErrors = Object.values(errors.value).some(err => err !== '')
  if (hasErrors) {
    errorMessage.value = 'Por favor, corrige los errores en el formulario.'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  
  try {
    // Verificación duplicados en DB (asíncrona)
    const { data: dup } = await supabase.from('Usuarios')
      .select('Id')
      .or(`Email.eq.${usuarioForm.value.email},Cedula.eq.${usuarioForm.value.cedula}`)
      .neq('Id', usuarioSeleccionadoId.value || '00000000-0000-0000-0000-000000000000')
      .maybeSingle()
    
    if (dup) throw new Error('Email o Cédula ya registrados.')

    if (esModoEdicion.value && usuarioSeleccionadoId.value) {
      const useCase = new ActualizarUsuario(repo)
      await useCase.ejecutar(usuarioSeleccionadoId.value, usuarioForm.value)
      successMessage.value = 'Usuario actualizado.'
    } else {
      const useCase = new CrearUsuario(repo)
      await useCase.ejecutar(usuarioForm.value)
      successMessage.value = 'Usuario creado.'
    }

    cerrarModal()
    await cargarUsuarios()
    setTimeout(() => successMessage.value = '', 3000)
  } catch (e: any) {
    errorMessage.value = e.message
  } finally {
    isSubmitting.value = false
  }
}

const abrirCrear = () => {
  esModoEdicion.value = false
  esModoLectura.value = false
  usuarioSeleccionadoId.value = null
  resetForm()
  mostrarModal.value = true
}

const abrirEditar = (u: any) => {
  esModoEdicion.value = true
  esModoLectura.value = false
  usuarioSeleccionadoId.value = u.Id
  usuarioForm.value = {
    cedula: u.Cedula,
    nombres: u.Nombres,
    apellidos: u.Apellidos,
    email: u.Email,
    password: '',
    confirmPassword: '',
    telefono: u.Telefono || '',
    rol: u.Rol === 'Cliente' ? 'Usuario Final' : u.Rol,
    activo: u.Activo,
    cooperativaId: u.CooperativaId,
    numeroLicencia: u.NumeroLicencia || u.Cedula,
    tipoLicencia: u.TipoLicencia || 'Tipo E'
  }
  mostrarModal.value = true
}

const abrirVer = (u: any) => {
  abrirEditar(u)
  esModoLectura.value = true
}

const cerrarModal = () => {
  mostrarModal.value = false
  esModoLectura.value = false
  resetForm()
}

const resetForm = () => {
  usuarioForm.value = { 
    cedula: '', nombres: '', apellidos: '', 
    email: '', password: '', confirmPassword: '', telefono: '', 
    rol: 'Usuario Final', activo: true, cooperativaId: null,
    numeroLicencia: '', tipoLicencia: 'Tipo E'
  }
  Object.keys(errors.value).forEach(k => (errors.value as any)[k] = '')
  errorMessage.value = ''
}

const usuariosFiltrados = computed(() => {
  const resultadoFiltrado = (usuarios.value || []).filter(u => {
    const uRol = String(u.Rol || '').trim() === 'Cliente' ? 'Usuario Final' : String(u.Rol || '').trim()
    const matchRol = filtroRol.value === 'Todos' || uRol === filtroRol.value
    const q = busqueda.value.toLowerCase().trim()
    const matchBusqueda = !q ||
      (u.Nombres || '').toLowerCase().includes(q) ||
      (u.Apellidos || '').toLowerCase().includes(q) ||
      (u.Email || '').toLowerCase().includes(q) ||
      (u.Cedula || '').toString().includes(q)
    return matchRol && matchBusqueda
  })

  return resultadoFiltrado.sort((a, b) => {
    const fechaA = new Date(a.created_at || a.FechaCreacion || 0).getTime()
    const fechaB = new Date(b.created_at || b.FechaCreacion || 0).getTime()
    return fechaB - fechaA
  })
})

const totalPaginas = computed(() => {
  if (usuariosFiltrados.value.length === 0) return 1
  return Math.ceil(usuariosFiltrados.value.length / registrosPorPagina.value)
})

const usuariosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * registrosPorPagina.value
  const fin = inicio + registrosPorPagina.value
  return usuariosFiltrados.value.slice(inicio, fin)
})

const handlePrevPage = () => { if (paginaActual.value > 1) paginaActual.value-- }
const handleNextPage = () => { if (paginaActual.value < totalPaginas.value) paginaActual.value++ }
const handleSetPage = (p: number) => { paginaActual.value = p }

const rolColor = (rol: string) => {
  const r = String(rol || '').trim()
  if (r === 'Admin' || r === 'Administrador') return 'text-blue-600 bg-blue-50 border-blue-100'
  if (r === 'Oficinista') return 'text-emerald-600 bg-emerald-50 border-emerald-100'
  if (r === 'Chofer') return 'text-amber-600 bg-amber-50 border-amber-100'
  return 'text-slate-600 bg-slate-50 border-slate-100'
}

const opcionesRol = ROLES.map(r => ({ label: r, value: r }))
const opcionesActivo = [
  { label: 'Activo / Autorizado', value: true, icon: '🟢' },
  { label: 'Inactivo / Bloqueado', value: false, icon: '🔴' }
]
const opcionesLicencia = TIPOS_LICENCIA.map(t => ({ label: t, value: t }))
const opcionesFiltroRol = [
  { label: 'Todos los roles', value: 'Todos' },
  ...ROLES.map(r => ({ label: r, value: r }))
]
const opcionesFilas = [
  { label: '5 filas', value: 5 },
  { label: '10 filas', value: 10 },
  { label: '20 filas', value: 20 }
]

onMounted(cargarUsuarios)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <section class="header-premium">
      <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white">Directorio de Usuarios</h1>
          <p class="mt-2 text-slate-400 font-medium text-sm md:text-base">Gestión integral de roles operativos y seguridad de acceso.</p>
        </div>
        <button @click="abrirCrear" class="btn-primary">
          <span class="text-2xl">+</span>
          <span>Nuevo Registro</span>
        </button>
      </div>
    </section>

    <!-- Notificaciones Flotantes -->
    <Transition name="slide-fade">
      <div v-if="successMessage" class="fixed top-8 right-8 z-[100] flex items-center gap-4 rounded-2xl bg-slate-900 border border-emerald-500/30 p-5 shadow-2xl backdrop-blur-xl">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          <span class="font-bold">✓</span>
        </div>
        <p class="font-bold text-white pr-4">{{ successMessage }}</p>
      </div>
    </Transition>

    <!-- Modal Formulario -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="mostrarModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="cerrarModal"></div>
          
          <div class="relative w-full max-w-3xl overflow-hidden rounded-[3rem] bg-white shadow-2xl">
            <div class="bg-slate-900 p-8 text-white">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="text-2xl font-black tracking-tight">
                    <span v-if="esModoLectura">Vista Previa de Perfil</span>
                    <span v-else-if="esModoEdicion">Actualizar Información</span>
                    <span v-else>Registrar Nuevo Perfil</span>
                  </h3>
                  <p class="text-slate-400 font-medium text-xs mt-1">Configura identidad, contacto y permisos del sistema.</p>
                </div>
              </div>
            </div>

            <div class="p-8 max-h-[75vh] overflow-y-auto custom-scroll">
              <div v-if="errorMessage" class="mb-6 rounded-xl bg-rose-50 border border-rose-100 p-4 text-[11px] font-black text-rose-600 flex items-center gap-3 uppercase tracking-wider">
                <span class="h-6 w-6 rounded-full bg-rose-100 flex items-center justify-center text-sm">!</span>
                {{ errorMessage }}
              </div>

              <div class="grid gap-6 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cédula de Identidad *</label>
                  <input v-model="usuarioForm.cedula" :disabled="esModoEdicion || esModoLectura" placeholder="10 dígitos" class="input-premium" :class="{'border-rose-300 bg-rose-50': errors.cedula}"/>
                  <p v-if="errors.cedula" class="text-[9px] text-rose-600 font-black uppercase">{{ errors.cedula }}</p>
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Correo Electrónico *</label>
                  <input v-model="usuarioForm.email" type="email" :disabled="esModoLectura" class="input-premium" :class="{'border-rose-300 bg-rose-50': errors.email}"/>
                  <p v-if="errors.email" class="text-[9px] text-rose-600 font-black uppercase">{{ errors.email }}</p>
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombres *</label>
                  <input v-model="usuarioForm.nombres" :disabled="esModoLectura" class="input-premium" />
                </div>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Apellidos *</label>
                  <input v-model="usuarioForm.apellidos" :disabled="esModoLectura" class="input-premium" />
                </div>

                <template v-if="!esModoEdicion">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña *</label>
                    <input v-model="usuarioForm.password" type="password" class="input-premium" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar *</label>
                    <input v-model="usuarioForm.confirmPassword" type="password" class="input-premium" />
                  </div>
                </template>

                <div class="space-y-1.5">
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Teléfono *</label>
                  <input v-model="usuarioForm.telefono" :disabled="esModoLectura" class="input-premium" />
                </div>

                <div class="space-y-1.5">
                  <PremiumSelect
                    v-model="usuarioForm.rol"
                    :options="opcionesRol"
                    :disabled="esModoLectura"
                    label="Rol de Usuario *"
                  />
                </div>

                <template v-if="usuarioForm.rol === 'Chofer'">
                  <div class="space-y-1.5 sm:col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 grid sm:grid-cols-2 gap-6">
                    <div class="space-y-1.5">
                      <label class="text-[10px] font-black uppercase tracking-widest text-blue-600">Nº Licencia</label>
                      <input v-model="usuarioForm.numeroLicencia" disabled class="input-premium bg-white/50 cursor-not-allowed"/>
                    </div>
                    <div class="space-y-1.5">
                      <PremiumSelect
                        v-model="usuarioForm.tipoLicencia"
                        :options="opcionesLicencia"
                        :disabled="esModoLectura"
                        label="Tipo Licencia"
                      />
                    </div>
                  </div>
                </template>

                <div v-if="esModoEdicion || esModoLectura" class="space-y-1.5 sm:col-span-2 pt-4 border-t border-slate-50">
                  <PremiumSelect
                    v-model="usuarioForm.activo"
                    :options="opcionesActivo"
                    :disabled="esModoLectura"
                    label="Estado de Acceso"
                  />
                </div>
              </div>

              <div class="mt-10 flex gap-4">
                <button v-if="!esModoLectura" @click="guardarUsuario" :disabled="isSubmitting" class="btn-primary flex-1 !py-4">
                  {{ isSubmitting ? 'Guardando...' : (esModoEdicion ? 'Actualizar Perfil' : 'Confirmar Alta') }}
                </button>
                <button @click="cerrarModal" class="px-10 py-4 rounded-2xl bg-slate-50 font-black text-slate-500 hover:bg-slate-100 transition-all active:scale-95">
                  {{ esModoLectura ? 'Cerrar' : 'Cancelar' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Filtros Elegant -->
    <section class="card-premium p-6 flex flex-wrap items-end gap-6 bg-white/80 backdrop-blur-sm">
      <div class="flex-1 min-w-[280px]">
        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Búsqueda rápida</label>
        <div class="relative mt-2">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
          <input v-model="busqueda" type="text" placeholder="Filtrar por nombre, identificación o email..."
            class="input-premium !pl-12 !py-3.5"/>
        </div>
      </div>
      <div class="w-full sm:w-64">
        <PremiumSelect
          v-model="filtroRol"
          :options="opcionesFiltroRol"
          label="Filtrar por Categoría"
        />
      </div>
    </section>

    <!-- Tabla Clean y Profesional -->
    <section class="card-premium">
      <div v-if="isLoading" class="p-24 text-center">
        <div class="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p class="mt-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Sincronizando Directorio...</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table v-if="usuariosFiltrados.length > 0" class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th class="px-10 py-6">Usuario / Contacto</th>
              <th class="px-10 py-6">Identidad / Rol</th>
              <th class="px-10 py-6 text-center">Estado</th>
              <th class="px-10 py-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="u in usuariosPaginados" :key="u.Id" class="group hover:bg-slate-50/50 transition-colors">
              <td class="px-10 py-8">
                <div>
                  <p class="font-black text-slate-800 text-base leading-tight">{{ u.Nombres }} {{ u.Apellidos }}</p>
                  <p class="text-slate-400 font-bold text-[10px] uppercase mt-1 tracking-widest">{{ u.Email }}</p>
                </div>
              </td>
              <td class="px-10 py-8">
                <p class="font-mono font-black text-blue-600 text-sm tracking-widest">{{ u.Cedula }}</p>
                <span class="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border inline-block mt-2 shadow-sm" :class="rolColor(u.Rol)">
                  {{ String(u.Rol || '').trim() === 'Cliente' ? 'Usuario Final' : u.Rol }}
                </span>
              </td>
              <td class="px-10 py-8 text-center">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm"
                  :class="u.Activo ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'">
                  <div class="h-1.5 w-1.5 rounded-full" :class="u.Activo ? 'bg-emerald-500' : 'bg-rose-500'"></div>
                  <span class="text-[9px] font-black uppercase tracking-widest">{{ u.Activo ? 'Activo' : 'Bloqueado' }}</span>
                </div>
              </td>
              <td class="px-10 py-8 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="abrirVer(u)" title="Vista previa"
                    class="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-sm">
                    👁
                  </button>
                  <button @click="abrirEditar(u)"
                    class="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
                    GESTIONAR
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="p-24 text-center opacity-40">
          <p class="text-5xl mb-4">🔍</p>
          <p class="font-black text-slate-400 uppercase tracking-widest text-xs">Sin registros que coincidan</p>
        </div>
      </div>

      <!-- Paginación Premium -->
      <div class="p-8 bg-slate-50/30 border-t border-slate-50">
        <div class="flex items-center gap-6 mb-6">
           <PremiumSelect
             v-model="registrosPorPagina"
             :options="opcionesFilas"
             label="Ver"
             container-class="w-32"
           />
        </div>
        <PaginationControls
          v-if="usuariosFiltrados.length > 0"
          :current-page="paginaActual" :total-pages="totalPaginas" :total-items="usuariosFiltrados.length" :items-per-page="registrosPorPagina"
          :has-prev-page="paginaActual > 1" :has-next-page="paginaActual < totalPaginas"
          @prev="handlePrevPage" @next="handleNextPage" @set-page="handleSetPage"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-fade-enter-from { opacity: 0; transform: translateX(20px); }
.slide-fade-leave-to { opacity: 0; transform: scale(0.9); }

.modal-enter-active, .modal-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-enter-from { opacity: 0; filter: blur(4px); transform: scale(0.95); }
.modal-leave-to { opacity: 0; transform: scale(1.02); }

.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>
