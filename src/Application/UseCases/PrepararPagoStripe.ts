import { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository';

export class PrepararPagoStripe {
  constructor(private paymentRepo: IPaymentRepository) {}

  async ejecutar(amount: number, currency: string = 'usd') {
    // El monto debe estar en centavos para Stripe
    const amountInCents = Math.round(amount * 100);
    return await this.paymentRepo.createPaymentIntent(amountInCents, currency);
  }
}
