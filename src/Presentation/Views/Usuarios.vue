<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SupabaseUsuarioRepository } from '../../Infrastructure/Repositories/SupabaseUsuarioRepository';
import { GetUsuarios } from '../../Application/UseCases/GetUsuarios';
import { CrearUsuario } from '../../Application/UseCases/CrearUsuario';
import { DesactivarUsuario } from '../../Application/UseCases/DesactivarUsuario';

const repo = new SupabaseUsuarioRepository();
const usuarios = ref<any[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const mostrarFormulario = ref(false);

const nuevoUsuario = ref({
  cedula: '', nombres: '', apellidos: '',
  email: '', password: '', telefono: '',
  rol: 'Cliente', cooperativaId: null
});

const cargarUsuarios = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const useCase = new GetUsuarios(repo);
    usuarios.value = await useCase.ejecutar();
  } catch (e: any) {
    errorMessage.value = e.message;
  } finally {
    isLoading.value = false;
  }
};

const crearUsuario = async () => {
  try {
    const useCase = new CrearUsuario(repo);
    await useCase.ejecutar(nuevoUsuario.value);
    mostrarFormulario.value = false;
    await cargarUsuarios();
  } catch (e: any) {
    errorMessage.value = e.message;
  }
};

const desactivarUsuario = async (id: number) => {
  if (!confirm('¿Desactivar este usuario?')) return;
  try {
    const useCase = new DesactivarUsuario(repo);
    await useCase.ejecutar(id);
    await cargarUsuarios();
  } catch (e: any) {
    errorMessage.value = e.message;
  }
};

onMounted(cargarUsuarios);
</script>

<template>
  <div style="padding: 20px;">
    <h1>Gestión de Usuarios</h1>

    <button @click="mostrarFormulario = !mostrarFormulario"
      style="background:#1D4ED8; color:white; padding:10px 20px; border-radius:5px; border:none; cursor:pointer; margin-bottom:20px;">
      {{ mostrarFormulario ? 'Cancelar' : '+ Nuevo Usuario' }}
    </button>

    <div v-if="mostrarFormulario" style="background:#f4f4f4; padding:20px; border-radius:8px; margin-bottom:20px;">
      <h3>Nuevo Usuario</h3>
      <input v-model="nuevoUsuario.cedula"    placeholder="Cédula"    style="display:block; margin:8px 0; padding:8px; width:100%;"/>
      <input v-model="nuevoUsuario.nombres"   placeholder="Nombres"   style="display:block; margin:8px 0; padding:8px; width:100%;"/>
      <input v-model="nuevoUsuario.apellidos" placeholder="Apellidos" style="display:block; margin:8px 0; padding:8px; width:100%;"/>
      <input v-model="nuevoUsuario.email"     placeholder="Email"     style="display:block; margin:8px 0; padding:8px; width:100%;"/>
      <input v-model="nuevoUsuario.password"  placeholder="Password"  type="password" style="display:block; margin:8px 0; padding:8px; width:100%;"/>
      <input v-model="nuevoUsuario.telefono"  placeholder="Teléfono"  style="display:block; margin:8px 0; padding:8px; width:100%;"/>
      <select v-model="nuevoUsuario.rol" style="display:block; margin:8px 0; padding:8px; width:100%;">
        <option>Admin</option>
        <option>Oficinista</option>
        <option>Chofer</option>
        <option>Cliente</option>
      </select>
      <button @click="crearUsuario"
        style="background:#16a34a; color:white; padding:10px 20px; border-radius:5px; border:none; cursor:pointer;">
        Guardar Usuario
      </button>
    </div>

    <div v-if="errorMessage" style="color:red; margin-bottom:10px;">
      <strong>Error:</strong> {{ errorMessage }}
    </div>

    <div v-if="isLoading">Cargando usuarios...</div>

    <table v-if="usuarios.length > 0" style="width:100%; border-collapse:collapse;">
      <thead style="background:#1E3A5F; color:white;">
        <tr>
          <th style="padding:10px;">Cédula</th>
          <th style="padding:10px;">Nombres</th>
          <th style="padding:10px;">Email</th>
          <th style="padding:10px;">Rol</th>
          <th style="padding:10px;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.Id" style="border-bottom:1px solid #ddd;">
          <td style="padding:10px;">{{ u.Cedula }}</td>
          <td style="padding:10px;">{{ u.Nombres }} {{ u.Apellidos }}</td>
          <td style="padding:10px;">{{ u.Email }}</td>
          <td style="padding:10px;">
            <span :style="{
              background: u.Rol === 'Admin' ? '#DBEAFE' : u.Rol === 'Oficinista' ? '#DCFCE7' : u.Rol === 'Chofer' ? '#FEF3C7' : '#F3F4F6',
              padding: '4px 10px', borderRadius: '12px', fontSize: '13px'
            }">{{ u.Rol }}</span>
          </td>
          <td style="padding:10px;">
            <button @click="desactivarUsuario(u.Id)"
              style="background:#dc2626; color:white; padding:5px 12px; border-radius:4px; border:none; cursor:pointer;">
              Desactivar
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else-if="!isLoading && !errorMessage">
      No hay usuarios registrados.
    </div>
  </div>
</template>
