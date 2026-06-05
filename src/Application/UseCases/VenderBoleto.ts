import { ValidarAsignacionAsiento, ValidarAsientoInput } from '../../Domain/Services/ValidarAsignacionAsiento';
import { DomainException } from '../../Domain/Exceptions/DomainException';

export interface VenderBoletoInput {
  frecuenciaId: number;
  esDirecto: boolean;
  paradaDestinoId: number;
  terminalDestinoId: number;
  pasajeroCedula: string;
  pasajeroNombres: string;
  pasajeroApellidos: string;
  cantidadBoletos: number;
}

export class VenderBoleto {
  constructor() {}

  async ejecutar(input: VenderBoletoInput): Promise<boolean> {
    // 1. Validar regla de negocio de asientos en rutas directas
    const validacionInput: ValidarAsientoInput = {
      rutaTipoDirecta: input.esDirecto,
      paradaDestinoId: input.paradaDestinoId,
      terminalDestinoId: input.terminalDestinoId
    };

    const esValido = ValidarAsignacionAsiento.esAsignacionValida(validacionInput);

    if (!esValido) {
      throw new DomainException("Regla de negocio rota: No se permiten paradas intermedias en una frecuencia directa.");
    }

    // 2. Aquí iría la lógica de persistencia en el repositorio (pendiente de implementar formalmente)
    // Por ahora, simulamos éxito si la validación pasa.
    console.log("Venta validada exitosamente para:", input.pasajeroNombres);
    
    return true;
  }
}
