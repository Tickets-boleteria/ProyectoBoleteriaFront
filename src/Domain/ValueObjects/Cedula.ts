import { InvalidCedulaException } from '../Exceptions/InvalidCedulaException';

export class Cedula {
  private constructor(private readonly valorInterno: string) {}

  static crear(valor: string): Cedula {
    const cedula = valor.trim();

    if (!cedula) {
      throw new InvalidCedulaException('La cédula es obligatoria.');
    }

    if (!/^\d{10}$/.test(cedula)) {
      throw new InvalidCedulaException('La cédula debe contener exactamente 10 dígitos.');
    }

    const provincia = Number(cedula.slice(0, 2));
    if (provincia < 1 || provincia > 24) {
      throw new InvalidCedulaException('La cédula tiene un código de provincia inválido.');
    }

    const tercerDigito = Number(cedula[2]);
    if (tercerDigito >= 6) {
      throw new InvalidCedulaException('La cédula tiene un tercer dígito inválido.');
    }

    const digitos = cedula.split('').map(Number);
    const verificador = digitos[9];
    const suma = digitos.slice(0, 9).reduce((acumulado, digito, indice) => {
      let valorParcial = digito * (indice % 2 === 0 ? 2 : 1);

      if (valorParcial > 9) {
        valorParcial -= 9;
      }

      return acumulado + valorParcial;
    }, 0);

    const modulo = suma % 10;
    const digitoValidacion = modulo === 0 ? 0 : 10 - modulo;

    if (digitoValidacion !== verificador) {
      throw new InvalidCedulaException('La cédula no supera la validación del dígito verificador.');
    }

    return new Cedula(cedula);
  }

  get valor(): string {
    return this.valorInterno;
  }
}