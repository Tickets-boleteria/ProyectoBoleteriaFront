export interface IUsuarioRepository {
  obtenerTodos(): Promise<any[]>;
  obtenerPorId(id: string): Promise<any>; // UUID
  obtenerPorCedula(cedula: string): Promise<any>;
  obtenerPorRol(rol: string): Promise<any[]>;
  crear(usuario: any): Promise<any>;
  actualizar(id: string, datos: any): Promise<any>; // UUID
  desactivar(id: string): Promise<void>; // UUID
}
