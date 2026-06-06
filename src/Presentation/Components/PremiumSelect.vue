<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'

interface Option {
  label: string
  value: any
  icon?: string
  description?: string
}

const props = defineProps<{
  modelValue: any
  options: Option[]
  placeholder?: string
  disabled?: boolean
  label?: string
  containerClass?: string
}>()

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const selectRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

const dropdownStyle = ref({
  position: 'fixed',
  top: '0px',
  left: '0px',
  width: '0px',
  zIndex: '9999',
})

const toggle = () => {
  if (!props.disabled) isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const updatePosition = () => {
  if (selectRef.value && isOpen.value) {
    const rect = selectRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = 300 // Estimación de altura máxima

    if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
      // Abrir hacia arriba
      dropdownStyle.value = {
        ...dropdownStyle.value,
        top: `${rect.top - 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        transform: 'translateY(-100%)'
      }
    } else {
      // Abrir hacia abajo
      dropdownStyle.value = {
        ...dropdownStyle.value,
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        transform: 'none'
      }
    }
  }
}

// Cerrar al hacer click fuera
const handleClickOutside = (event: MouseEvent) => {
  if (isOpen.value && 
      selectRef.value && !selectRef.value.contains(event.target as Node) &&
      dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    close()
  }
}

const selectOption = (option: Option) => {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

const selectedOption = computed(() => {
  return (props.options || []).find(o => o.value === props.modelValue)
})

// Keyboard escape
const handleEsc = (event: KeyboardEvent) => {
  if (event.key === 'Escape') close()
}

watch(isOpen, async (val) => {
  if (val) {
    await nextTick()
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    document.addEventListener('click', handleClickOutside)
  } else {
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
    document.removeEventListener('click', handleClickOutside)
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div 
    class="relative" 
    :class="containerClass" 
    ref="selectRef"
  >
    <label v-if="label" class="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
      {{ label }}
    </label>
    
    <!-- Trigger -->
    <button
      type="button"
      @click="toggle"
      :disabled="disabled"
      class="group w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:bg-slate-50"
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <span v-if="selectedOption?.icon" class="text-lg">{{ selectedOption.icon }}</span>
        <span 
          class="block truncate font-bold"
          :class="selectedOption ? 'text-slate-700' : 'text-slate-400'"
        >
          {{ selectedOption ? selectedOption.label : (placeholder || 'Seleccionar...') }}
        </span>
      </div>
      
      <!-- Arrow -->
      <span class="text-slate-300 transition-transform duration-300 group-hover:text-slate-400" :class="{ 'rotate-180': isOpen }">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </span>
    </button>

    <!-- Dropdown List Teleported -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="isOpen"
          ref="dropdownRef"
          :style="dropdownStyle"
          class="max-h-64 overflow-y-auto rounded-[2rem] bg-white p-3 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 custom-scroll animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div v-if="options.length === 0" class="py-8 text-center text-xs text-slate-400 font-black uppercase tracking-widest italic">
            Sin opciones disponibles
          </div>
          
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            @click="selectOption(option)"
            class="flex w-full items-center gap-4 rounded-[1.25rem] px-5 py-4 text-left transition-all hover:bg-slate-50 active:scale-[0.97] group/item"
            :class="option.value === modelValue ? 'bg-blue-50 text-blue-700' : 'text-slate-600'"
          >
            <span v-if="option.icon" class="text-xl shrink-0 group-hover/item:scale-110 transition-transform">{{ option.icon }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-black text-sm tracking-tight">{{ option.label }}</p>
              <p v-if="option.description" class="truncate text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter group-hover/item:text-slate-500">
                {{ option.description }}
              </p>
            </div>
            <div v-if="option.value === modelValue" class="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s ease-out; }
.dropdown-enter-from { opacity: 0; transform: translateY(-10px); }
.dropdown-leave-to { opacity: 0; transform: translateY(-5px); }

.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>
