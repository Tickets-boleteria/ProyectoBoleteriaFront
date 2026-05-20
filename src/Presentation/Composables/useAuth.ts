import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository';
import { useAuthStore } from '../Store/authStore';

const authRepository = new SupabaseAuthRepository();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const COOLDOWN_KEY = 'boleteria-auth-cooldown';

export function useAuth() {
  const router = useRouter();
  const authStore = useAuthStore();
  const email = ref('');
  const password = ref('');
  // nombre: campo de nombre completo (p. ej. "Gisselle Pérez")
  const nombre = ref('');
  const cedula = ref('');
  
  const loading = ref(false);
  const isRegistering = ref(false);
  const showPassword = ref(false);
  const cooldownActive = ref(false);
  
  // Centralización de estado: El usuario ahora es una propiedad computada que 
  // lee instantáneamente la sesión validada globalmente desde Pinia.
  const user = computed(() => authStore.user);

  // Errores IHC individuales adaptados a los atributos físicos
  const errorNombre = ref('');
  const errorCedula = ref('');
  const errorEmail = ref('');
  const errorPassword = ref('');
  const globalError = ref('');

  onMounted(async () => {
    const storedCooldown = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    if (storedCooldown && storedCooldown > Date.now()) {
      cooldownActive.value = true;
      setTimeout(() => {
        cooldownActive.value = false;
        localStorage.removeItem(COOLDOWN_KEY);
      }, storedCooldown - Date.now());
    }
  });

  const passwordRequirements = computed(() => [
    { label: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`, isValid: password.value.length >= MIN_PASSWORD_LENGTH },
    { label: 'Una letra mayúscula', isValid: /[A-Z]/.test(password.value) },
    { label: 'Una letra minúscula', isValid: /[a-z]/.test(password.value) },
    { label: 'Un número', isValid: /[0-9]/.test(password.value) },
  ]);

  const completedRequirements = computed(() => 
    passwordRequirements.value.filter(r => r.isValid).length
  );

  // Validación de nombre completo (nombre y apellido)
  const validateNombre = () => {
    const trimmed = nombre.value.trim();
    if (!trimmed) {
      errorNombre.value = 'Debes ingresar tu nombre y apellido completos.';
      return;
    }
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      errorNombre.value = 'Ingresa nombre y apellido completos, separados por un espacio.';
      return;
    }
    errorNombre.value = '';
  };

  // Validación de la Cédula (Ecuatoriana de 10 dígitos)
  const validateCedula = () => {
    const digits = cedula.value.trim();
    if (!digits) {
      errorCedula.value = 'Debes ingresar tu número de cédula.';
    } else if (!/^\d{10}$/.test(digits)) {
      errorCedula.value = 'La cédula debe contener exactamente 10 números.';
    } else {
      errorCedula.value = '';
    }
  };

  const validateEmail = () => {
    if (!email.value.trim()) {
      errorEmail.value = 'Debes ingresar tu correo electrónico.';
    } else if (!EMAIL_REGEX.test(email.value.trim())) {
      errorEmail.value = 'Ingresa un correo electrónico válido.';
    } else {
      errorEmail.value = '';
    }
  };

  const validatePassword = () => {
    if (!password.value) {
      errorPassword.value = 'Debes ingresar tu contraseña.';
      return;
    }
    if (isRegistering.value) {
      if (password.value.length < MIN_PASSWORD_LENGTH) {
        errorPassword.value = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
      } else if (!/[A-Z]/.test(password.value) || !/[a-z]/.test(password.value) || !/[0-9]/.test(password.value)) {
        errorPassword.value = 'La contraseña no cumple con los requisitos de seguridad.';
      } else {
        errorPassword.value = '';
      }
    } else {
      errorPassword.value = '';
    }
  };

  const handleAuthSubmit = async () => {
    if (loading.value || cooldownActive.value) return;
    
    globalError.value = '';
    
    if (isRegistering.value) {
      validateNombre();
      validateCedula();
    }
    validateEmail();
    validatePassword();

    if (errorNombre.value || errorCedula.value || errorEmail.value || errorPassword.value) {
      globalError.value = 'Revisa los campos marcados antes de continuar.';
      return;
    }

    loading.value = true;
    try {
      if (isRegistering.value) {
        // dividir nombre completo en nombres y apellidos para el repositorio
        const parts = nombre.value.trim().split(/\s+/).filter(Boolean);
        const nombresVal = parts.slice(0, 1).join(' ');
        const apellidosVal = parts.slice(1).join(' ') || '';

        await authRepository.signUp({
          email: email.value.trim(),
          password: password.value,
          nombres: nombresVal,
          apellidos: apellidosVal,
          cedula: cedula.value.trim()
        });
        // En entorno de desarrollo confirmación desactivada: el usuario puede iniciar sesión
        globalError.value = '¡Cuenta creada con éxito! Ya puedes iniciar sesión.';
        isRegistering.value = false;
        // opcional: limpiar contraseña por seguridad
        password.value = '';
      } else {
        const loggedUser = await authRepository.signIn(email.value.trim(), password.value);
        globalError.value = '';

        // Sincronización estricta con Pinia ANTES de invocar el enrutador
        authStore.user = loggedUser;
        authStore.isAuthenticated = true;

        // Redirigir a la pantalla correcta según el rol del usuario
        let redirectPath = '/';
        // Normalizamos el rol a minúsculas y sin espacios extra para compararlo de forma segura
        const rol = String(loggedUser.rol || '').toLowerCase().trim();
        
        if (rol === 'administrador' || rol === 'admin') {
          redirectPath = '/admin/buses'; // Pantalla inicial del Admin
        } else if (rol === 'oficinista') {
          redirectPath = '/venta';       // Pantalla inicial del Oficinista
        } else if (rol === 'chofer') {
          redirectPath = '/abordaje';    // Pantalla inicial del Chofer
        } else {
          redirectPath = '/buscar';      // Pantalla inicial del Cliente / Usuario Final
        }
        
        router.push(redirectPath);
      }
    } catch (err: any) {
      const msg = err.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('429')) {
        cooldownActive.value = true;
        localStorage.setItem(COOLDOWN_KEY, String(Date.now() + 60000));
        globalError.value = 'Demasiados intentos. Espera un minuto.';
      } else if (msg.includes('invalid login credentials')) {
        globalError.value = 'Correo o contraseña incorrectos.';
      } else if (msg.includes('email not confirmed')) {
        globalError.value = 'Por favor confirma tu correo antes de iniciar sesión.';
      } else if (msg.includes('already registered')) {
        globalError.value = 'Ese correo ya está registrado.';
      } else {
        globalError.value = err.message || 'Error en la autenticación.';
      }
    } finally {
      loading.value = false;
    }
  };

  return {
    email, password, nombre, cedula, loading, isRegistering, showPassword, cooldownActive, user,
    errorNombre, errorCedula, errorEmail, errorPassword, globalError, passwordRequirements, completedRequirements,
    validateNombre, validateCedula, validateEmail, validatePassword, handleAuthSubmit
  };
}