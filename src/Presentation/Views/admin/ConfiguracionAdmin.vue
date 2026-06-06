<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { SupabaseConfigRepository, AppConfig, ResolucionANT } from '../../../Infrastructure/Repositories/SupabaseConfigRepository'
import { useUiStore } from '../../Store/uiStore'

const configRepo = new SupabaseConfigRepository()
const uiStore = useUiStore()

const loading = ref(false)
const appConfig = reactive<AppConfig>({
  logoUrl: '',
  colorPrimario: '#2563eb',
  colorSecundario: '#64748b',
  redesSociales: { facebook: '', twitter: '', instagram: '' },
  soporteEmail: '',
  soporteTelefono: ''
})

const resoluciones = ref<ResolucionANT[]>([])
const nuevaRes = reactive<ResolucionANT>({
  numeroResolucion: '',
  fechaEmision: '',
  descripcion: ''
})

async function cargarDatos() {
  loading.value = true
  try {
    const data = await configRepo.obtenerConfig()
    if (data) Object.assign(appConfig, data)
    resoluciones.value = await configRepo.listarResoluciones()
  } finally {
    loading.value = false
  }
}

async function guardarBranding() {
  loading.value = true
  try {
    await configRepo.guardarConfig(appConfig)
    uiStore.showAlert({ title: 'Éxito', message: 'Configuración guardada correctamente.', type: 'success' })
  } catch (err: any) {
    uiStore.showAlert({ title: 'Error', message: err.message, type: 'error' })
  } finally {
    loading.value = false
  }
}

async function agregarResolucion() {
  if (!nuevaRes.numeroResolucion) return
  loading.value = true
  try {
    await configRepo.crearResolucion(nuevaRes)
    nuevaRes.numeroResolucion = ''
    nuevaRes.fechaEmision = ''
    nuevaRes.descripcion = ''
    resoluciones.value = await configRepo.listarResoluciones()
    uiStore.showAlert({ title: 'Éxito', message: 'Resolución registrada.', type: 'success' })
  } catch (err: any) {
    uiStore.showAlert({ title: 'Error', message: err.message, type: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(cargarDatos)
</script>

<template>
  <div class="space-y-8 animate-in">
    <header class="header-premium">
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 class="text-3xl md:text-4xl font-black tracking-tight text-white">Configuración del Sistema</h2>
          <p class="mt-2 text-slate-400 font-medium">Personaliza la identidad visual y gestiona los permisos legales de la aplicación.</p>
        </div>
      </div>
    </header>

    <div class="grid gap-8 lg:grid-cols-2">
      <!-- Branding & Redes -->
      <section class="space-y-6">
        <div class="card-premium p-8">
          <h3 class="text-xl font-black mb-8 flex items-center gap-3">
            <span class="p-3 rounded-2xl bg-blue-50 text-blue-600 text-xl">🎨</span>
            Identidad y Soporte
          </h3>
          
          <div class="space-y-6">
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Logo Institucional (URL)</label>
              <input v-model="appConfig.logoUrl" class="input-premium" placeholder="https://ejemplo.com/logo.png"/>
            </div>
            
            <div class="grid grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Color Primario</label>
                <div class="flex gap-2">
                  <input type="color" v-model="appConfig.colorPrimario" class="h-12 w-14 rounded-xl cursor-pointer border-none bg-slate-100 p-1"/>
                  <input v-model="appConfig.colorPrimario" class="flex-1 input-premium !px-3 uppercase font-mono text-center"/>
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Color Secundario</label>
                <div class="flex gap-2">
                  <input type="color" v-model="appConfig.colorSecundario" class="h-12 w-14 rounded-xl cursor-pointer border-none bg-slate-100 p-1"/>
                  <input v-model="appConfig.colorSecundario" class="flex-1 input-premium !px-3 uppercase font-mono text-center"/>
                </div>
              </div>
            </div>

            <div class="pt-6 border-t border-slate-50">
              <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-4 block">Presencia Digital</label>
              <div class="grid gap-4">
                <div class="flex items-center gap-3 bg-slate-50 p-1 pr-4 rounded-2xl border border-slate-100">
                  <span class="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-blue-600 font-black">f</span>
                  <input v-model="appConfig.redesSociales.facebook" placeholder="Facebook URL" class="flex-1 bg-transparent py-2 text-sm font-bold outline-none"/>
                </div>
                <div class="flex items-center gap-3 bg-slate-50 p-1 pr-4 rounded-2xl border border-slate-100">
                  <span class="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-rose-500 font-black italic">i</span>
                  <input v-model="appConfig.redesSociales.instagram" placeholder="Instagram URL" class="flex-1 bg-transparent py-2 text-sm font-bold outline-none"/>
                </div>
              </div>
            </div>

            <div class="pt-6 border-t border-slate-50 grid grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Email Atención</label>
                <input v-model="appConfig.soporteEmail" placeholder="soporte@empresa.com" class="input-premium"/>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Línea Directa</label>
                <input v-model="appConfig.soporteTelefono" placeholder="+593 9..." class="input-premium"/>
              </div>
            </div>

            <button @click="guardarBranding" :disabled="loading" class="btn-primary w-full !py-4 mt-4">
              {{ loading ? 'Sincronizando...' : 'Guardar Cambios Visuales' }}
            </button>
          </div>
        </div>
      </section>

      <!-- Resoluciones ANT -->
      <section class="space-y-6">
        <div class="card-premium p-8">
          <h3 class="text-xl font-black mb-8 flex items-center gap-3">
            <span class="p-3 rounded-2xl bg-amber-50 text-amber-600 text-xl">📜</span>
            Resoluciones ANT
          </h3>

          <div class="space-y-4 bg-slate-900 p-6 rounded-[2rem] border border-slate-800 mb-8 shadow-xl shadow-slate-200">
            <p class="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em] mb-2 ml-1">Registrar nueva habilitación</p>
            <div class="grid gap-4">
              <input v-model="nuevaRes.numeroResolucion" placeholder="Nro. Resolución (ANT-2026-XXX)" class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20"/>
              <div class="grid grid-cols-2 gap-4">
                <input v-model="nuevaRes.fechaEmision" type="date" class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-white outline-none"/>
                <button @click="agregarResolucion" class="rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-500 transition-all uppercase tracking-widest shadow-lg shadow-blue-900/20">Registrar</button>
              </div>
              <textarea v-model="nuevaRes.descripcion" placeholder="Notas adicionales del permiso..." class="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm h-20 text-white outline-none"></textarea>
            </div>
          </div>

          <div class="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scroll">
            <article v-for="res in resoluciones" :key="res.id" class="p-5 rounded-3xl border-2 border-slate-50 bg-white hover:border-amber-200 hover:shadow-lg transition-all group">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-black text-slate-900 group-hover:text-amber-700 transition-colors">{{ res.numeroResolucion }}</p>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Emitida el {{ res.fechaEmision }}</p>
                </div>
                <span class="p-2 rounded-lg bg-slate-50 text-slate-300 text-xs">OK</span>
              </div>
              <p class="text-xs text-slate-500 mt-3 leading-relaxed">{{ res.descripcion }}</p>
            </article>
            <div v-if="resoluciones.length === 0" class="py-20 text-center opacity-40">
              <p class="text-4xl mb-4">📂</p>
              <p class="font-black text-slate-400 uppercase tracking-widest text-[10px]">Sin resoluciones legales</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-in { animation: slideIn 0.5s ease-out; }
</style>
