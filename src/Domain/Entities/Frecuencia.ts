export interface Frecuencia {
  id: string;
  origen: string;
  destino: string;
  hora: string;
  tipo: 'directo' | 'con_paradas';
  activa: boolean;
}

export interface Parada {
  id: string;
  frecuenciaId: string;
  nombre: string;
  orden: number;
  permiteVenta: boolean;
}