export interface ICambiosRepository {
  marcarImplementado(id: number, fechaImplementacion?: Date, githubUrl?: string): Promise<void>;
  contarImplementadosPorTipo(): Promise<Record<string, number>>;
}
