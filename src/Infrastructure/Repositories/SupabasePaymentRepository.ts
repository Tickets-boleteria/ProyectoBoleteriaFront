import { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository';
import { supabase } from '../Api/supabaseClient';

export class SupabasePaymentRepository implements IPaymentRepository {
  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<{ clientSecret: string }> {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount, currency },
    });

    if (error) {
      console.error('Error calling Edge Function:', error);
      throw new Error('No se pudo generar el intento de pago');
    }

    return data;
  }
}
