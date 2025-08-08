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
  static async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      const offerings = await Purchases.getOfferings();
      console.log('📦 Offerings disponibles:', {
        current: offerings.current?.identifier,
        all: Object.keys(offerings.all)
      });
      
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        console.log('📋 Paquetes en offering actual:', 
          offerings.current.availablePackages.map(p => ({
            identifier: p.identifier,
            product: p.product.identifier,
            price: p.product.priceString
          }))
        );
      }
      
      return Object.values(offerings.all);
    } catch (error) {
      console.error('❌ Error obteniendo offerings:', error);
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
}

// Configuración de paquetes de créditos
export interface CreditPackage {
  identifier: string;
  credits: number;
  name: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    identifier: 'paintme_5_credits',
    credits: 5,
    name: 'Starter Pack'
  },
  {
    identifier: 'paintme_15_credits', 
    credits: 15,
    name: 'Creator Pack'
  },
  {
    identifier: 'paintme_30_credits',
    credits: 30,
    name: 'Artist Pack'
  }
];