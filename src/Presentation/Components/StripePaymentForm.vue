<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';

const props = defineProps<{
  clientSecret: string;
  amount: number;
}>();

const emit = defineEmits(['success', 'error']);

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
let stripe: Stripe | null = null;
let elements: StripeElements | null = null;
let cardElement: StripeCardElement | null = null;

const cardElementRef = ref<HTMLElement | null>(null);
const isProcessing = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  stripe = await loadStripe(stripeKey);
  if (!stripe) return;

  elements = stripe.elements();
  cardElement = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  });

  if (cardElementRef.value) {
    cardElement.mount(cardElementRef.value);
  }
});

const handleSubmit = async () => {
  if (!stripe || !cardElement) return;

  isProcessing.value = true;
  errorMessage.value = '';

  const { error, paymentIntent } = await stripe.confirmCardPayment(props.clientSecret, {
    payment_method: {
      card: cardElement,
    },
  });

  if (error) {
    console.error('ERROR DETALLADO DE STRIPE:', error);
    errorMessage.value = error.message || 'Ocurrió un error al procesar el pago';
    emit('error', error);
  } else if (paymentIntent && paymentIntent.status === 'succeeded') {
    console.log('PAGO EXITOSO EN STRIPE:', paymentIntent);
    emit('success', paymentIntent);
  }

  isProcessing.value = false;
};
</script>

<template>
  <div class="stripe-payment-container p-4 bg-white rounded-lg shadow">
    <h3 class="text-lg font-semibold mb-4 text-gray-800">Pago con Tarjeta</h3>
    <p class="text-sm text-gray-600 mb-6">Monto a pagar: ${{ (amount).toFixed(2) }}</p>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="p-3 border rounded border-gray-300 bg-gray-50">
        <div ref="cardElementRef"></div>
      </div>
      
      <div v-if="errorMessage" class="text-red-500 text-sm mt-2">
        {{ errorMessage }}
      </div>

      <button
        type="submit"
        :disabled="isProcessing"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
      >
        {{ isProcessing ? 'Procesando...' : 'Confirmar Pago' }}
      </button>
    </form>
    
    <div class="mt-4 flex items-center justify-center space-x-2 grayscale opacity-50">
       <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" class="h-4">
       <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" class="h-6">
    </div>
  </div>
</template>

<style scoped>
.stripe-payment-container {
  max-width: 400px;
  margin: 0 auto;
}
</style>
