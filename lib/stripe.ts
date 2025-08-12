import { Config } from '../constants/Config'
import { initPaymentSheet, initStripe, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from './supabase';

// Configurar Stripe cuando se inicie la app
export const initializeStripe = async () => {
  if (Config.STRIPE_PUBLISHABLE_KEY) {
    console.log('💳 Initializing Stripe...');
    try {
      await initStripe({
        publishableKey: Config.STRIPE_PUBLISHABLE_KEY,
        merchantIdentifier: 'merchant.com.paintme.app', // Cambiar por tu merchant ID
      });
      console.log('✅ Stripe initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Stripe:', error);
    }
  } else {
    console.warn('⚠️ Stripe publishable key not found');
  }
};

export interface PaymentIntentRequest {
  amount: number; // En centavos (ej: 499 para $4.99)
  currency: string; // 'usd', 'eur', etc.
  productId: string; // Para identificar qué paquete se compró
}

export interface PaymentResult {
  success: boolean;
  error?: string;
  paymentIntentId?: string;
}

export class StripeService {
  // Crear Payment Intent en el servidor (Supabase Edge Function)
  static async createPaymentIntent(request: PaymentIntentRequest): Promise<{ clientSecret?: string; error?: string }> {
    try {
      console.log('💳 Creating payment intent for:', request);
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: request
      });

      if (error) {
        console.error('❌ Error creating payment intent:', error);
        return { error: error.message };
      }

      console.log('✅ Payment intent created:', data.clientSecret ? 'Success' : 'No client secret');
      return { clientSecret: data.clientSecret };
    } catch (error) {
      console.error('❌ Unexpected error creating payment intent:', error);
      return { error: 'Failed to create payment intent' };
    }
  }

  // Inicializar y procesar el pago
  static async processPayment(clientSecret: string, amount: number): Promise<PaymentResult> {
    try {
      console.log('💳 Initializing payment sheet...');
      
      // 1. Primero inicializar el Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'PaintMe',
        paymentIntentClientSecret: clientSecret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: 'Cliente PaintMe',
        }
      });

      if (initError) {
        console.error('❌ Payment sheet init failed:', initError);
        return { 
          success: false, 
          error: initError.message 
        };
      }

      console.log('✅ Payment sheet initialized, presenting...');

      // 2. Luego presentar el Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        console.error('❌ Payment failed:', presentError);
        return { 
          success: false, 
          error: presentError.message 
        };
      }

      console.log('✅ Payment successful!');
      return { 
        success: true,
        paymentIntentId: clientSecret.split('_secret_')[0] // Extraer ID del secret
      };
    } catch (error) {
      console.error('❌ Unexpected payment error:', error);
      return { 
        success: false, 
        error: 'Payment processing failed' 
      };
    }
  }

  // Flujo completo de compra
  static async purchaseCredits(
    packageType: 'small' | 'medium' | 'large'
  ): Promise<PaymentResult> {
    const packages = {
      small: { amount: 599, credits: 5, productId: 'prod_SnZuznQUreq7y6' },
      medium: { amount: 1499, credits: 15, productId: 'prod_SnZujyFmt2tNHh' },
      large: { amount: 2299, credits: 30, productId: 'prod_SnZvwLMzmJw8Y2' }
    };

    const selectedPackage = packages[packageType];
    
    try {
      // 1. Crear Payment Intent
      const { clientSecret, error: intentError } = await this.createPaymentIntent({
        amount: selectedPackage.amount,
        currency: 'usd',
        productId: selectedPackage.productId
      });

      if (intentError || !clientSecret) {
        return { success: false, error: intentError || 'Failed to create payment' };
      }

      // 2. Procesar el pago
      const paymentResult = await this.processPayment(clientSecret, selectedPackage.amount);
      
      if (paymentResult.success) {
        console.log(`✅ Payment successful! User should receive ${selectedPackage.credits} credits`);
      }

      return paymentResult;
    } catch (error) {
      console.error('❌ Purchase flow error:', error);
      return { success: false, error: 'Purchase failed' };
    }
  }
}

// Mapeo de Product IDs a créditos (para webhooks)
export const STRIPE_PRODUCT_CREDITS = {
  'prod_SnZuznQUreq7y6': 5,   // Small package
  'prod_SnZujyFmt2tNHh': 15,  // Medium package  
  'prod_SnZvwLMzmJw8Y2': 30   // Large package
} as const;