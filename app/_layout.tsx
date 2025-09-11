import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View, Alert } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import 'react-native-reanimated';
import { SuperwallProvider, usePlacement, CustomPurchaseControllerProvider, useSuperwall, useUser as useSuperwallUser } from "expo-superwall";
import { useColorScheme } from '../hooks/useColorScheme';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';
import { Analytics } from '../lib/analytics';
import Onboarding from '../components/Onboarding';
import { CREDIT_PACKAGES } from '../lib/revenuecat';
import { useUser } from '../hooks/useUser';


// Internal component that can use Superwall hooks
function AppContent() {
  console.log('🔍 DEBUG - AppContent component starting...');
  
  const colorScheme = useColorScheme();
  console.log('🔍 DEBUG - colorScheme loaded');
  
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  console.log('🔍 DEBUG - fonts loaded:', loaded);
  
  const { isOnboardingCompleted, loading: onboardingLoading, completeOnboarding, resetOnboarding } = useOnboarding();
  console.log('🔍 DEBUG - onboarding hook loaded');
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [superwallReady, setSuperwallReady] = useState(false);
  console.log('🔍 DEBUG - useState hooks initialized');

  // Always call Superwall hooks (React hooks rules)
  console.log('🔍 DEBUG - About to call useSuperwall...');
  const superwall = useSuperwall();
  console.log('🔍 DEBUG - useSuperwall completed, result:', !!superwall);
  
  // Use the useSuperwallUser hook for user management
  console.log('🔍 DEBUG - About to call useSuperwallUser...');
  const { identify: identifyUser, user, update: updateUserAttributes } = useSuperwallUser();
  console.log('🔍 DEBUG - useSuperwallUser completed, user:', !!user);
  
  // Always call placement hooks but handle errors gracefully
  console.log('🔍 DEBUG - About to call placement hooks...');
  const { registerPlacement: registerCampaignTrigger } = usePlacement({
    onError: (err: any) => console.error("🚨 Campaign Trigger Error:", err),
    onPresent: (info: any) => console.log("💰 Campaign Paywall Presented:", info),
    onDismiss: (info: any, result: any) => {
      console.log('🔍 DEBUG - Campaign paywall dismissed');
      console.log("🔄 Campaign Paywall Dismissed:", info, "Result:", result);
      
      // If user declined the purchase, show transaction_abandon paywall
      if (result?.type === 'declined') {
        console.log("❌ Purchase declined, showing transaction abandon paywall");
        setTimeout(() => {
          if (superwallReady && registerTransactionAbandon) {
            registerTransactionAbandon({
              placement: 'transaction_abandon'
            });
          }
        }, 1000); // Small delay before showing the abandon paywall
      }
    },
  });
  console.log('🔍 DEBUG - First usePlacement completed');

  const { registerPlacement: registerTransactionAbandon } = usePlacement({
    onError: (err: any) => console.error("🚨 Transaction Abandon Error:", err),
    onPresent: (info: any) => console.log("🎯 Abandon Paywall Presented:", info),
    onDismiss: (info: any, result: any) => {
      console.log("🔄 Abandon Paywall Dismissed:", info, "Result:", result);
    },
  });
  console.log('🔍 DEBUG - Second usePlacement completed');
  console.log('🔍 DEBUG - All hooks initialized, setting up useEffects...');

  // Check if Superwall is ready
  useEffect(() => {
    if (superwall) {
      console.log('✅ Superwall is ready');
      setSuperwallReady(true);
    } else {
      console.log('⚠️ Superwall not ready yet');
      setSuperwallReady(false);
    }
  }, [superwall]);


  // Inicializar RevenueCat y notificaciones cuando la app arranque
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        // **CRITICAL FIX**: Verificación REAL usando getCustomerInfo en lugar de singleton inexistente
        let needsConfiguration = true;
        
        try {
          // **VERIFICACIÓN CORRECTA**: Intentar obtener customer info directamente
          console.log('🔍 Testing if RevenueCat is already configured...');
          await Purchases.getCustomerInfo();
          console.log('✅ RevenueCat ya está configurado correctamente');
          needsConfiguration = false;
        } catch (error: any) {
          console.log('❌ RevenueCat NO configurado - error:', error?.message);
          needsConfiguration = true;
        }

        // Configurar logs para desarrollo (siempre)
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

        // **CRITICAL FIX**: Configurar SOLO si realmente necesita configuración
        if (needsConfiguration) {
          console.log('⚡ Configurando RevenueCat...');
          
          const apiKey = Platform.OS === 'ios' 
            ? (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || 'appl_hruassCwittfwOnwpWiohOMQQUB')
            : (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || 'goog_your_android_key');
            
          console.log('🔍 Using API key:', apiKey.substring(0, 10) + '...', 'for platform:', Platform.OS);
          
          try {
            await Purchases.configure({ 
              apiKey,
              usesStoreKit2IfAvailable: false // Force StoreKit 1 for better test compatibility
            });
            console.log('✅ RevenueCat configurado exitosamente con StoreKit 1');
            
            // Verificar que realmente funciona
            await Purchases.getCustomerInfo();
            console.log('✅ Customer info accessible - configuración confirmada');
            
          } catch (configError: any) {
            console.error('❌ FATAL: RevenueCat configure failed:', configError);
            console.error('Error details:', configError?.message);
            
            // Si ya existe, intentar continuar
            if (configError?.message?.includes('already set') || 
                configError?.message?.includes('instance') ||
                configError?.message?.includes('configured')) {
              console.log('ℹ️ RevenueCat ya configurado, intentando continuar...');
              // Intentar obtener customer info con la configuración existente
              try {
                await Purchases.getCustomerInfo();
                console.log('✅ Using existing RevenueCat configuration');
              } catch (customerError: any) {
                console.error('❌ Cannot access customer info even with existing config:', customerError);
                // NO crash la app - continuar sin RevenueCat
                console.log('⚠️ Continuing without RevenueCat - payments may not work');
                return;
              }
            } else {
              // Error genuino - no crash la app pero log detallado
              console.error('❌ RevenueCat configuration failed completely:', configError);
              console.log('⚠️ App will continue but payments will not work');
              return;
            }
          }
        } else {
          console.log('🔄 Using existing RevenueCat configuration');
        }

        console.log('✅ RevenueCat configurado exitosamente');

        // **CRITICAL FIX**: Agregar listener automático para compras
        // Este listener se perdió en la migración y es ESENCIAL para actualizar Supabase automáticamente
        let lastProcessedTransactionId: string | null = null;
        let listenerProcessing = false; // Prevent concurrent processing
        
        Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
          console.log('🔔 LISTENER: Customer Info Updated - Checking for new purchases...');
          console.log('🔔 LISTENER: Currently processing?', listenerProcessing);
          
          // **CRITICAL**: Prevent concurrent processing that could cause infinite loops
          if (listenerProcessing) {
            console.log('⏭️ LISTENER: Already processing, skipping...');
            return;
          }
          
          listenerProcessing = true; // Set processing flag
          
          try {
            // Verificar si hay nuevas transacciones
            const recentTransactions = customerInfo.nonSubscriptionTransactions;
            console.log('🔔 LISTENER: Transaction count:', recentTransactions.length);
            
            if (recentTransactions.length > 0) {
              const latestTransaction = recentTransactions[0];
              
              // Evitar procesar la misma transacción dos veces
              if (lastProcessedTransactionId === latestTransaction.transactionIdentifier) {
                console.log('⏭️ LISTENER: Transaction already processed, skipping...');
                return;
              }
              
              console.log('💰 LISTENER: New transaction detected:', {
                productId: latestTransaction.productIdentifier,
                transactionId: latestTransaction.transactionIdentifier,
                purchaseDate: latestTransaction.purchaseDate
              });
            
              // Determinar cuántos créditos corresponden a este paquete
              const packageData = CREDIT_PACKAGES.find(p => p.identifier === latestTransaction.productIdentifier);
              if (packageData) {
                const credits = packageData.credits;
                console.log('🎯 LISTENER: Auto-adding credits for new transaction:', credits);
                
                // **ENABLED**: Auto-add credits via listener for automatic sync
                console.log('🎯 LISTENER: Auto-adding credits via listener');
                
                if ((global as any).addImageGenerationsGlobal) {
                  try {
                    await (global as any).addImageGenerationsGlobal(credits);
                    console.log('✅ LISTENER: Credits auto-added successfully via listener!');
                    
                    // Marcar esta transacción como procesada
                    lastProcessedTransactionId = latestTransaction.transactionIdentifier;
                    
                  } catch (error) {
                    console.error('❌ LISTENER: Auto-add credits failed:', error);
                  }
                } else {
                  console.warn('⚠️ LISTENER: addImageGenerationsGlobal not available');
                }
                
                // Fallback: Mark as processed if function not available
                if (!(global as any).addImageGenerationsGlobal) {
                  lastProcessedTransactionId = latestTransaction.transactionIdentifier;
                  console.log('🔔 LISTENER: Transaction marked as processed (fallback)');
                }
                
              } else {
                console.warn('⚠️ LISTENER: No credit package found for product:', latestTransaction.productIdentifier);
              }
            } else {
              console.log('🔔 LISTENER: No transactions to process');
            }
            
          } finally {
            listenerProcessing = false; // Always reset processing flag
            console.log('🔔 LISTENER: Processing flag reset');
          }
        });

        // **CRITICAL FIX**: Obtener customer info y debug offerings/products
        let customerInfo;
        try {
          console.log('🔍 Obteniendo customer info para sincronización...');
          customerInfo = await Purchases.getCustomerInfo();
          console.log('👤 Customer Info:', {
            originalAppUserId: customerInfo.originalAppUserId,
            firstSeen: customerInfo.firstSeen,
            activeEntitlements: Object.keys(customerInfo.entitlements.active),
            nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions.length,
            allTransactionIds: customerInfo.nonSubscriptionTransactions.map(t => t.transactionIdentifier),
            allProductIds: customerInfo.nonSubscriptionTransactions.map(t => t.productIdentifier)
          });
          
          // **DEBUG**: Obtener offerings para verificar mapeo de productos
          try {
            console.log('🛍️ Getting RevenueCat offerings...');
            const offerings = await Purchases.getOfferings();
            console.log('📦 RevenueCat Offerings:', {
              current: offerings.current?.identifier,
              availableOfferings: Object.keys(offerings.all),
              currentPackages: offerings.current?.availablePackages.length || 0
            });
            
            if (offerings.current) {
              console.log('🎯 Current Offering Packages:');
              offerings.current.availablePackages.forEach((pkg, index) => {
                console.log(`  Package ${index + 1}:`, {
                  identifier: pkg.identifier,
                  productId: pkg.product.identifier,
                  price: pkg.product.priceString,
                  title: pkg.product.title,
                  description: pkg.product.description
                });
              });
            }
            
            // **DEBUG**: Verificar mapeo con CREDIT_PACKAGES
            console.log('🔗 Credit Package Mapping:');
            CREDIT_PACKAGES.forEach(creditPkg => {
              const foundInOfferings = offerings.current?.availablePackages.find(
                pkg => pkg.product.identifier === creditPkg.identifier
              );
              console.log(`  ${creditPkg.identifier} (${creditPkg.credits} credits):`, 
                foundInOfferings ? '✅ Found' : '❌ Missing');
            });
            
          } catch (offeringsError: any) {
            console.error('❌ Error getting offerings:', offeringsError);
          }
          
        } catch (customerInfoError: any) {
          console.error('❌ Error getting customer info:', customerInfoError);
          console.log('⚠️ Continuing without customer info - may affect Superwall sync');
          customerInfo = null;
        }

        // **FIXED**: Using correct useSuperwallUser hook approach instead of non-existent setSubscriptionStatus
        console.log('🔄 Subscription status will be managed by useSuperwallUser hook automatically');
        
        // **FIXED**: Using useSuperwallUser hook - subscription status is managed automatically
        console.log('✅ RevenueCat initialization complete - useSuperwallUser hook will handle subscription status');

      } catch (error: any) {
        console.error('❌ FATAL ERROR in RevenueCat initialization:', error);
        console.error('Error details:', error?.message, error?.stack);
        
        // **FIXED**: Using useSuperwallUser hook - subscription status is managed automatically
        console.log('⚠️ RevenueCat initialization failed but useSuperwallUser hook will still manage subscription status');
      }
    };

    const initializeNotifications = async () => {
      try {
        const token = await NotificationService.registerForPushNotifications();
        if (token) {
          console.log('✅ Push notifications configuradas exitosamente');
        } else {
          console.log('⚠️ Push notifications no disponibles');
        }
      } catch (error) {
        console.error('❌ Error configurando notificaciones:', error);
      }
    };

    const initializeAnalytics = async () => {
      try {
        await Analytics.init();
        await Analytics.trackAppOpened();
      } catch (error) {
        console.error('❌ Error configurando analytics:', error);
      }
    };

    // Initialize RevenueCat - useSuperwallUser hook will handle subscription status automatically
    console.log('🚀 Initializing RevenueCat with useSuperwallUser hook integration...');
    console.log('🔍 DEBUG - Current states:', { superwallReady, superwall: !!superwall });
    initializeRevenueCat();
    
    // Initialize other services immediately (they don't depend on Superwall)
    console.log('🔍 DEBUG - About to initialize other services...');
    initializeNotifications();
    console.log('🔍 DEBUG - Notifications initialized');
    initializeAnalytics();
    console.log('🔍 DEBUG - Analytics initialized');
    console.log('🔍 DEBUG - useEffect complete');
  }, [superwall, superwallReady]);

  // Handle notification responses
  useEffect(() => {
    const responseListener = NotificationService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      
      if (data?.redirectTo && typeof data.redirectTo === 'string') {
        // Navigate to the specified route
        router.push(data.redirectTo as any);
      }
    });

    const notificationListener = NotificationService.addNotificationListener((notification) => {
      console.log('📱 Notification received while app is in foreground:', notification);
    });

    return () => {
      responseListener.remove();
      notificationListener.remove();
    };
  }, []);


  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authStatus = session ? 'AUTHENTICATED' : 'NOT AUTHENTICATED';
      console.log('🔐 Initial session check:', authStatus);
      console.log('📱 User ID:', session?.user?.id || 'None');
      console.log('📧 User Email:', session?.user?.email || 'None');
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const authStatus = session ? 'AUTHENTICATED' : 'NOT AUTHENTICATED';
        console.log('🔐 Auth state change:', event, authStatus);
        console.log('📱 Will navigate to:', session ? 'Main App' : 'Login Screen');
        
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ User signed in successfully via OAuth');
          setIsAuthenticated(true);
          
          // Check if this is a new user (registered within last 5 minutes)
          const userCreatedAt = new Date(session.user.created_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const isNewUser = userCreatedAt > fiveMinutesAgo;
          
          console.log('🔍 User creation check:', {
            userCreatedAt: userCreatedAt.toISOString(),
            fiveMinutesAgo: fiveMinutesAgo.toISOString(),
            isNewUser
          });
          
          if (isNewUser) {
            console.log('🆕 New user detected, resetting onboarding');
            resetOnboarding();
          }
          
          // Track user sign in
          Analytics.identifyUser(session.user.id, session.user.email);
          Analytics.trackUserSignIn('apple'); // Assuming Apple sign in based on your setup
          
          // **FIXED**: Using correct useSuperwallUser hook methods
          if (identifyUser && updateUserAttributes) {
            console.log('🎯 Identifying user with useSuperwallUser hook:', session.user.id);
            
            // Execute async operations without blocking
            (async () => {
              try {
                await identifyUser(session.user.id);
                console.log('✅ User identified successfully');
                
                // Set user attributes for paywall personalization
                const userAttributes = {
                  email: session.user.email,
                  userId: session.user.id,
                  createdAt: session.user.created_at,
                  signInProvider: 'apple'
                };
                await updateUserAttributes(userAttributes);
                console.log('✅ User attributes set:', userAttributes);
                
                console.log('🔄 Subscription status managed automatically by useSuperwallUser hook');
                console.log('ℹ️ RevenueCat will work automatically without explicit identification');
              } catch (error) {
                console.error('❌ Error with user identification:', error);
              }
            })();
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔓 User signed out');
          setIsAuthenticated(false);
          
          // Track user sign out and reset analytics
          Analytics.trackUserSignOut();
          Analytics.reset();
        } else {
          setIsAuthenticated(!!session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [resetOnboarding, identifyUser, updateUserAttributes]);

  if (!loaded || isAuthenticated === null || onboardingLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#1a1a2e'
      }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  // Show onboarding for authenticated users who haven't completed it
  if (isAuthenticated && !isOnboardingCompleted) {
    return <Onboarding onComplete={() => {
      completeOnboarding();
      // Show campaign_trigger paywall after onboarding completion
      setTimeout(() => {
        if (superwallReady && superwall && registerCampaignTrigger) {
          console.log("🎯 Triggering campaign_trigger paywall after onboarding");
          registerCampaignTrigger({
            placement: 'campaign_trigger'
          });
        } else {
          console.warn("⚠️ Cannot trigger paywall - Superwall not ready");
          console.log("🔍 Debug - superwallReady:", superwallReady, "superwall:", !!superwall, "registerCampaignTrigger:", !!registerCampaignTrigger);
          // Retry after additional delay
          setTimeout(() => {
            if (superwallReady && superwall && registerCampaignTrigger) {
              console.log("🔄 Retrying campaign_trigger paywall");
              registerCampaignTrigger({
                placement: 'campaign_trigger'
              });
            } else {
              console.error("❌ Failed to trigger paywall after retry");
              console.log("🔍 Debug retry - superwallReady:", superwallReady, "superwall:", !!superwall, "registerCampaignTrigger:", !!registerCampaignTrigger);
            }
          }, 2000);
        }
      }, 500);
    }} />;
  }

  console.log('🚀 Rendering navigation - Authenticated:', isAuthenticated);
  console.log('🔍 DEBUG - Superwall state:', { superwallReady, superwall: !!superwall });
  console.log('🔍 DEBUG - About to render navigation...');

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated screens
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </>
        ) : (
          // Authentication screens  
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// Component that creates the purchase controller with access to user functions
function PurchaseControllerProvider({ children }: { children: React.ReactNode }) {
  const { addImageGenerations } = useUser(); // This is the local hook, not the Superwall one
  
  // **CRITICAL FIX**: Exponer addImageGenerations globalmente para el listener automático
  React.useEffect(() => {
    if (addImageGenerations) {
      (global as any).addImageGenerationsGlobal = addImageGenerations;
      console.log('🌐 Global addImageGenerations function registered');
    }
    
    // Cleanup on unmount
    return () => {
      delete (global as any).addImageGenerationsGlobal;
    };
  }, [addImageGenerations]);
  
  
  // Purchase controller that actually adds credits to user account
  const purchaseController = {
    onPurchase: async (params: any): Promise<void> => {
      console.log('🛒 PURCHASE STARTED - productId:', params.productId);
      console.log('🛒 PURCHASE - Full params:', JSON.stringify(params, null, 2));
      console.log('🛒 PURCHASE - addImageGenerations available:', !!addImageGenerations);
      console.log('🛒 PURCHASE - Global function available:', !!(global as any).addImageGenerationsGlobal);
      
      // Main purchase logic - no timeout needed since it returns quickly
      try {
        
        if (params.platform === "ios") {
          console.log('🔍 STEP 1: Getting packages for product:', params.productId);
          const offerings = await Purchases.getOfferings();
          console.log('🔍 STEP 1 COMPLETE: Offerings received');
          
          // Find the package with the matching product identifier
          let targetPackage = null;
          if (offerings.current) {
            targetPackage = offerings.current.availablePackages.find(
              pkg => pkg.product.identifier === params.productId
            );
          }
          
          if (!targetPackage) {
            console.log('❌ PURCHASE FAILED: Package not found for product:', params.productId);
            Alert.alert("❌ Error", "Product not available");
            throw new Error(`Package not found for product ${params.productId}`);
          }
          
          console.log('📦 STEP 2: Package found:', {
            package: targetPackage.identifier,
            title: targetPackage.product.title, 
            price: targetPackage.product.priceString,
            identifier: targetPackage.product.identifier
          });
          
          console.log('🚀 STEP 3: Initiating RevenueCat purchase with purchasePackage...');
          const { customerInfo } = await Purchases.purchasePackage(targetPackage);
          console.log('🚀 STEP 3 COMPLETE: Purchase result received');
          
          // **CRITICAL**: Find how many credits this product should give
          const packageData = CREDIT_PACKAGES.find(p => p.identifier === params.productId);
          const credits = packageData?.credits || 5; // Default to 5 if not found
          
          console.log('✅ STEP 4: Purchase completed, analyzing result:', {
            productId: params.productId,
            creditsToAdd: credits,
            packageFound: !!packageData,
            nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions.length,
            latestTransaction: customerInfo.nonSubscriptionTransactions[0]?.productIdentifier
          });
          
          // **FAST RETURN**: Let listener handle credit addition automatically
          console.log('✅ STEP 5: Purchase completed - letting listener add credits automatically');
          console.log('🏁 PURCHASE CONTROLLER COMPLETE: Returning to Superwall immediately');
          console.log('ℹ️ Credits will be added via RevenueCat listener in background');
          
          // Show success message but don't wait for credit addition
          setTimeout(() => {
            Alert.alert("🎉 Purchase Successful!", `${credits} transformations will be added to your account shortly!`);
          }, 500);
          
          return;
            
        } else {
          throw new Error("Android purchases not implemented");
        }
      } catch (error: any) {
        console.error("❌ Purchase failed:", error);
        
        // Handle user cancellation gracefully (don't show error for cancellation)
        if (error?.message?.includes('cancelled') || error?.message?.includes('canceled')) {
          console.log('ℹ️ User cancelled purchase');
          // Don't throw for cancellation - just return
          return;
        }
        
        // For other errors, show alert and throw
        Alert.alert("Purchase Error", error?.message || 'Purchase failed');
        throw error;
      }
    },
    
    onPurchaseRestore: async () => {
      console.log('🔄 Starting purchase restore...');
      
      try {
        const customerInfo = await Purchases.restorePurchases();
        const transactionCount = customerInfo.nonSubscriptionTransactions.length;
        
        console.log('✅ Purchases restored:', {
          transactionCount,
          transactions: customerInfo.nonSubscriptionTransactions.map(t => t.productIdentifier),
          entitlements: Object.keys(customerInfo.entitlements.active)
        });
        
        // Calculate total credits from all transactions and add them
        let totalCredits = 0;
        customerInfo.nonSubscriptionTransactions.forEach(transaction => {
          const packageData = CREDIT_PACKAGES.find(p => p.identifier === transaction.productIdentifier);
          if (packageData) {
            totalCredits += packageData.credits;
          }
        });
        
        if (totalCredits > 0 && addImageGenerations) {
          await addImageGenerations(totalCredits);
          Alert.alert("🎉 Restore Successful!", `${totalCredits} transformations restored to your account!`);
          console.log(`✅ ${totalCredits} credits restored to user account`);
        }
        
        return;
        
      } catch (error: any) {
        console.error("❌ Restore failed:", error);
        Alert.alert("Restore Error", error.message || 'Restore failed');
        throw error;
      }
    },
  };
  
  return (
    <CustomPurchaseControllerProvider controller={purchaseController}>
      {children}
    </CustomPurchaseControllerProvider>
  );
}

export default function RootLayout() {
  const superwallApiKey = "pk_CWUYuUCZLqn5-DHooMRT5";
  
  
  return (
    <PurchaseControllerProvider>
      <SuperwallProvider apiKeys={{ ios: superwallApiKey }}>
        <AppContent />
      </SuperwallProvider>
    </PurchaseControllerProvider>
  );
}
