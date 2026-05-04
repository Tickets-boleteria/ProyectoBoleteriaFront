import { ref } from 'vue';
import { CalcularDescuentoVenta } from '../../Application/UseCases/CalcularDescuentoVenta';
import { ResultadoDescuentoVentaDto } from '../../Application/Dtos/CalcularDescuentoVentaDto';

export function useVentaDescuento() {
  const cedula = ref('');
  const edad = ref<number | null>(null);
  const tieneDiscapacidad = ref(false);
  const precioBase = ref<number | null>(null);

  // El tramo permite soportar ventas entre paradas intermedias.
  const origen = ref('');
  const destino = ref('');

  const resultado = ref<ResultadoDescuentoVentaDto | null>(null);
  const errorMessage = ref<string | null>(null);

  const casoDeUso = new CalcularDescuentoVenta();

  const calcular = () => {
    errorMessage.value = null;

    try {
      if (edad.value === null || precioBase.value === null) {
        throw new Error('Debes ingresar edad y precio base.');
      }

      resultado.value = casoDeUso.ejecutar({
        numeroCedula: cedula.value,
        edad: edad.value,
        tieneDiscapacidad: tieneDiscapacidad.value,
        precioBase: precioBase.value,
      });
    } catch (error: any) {
      resultado.value = null;
      errorMessage.value = error.message ?? 'No se pudo calcular el descuento.';
    }
  };

  return {
    cedula,
    edad,
    tieneDiscapacidad,
    precioBase,
    origen,
    destino,
    resultado,
    errorMessage,
    calcular,
  };
}