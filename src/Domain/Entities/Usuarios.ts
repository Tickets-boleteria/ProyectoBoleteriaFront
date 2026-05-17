export interface User {
  id: string;
  email: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rol: string;
  activo: boolean;
  cooperativaId: string | null;
}