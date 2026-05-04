import { DomainException } from './DomainException';

export class InvalidCedulaException extends DomainException {
  constructor(message: string = 'La cédula no es válida.') {
    super(message, 'CEDULA_INVALIDA');
    this.name = 'InvalidCedulaException';
  }
}