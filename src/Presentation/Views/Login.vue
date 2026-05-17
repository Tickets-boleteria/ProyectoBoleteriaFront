<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-8 flex items-center justify-center">
    <div class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] w-full">

      <aside class="hidden rounded-[2rem] bg-blue-700 p-10 text-white shadow-2xl lg:block h-full flex flex-col justify-center">
        <div class="mb-8 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
          <span class="h-2 w-2 rounded-full bg-emerald-300"></span>
          Diseño IHC - Boletería
        </div>
        <h1 class="text-4xl font-black leading-tight">Adquiere tus boletos con total seguridad y rapidez.</h1>
        <p class="mt-5 text-blue-100">Portal optimizado bajo normas de usabilidad para mitigar la sobrecarga cognitiva.</p>

        <div class="mt-10 space-y-4">
          <div class="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p class="font-bold">Estructura DDD robusta</p>
            <p class="text-xs text-blue-100">Separación estricta de responsabilidades sin interferir en las reglas del dominio.</p>
          </div>
          <div class="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p class="font-bold">Prevención Activa de Errores</p>
            <p class="text-xs text-blue-100">Validaciones en tiempo real para un proceso de entrada sin fricciones.</p>
          </div>
        </div>
      </aside>

      <section class="mx-auto w-full max-w-md">
        <div class="mb-5 flex items-center gap-2 text-blue-700">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">B</span>
          <span class="font-bold">Boletería Front-End</span>
        </div>

        <div class="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-2xl backdrop-blur">
          <div class="mb-6">
            <h2 class="text-3xl font-black text-slate-950">{{ isRegistering ? 'Crear cuenta' : 'Iniciar sesión' }}</h2>
            <p class="text-sm text-slate-500 mt-1">{{ isRegistering ? 'Regístrate para gestionar tus pasajes.' : 'Ingresa tus credenciales de acceso.' }}</p>
          </div>

          <nav class="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm font-bold">
            <button
              type="button"
              @click="isRegistering = false"
              :class="!isRegistering ? 'bg-white text-blue-700 shadow-sm rounded-xl py-2' : 'text-slate-500 rounded-xl py-2'"
            >
              Ingresar
            </button>
            <button
              type="button"
              @click="isRegistering = true"
              :class="isRegistering ? 'bg-white text-blue-700 shadow-sm rounded-xl py-2' : 'text-slate-500 rounded-xl py-2'"
            >
              Registrarse
            </button>
          </nav>

          <div v-if="globalError" class="mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 border border-blue-200 font-medium">
            {{ globalError }}
          </div>

            <form @submit.prevent="handleAuthSubmit" class="space-y-4">
            <div v-if="isRegistering" class="space-y-4">
              <div class="rounded-2xl bg-slate-50 p-3">
                <label class="text-xs font-bold text-slate-700">Nombre y apellido</label>
                <input
                  v-model="nombre"
                  @input="validateNombre"
                  type="text"
                  class="w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 mt-1"
                  :class="errorNombre ? 'border-red-400 bg-red-50' : 'border-slate-200'"
                  placeholder="Gisselle Pérez"
                />
                <p v-if="errorNombre" class="mt-1 text-xs font-bold text-red-600">{{ errorNombre }}</p>
              </div>

              <div class="rounded-2xl bg-slate-50 p-3">
                <label class="text-xs font-bold text-slate-700">Número de Cédula</label>
                <input
                  v-model="cedula"
                  @input="validateCedula"
                  type="text"
                  maxlength="10"
                  class="w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 mt-1"
                  :class="errorCedula ? 'border-red-400 bg-red-50' : 'border-slate-200'"
                  placeholder="Ej. 1801234567"
                />
                <p v-if="errorCedula" class="mt-1 text-xs font-bold text-red-600">{{ errorCedula }}</p>
              </div>
            </div>

            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Correo electrónico</label>
              <input
                v-model="email"
                @input="validateEmail"
                type="email"
                class="w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 mt-1"
                :class="errorEmail ? 'border-red-400 bg-red-50' : 'border-slate-200'"
                placeholder="tu@email.com"
              />
              <p v-if="errorEmail" class="mt-1 text-xs font-bold text-red-600">{{ errorEmail }}</p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-3">
              <label class="text-xs font-bold text-slate-700">Contraseña</label>
              <div class="relative mt-1">
                <input
                  v-model="password"
                  @input="validatePassword"
                  :type="showPassword ? 'text' : 'password'"
                  class="w-full rounded-xl border bg-white px-4 py-3 text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 pr-12"
                  :class="errorPassword ? 'border-red-400 bg-red-50' : 'border-slate-200'"
                  placeholder="••••••••"
                />
                <button type="button" @click="showPassword = !showPassword" class="absolute inset-y-0 right-0 px-4 text-slate-400 hover:text-blue-600">{{ showPassword ? '🐵' : '🙈' }}</button>
              </div>

              <div v-if="isRegistering" class="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 transition-all" :style="{ width: `${(completedRequirements / 4) * 100}%` }"></div>
                </div>
                <ul class="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
                  <li v-for="req in passwordRequirements" :key="req.label" :class="req.isValid ? 'text-emerald-600 font-bold' : ''">{{ req.isValid ? '✓' : '•' }} {{ req.label }}</li>
                </ul>
              </div>
              <p v-if="errorPassword" class="mt-1 text-xs font-bold text-red-600">{{ errorPassword }}</p>
            </div>

            <button :disabled="loading || cooldownActive" type="submit" class="w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl shadow-blue-100 transition-all hover:bg-blue-700 disabled:opacity-50">{{ loading ? 'Procesando...' : isRegistering ? 'Crear cuenta segura' : 'Entrar al sistema' }}</button>
          </form>

          <div class="mt-6 text-center text-sm text-slate-600">
            <button @click="isRegistering = !isRegistering" class="font-black text-blue-600 underline underline-offset-4">{{ isRegistering ? 'Ya tengo cuenta' : 'Crear una cuenta nueva' }}</button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useAuth } from '../Composables/useAuth'

  const {
  email,
  password,
  nombre,
  cedula,
  loading,
  isRegistering,
  showPassword,
  cooldownActive,
  errorNombre,
  errorCedula,
  errorEmail,
  errorPassword,
  globalError,
  passwordRequirements,
  completedRequirements,
  validateNombre,
  validateCedula,
  validateEmail,
  validatePassword,
  handleAuthSubmit
} = useAuth()
</script>