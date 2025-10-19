import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

export interface PurchaseResult {
  success: boolean;
  error?: string;
  customerInfo?: CustomerInfo;
}

export class RevenueCatService {
  // Obtener información del cliente
  static async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('📋 Customer Info obtenida:', {
        originalAppUserId: customerInfo.originalAppUserId,
        firstSeen: customerInfo.firstSeen,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
        nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions.length
      });
      return customerInfo;
    } catch (error) {
      console.error('❌ Error obteniendo customer info:', error);
      return null;
    }
  }

  // Obtener ofertas disponibles
  static async getPackages(): Promise<PurchasesPackage[]> {
    try {
      const offerings = await Purchases.getOfferings();
      
      // Verificamos si hay una oferta "current" y si tiene paquetes
      if (offerings.current && offerings.current.availablePackages.length !== 0) {
        console.log('✅ Paquetes de la oferta actual encontrados:', 
          offerings.current.availablePackages.map(p => p.product.identifier)
        );
        // Devolvemos directamente el array de paquetes
        return offerings.current.availablePackages;
      }
  
      console.warn('⚠️ No se encontró una oferta "current" o no tiene paquetes.');
      return []; // Devolvemos un array vacío si no hay nada
  
    } catch (error) {
      console.error('❌ Error obteniendo ofertas:', error);
      return [];
    }
  }

  // Realizar compra
  static async purchasePackage(packageToPurchase: PurchasesPackage): Promise<PurchaseResult> {
    try {
      console.log('💳 Iniciando compra:', {
        package: packageToPurchase.identifier,
        product: packageToPurchase.product.identifier,
        price: packageToPurchase.product.priceString
      });
      
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      console.log('✅ Compra exitosa!', {
        originalAppUserId: customerInfo.originalAppUserId,
        latestTransaction: customerInfo.nonSubscriptionTransactions[0]?.productIdentifier
      });
      
      return {
        success: true,
        customerInfo
      };
    } catch (error: any) {
      console.error('❌ Error en compra:', error);
      
      // Manejar cancelación del usuario
      if (error.userCancelled) {
        console.log('🚫 Usuario canceló la compra');
        return {
          success: false,
          error: 'Purchase cancelled by user'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }

  // Restaurar compras
  static async restorePurchases(): Promise<PurchaseResult> {
    try {
      console.log('🔄 Restaurando compras...');
      const customerInfo = await Purchases.restorePurchases();
      
      console.log('✅ Compras restauradas:', {
        transactions: customerInfo.nonSubscriptionTransactions.length,
        entitlements: Object.keys(customerInfo.entitlements.active)
      });
      
      return {
        success: true,
        customerInfo
      };
    } catch (error: any) {
      console.error('❌ Error restaurando compras:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore purchases'
      };
    }
  }

  // Identificar usuario
  static async identifyUser(userId: string): Promise<void> {
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      console.log('✅ Usuario identificado en RevenueCat:', {
        userId,
        originalAppUserId: customerInfo.originalAppUserId
      });
    } catch (error) {
      console.error('❌ Error identificando usuario:', error);
    }
  }

  // Cerrar sesión
  static async logout(): Promise<void> {
    try {
      await Purchases.logOut();
      console.log('✅ Usuario deslogueado de RevenueCat');
    } catch (error) {
      console.error('❌ Error al desloguear de RevenueCat:', error);
    }
  }

  // Verificar si el usuario tiene una suscripción activa
  static async hasActiveSubscription(entitlementId: string = 'premium'): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) return false;

      // Verificar si el entitlement está activo
      const isActive = customerInfo.entitlements.active[entitlementId] !== undefined;
      console.log('🔍 Subscription status:', {
        entitlementId,
        isActive,
        activeEntitlements: Object.keys(customerInfo.entitlements.active)
      });

      return isActive;
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      return false;
    }
  }

  // Obtener el tipo de suscripción activa
  static async getActiveSubscriptionType(entitlementId: string = 'premium'): Promise<string | null> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) return null;

      const premiumEntitlement = customerInfo.entitlements.active[entitlementId];
      if (!premiumEntitlement) return null;

      // Retorna el identificador del producto (ej: "artme_monthly")
      const productId = premiumEntitlement.productIdentifier;
      console.log('📦 Active subscription:', productId);

      return productId;
    } catch (error) {
      console.error('❌ Error getting subscription type:', error);
      return null;
    }
  }

  // Obtener información detallada de la suscripción
  static async getSubscriptionInfo(entitlementId: string = 'premium'): Promise<{
    isActive: boolean;
    productId: string | null;
    expirationDate: string | null;
    willRenew: boolean;
  }> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) {
        return { isActive: false, productId: null, expirationDate: null, willRenew: false };
      }

      const entitlement = customerInfo.entitlements.active[entitlementId];

      if (!entitlement) {
        return { isActive: false, productId: null, expirationDate: null, willRenew: false };
      }

      return {
        isActive: true,
        productId: entitlement.productIdentifier,
        expirationDate: entitlement.expirationDate || null,
        willRenew: entitlement.willRenew
      };
    } catch (error) {
      console.error('❌ Error getting subscription info:', error);
      return { isActive: false, productId: null, expirationDate: null, willRenew: false };
    }
  }
}

// Configuración de paquetes de créditos
export interface CreditPackage {
  identifier: string;
  credits: number;
  name: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    identifier: '5_images_artme',
    credits: 5,
    name: '5 Images Pack'
  },
  {
    identifier: '15_images_artme',
    credits: 15,
    name: '15 Images Pack'
  },
  {
    identifier: '30_images_artme',
    credits: 30,
    name: '30 Images Pack'
  }
];

// Configuración de paquetes de suscripción
export interface SubscriptionPackage {
  identifier: string;
  productId: string;
  name: string;
  displayName: string;
  period: 'weekly' | 'monthly' | 'yearly';
  features: string[];
}

export const SUBSCRIPTION_PACKAGES: SubscriptionPackage[] = [
  {
    identifier: 'artme_weekly',
    productId: 'com.yourapp.paintme.subscription.weekly',
    name: 'Weekly Premium',
    displayName: 'Weekly',
    period: 'weekly',
    features: ['Unlimited transformations', 'All art styles', 'Priority processing']
  },
  {
    identifier: 'artme_monthly',
    productId: 'com.yourapp.paintme.subscription.monthly',
    name: 'Monthly Premium',
    displayName: 'Monthly',
    period: 'monthly',
    features: ['Unlimited transformations', 'All art styles', 'Priority processing', 'Best value']
  },
  {
    identifier: 'artme_yearly',
    productId: 'com.yourapp.paintme.subscription.yearly',
    name: 'Yearly Premium',
    displayName: 'Yearly',
    period: 'yearly',
    features: ['Unlimited transformations', 'All art styles', 'Priority processing', 'Save 40%']
  }
];