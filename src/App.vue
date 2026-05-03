<template>
  <div>
    <nav style="background:#1E3A5F; padding:10px 20px; display:flex; gap:20px;">
      <router-link to="/" style="color:white; text-decoration:none;">Historial</router-link>
      <router-link to="/usuarios" style="color:white; text-decoration:none;">Usuarios</router-link>
    </nav>
    <router-view />
  </div>
</template>
