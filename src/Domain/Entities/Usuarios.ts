export interface User {
  id: string; // UUID
  email: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  rol: string;
  activo: boolean;
  cooperativaId: number | null;
}