export interface IUsuarioRepository {
  obtenerTodos(): Promise<any[]>;
  obtenerPorId(id: number): Promise<any>;
  obtenerPorCedula(cedula: string): Promise<any>;
  obtenerPorRol(rol: string): Promise<any[]>;
  crear(usuario: any): Promise<any>;
  actualizar(id: number, datos: any): Promise<any>;
  desactivar(id: number): Promise<void>;
}
