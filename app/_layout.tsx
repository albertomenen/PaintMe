import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import 'react-native-reanimated';
import { useColorScheme } from '../hooks/useColorScheme';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';
import { Analytics } from '../lib/analytics';
import MetaAnalytics from '../services/metaAnalytics';
import Onboarding from '../components/Onboarding';
import { CREDIT_PACKAGES } from '../lib/revenuecat';
import { useUser } from '../hooks/useUser';


// Main app content component
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
  console.log('🔍 DEBUG - useState hooks initialized');


  // Inicializar RevenueCat y notificaciones cuando la app arranque
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        // Verificación REAL usando getCustomerInfo
        let needsConfiguration = true;

        try {
          console.log('🔍 Testing if RevenueCat is already configured...');
          await Purchases.getCustomerInfo();
          console.log('✅ RevenueCat ya está configurado correctamente');
          needsConfiguration = false;
        } catch (error: any) {
          console.log('❌ RevenueCat NO configurado - error:', error?.message);
          needsConfiguration = true;
        }

        // Configurar logs para desarrollo
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

        // Configurar SOLO si realmente necesita configuración
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
                console.log('⚠️ Continuing without RevenueCat - payments may not work');
                return;
              }
            } else {
              console.error('❌ RevenueCat configuration failed completely:', configError);
              console.log('⚠️ App will continue but payments will not work');
              return;
            }
          }
        } else {
          console.log('🔄 Using existing RevenueCat configuration');
        }

        console.log('✅ RevenueCat configurado exitosamente');

        // Agregar listener automático para compras y suscripciones
        let lastProcessedTransactionId: string | null = null;
        let lastProcessedSubscriptionStatus: boolean | null = null;
        let listenerProcessing = false;

        Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
          console.log('🔔 LISTENER: Customer Info Updated - Checking for changes...');
          console.log('🔔 LISTENER: Currently processing?', listenerProcessing);

          if (listenerProcessing) {
            console.log('⏭️ LISTENER: Already processing, skipping...');
            return;
          }

          listenerProcessing = true;

          try {
            // DEBUG: Log all entitlements
            console.log('🔍 LISTENER: All active entitlements:', Object.keys(customerInfo.entitlements.active));
            console.log('🔍 LISTENER: All entitlements:', Object.keys(customerInfo.entitlements.all));

            // Check for premium subscription status - support multiple entitlement names
            const premiumEntitlementKey = Object.keys(customerInfo.entitlements.active).find(
              key => ['premium', 'Weekly subscription', 'Monthly Access'].includes(key)
            );
            const hasPremiumEntitlement = premiumEntitlementKey !== undefined;
            console.log('👑 LISTENER: Premium entitlement status:', hasPremiumEntitlement, 'Key:', premiumEntitlementKey);

            if (hasPremiumEntitlement !== lastProcessedSubscriptionStatus) {
              console.log('🎯 LISTENER: Subscription status changed!', lastProcessedSubscriptionStatus, '->', hasPremiumEntitlement);

              if (hasPremiumEntitlement && premiumEntitlementKey && (global as any).updatePremiumStatusGlobal) {
                try {
                  const activeEntitlement = customerInfo.entitlements.active[premiumEntitlementKey];
                  const subscriptionType = activeEntitlement?.productIdentifier || 'premium';

                  await (global as any).updatePremiumStatusGlobal(true, subscriptionType);
                  console.log('✅ LISTENER: Premium status updated successfully!');
                  lastProcessedSubscriptionStatus = true;
                } catch (error) {
                  console.error('❌ LISTENER: Failed to update premium status:', error);
                }
              } else if (!hasPremiumEntitlement && lastProcessedSubscriptionStatus === true && (global as any).updatePremiumStatusGlobal) {
                // Only update to false if we previously had premium (was true)
                // Don't update if status was null (never had premium) or already false
                try {
                  await (global as any).updatePremiumStatusGlobal(false);
                  console.log('✅ LISTENER: Premium status removed (subscription expired)');
                  lastProcessedSubscriptionStatus = false;
                } catch (error) {
                  console.error('❌ LISTENER: Failed to remove premium status:', error);
                }
              } else if (!hasPremiumEntitlement && lastProcessedSubscriptionStatus === null) {
                // First time checking and no premium - just update the flag without DB update
                console.log('ℹ️ LISTENER: User never had premium, skipping DB update');
                lastProcessedSubscriptionStatus = false;
              }
            }

            // Check for credit purchases (non-subscription transactions)
            const recentTransactions = customerInfo.nonSubscriptionTransactions;
            console.log('🔔 LISTENER: Transaction count:', recentTransactions.length);

            if (recentTransactions.length > 0) {
              const latestTransaction = recentTransactions[0];

              // Check if transaction was already processed
              if (lastProcessedTransactionId === latestTransaction.transactionIdentifier) {
                console.log('⏭️ LISTENER: Transaction already processed, skipping...');
                return;
              }

              // IMPORTANT: Only process recent transactions (within last 5 minutes)
              // This prevents processing old transactions when listener first initializes
              const transactionDate = new Date(latestTransaction.purchaseDate);
              const now = new Date();
              const timeDiffMinutes = (now.getTime() - transactionDate.getTime()) / (1000 * 60);

              console.log('💰 LISTENER: Transaction check:', {
                productId: latestTransaction.productIdentifier,
                transactionId: latestTransaction.transactionIdentifier,
                purchaseDate: latestTransaction.purchaseDate,
                minutesAgo: Math.round(timeDiffMinutes)
              });

              // Only process transactions from the last 5 minutes
              if (timeDiffMinutes > 5) {
                console.log('⏭️ LISTENER: Transaction too old (', Math.round(timeDiffMinutes), 'minutes), marking as processed without adding credits');
                lastProcessedTransactionId = latestTransaction.transactionIdentifier;
                return;
              }

              console.log('✅ LISTENER: Recent transaction detected - processing...');

              const packageData = CREDIT_PACKAGES.find(p => p.identifier === latestTransaction.productIdentifier);
              if (packageData) {
                const credits = packageData.credits;
                console.log('🎯 LISTENER: Auto-adding credits for new transaction:', credits);

                if ((global as any).addImageGenerationsGlobal) {
                  try {
                    await (global as any).addImageGenerationsGlobal(credits);
                    console.log('✅ LISTENER: Credits auto-added successfully via listener!');
                    lastProcessedTransactionId = latestTransaction.transactionIdentifier;
                  } catch (error) {
                    console.error('❌ LISTENER: Auto-add credits failed:', error);
                  }
                } else {
                  console.warn('⚠️ LISTENER: addImageGenerationsGlobal not available');
                }

                if (!(global as any).addImageGenerationsGlobal) {
                  lastProcessedTransactionId = latestTransaction.transactionIdentifier;
                  console.log('🔔 LISTENER: Transaction marked as processed (fallback)');
                }

              } else {
                console.warn('⚠️ LISTENER: No credit package found for product:', latestTransaction.productIdentifier);
                lastProcessedTransactionId = latestTransaction.transactionIdentifier;
              }
            } else {
              console.log('🔔 LISTENER: No transactions to process');
            }

          } finally {
            listenerProcessing = false;
            console.log('🔔 LISTENER: Processing flag reset');
          }
        });

        // Obtener customer info y sincronizar estado premium
        let customerInfo;
        try {
          console.log('🔍 Obteniendo customer info para sincronización...');
          customerInfo = await Purchases.getCustomerInfo();
          console.log('👤 Customer Info:', {
            originalAppUserId: customerInfo.originalAppUserId,
            firstSeen: customerInfo.firstSeen,
            activeEntitlements: Object.keys(customerInfo.entitlements.active),
            nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions.length,
          });

          // Sync premium status on app start - support multiple entitlement names
          const premiumEntitlementKey = Object.keys(customerInfo.entitlements.active).find(
            key => ['premium', 'Weekly subscription', 'Monthly Access'].includes(key)
          );
          const hasPremiumEntitlement = premiumEntitlementKey !== undefined;
          console.log('👑 Initial premium status check:', hasPremiumEntitlement, 'Key:', premiumEntitlementKey);

          if (hasPremiumEntitlement && premiumEntitlementKey && (global as any).updatePremiumStatusGlobal) {
            try {
              const activeEntitlement = customerInfo.entitlements.active[premiumEntitlementKey];
              const subscriptionType = activeEntitlement?.productIdentifier || 'premium';
              await (global as any).updatePremiumStatusGlobal(true, subscriptionType);
              console.log('✅ Premium status synced on app start');
            } catch (error) {
              console.error('❌ Failed to sync premium status on start:', error);
            }
          }

          // Obtener offerings
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
                });
              });
            }

          } catch (offeringsError: any) {
            console.error('❌ Error getting offerings:', offeringsError);
          }

        } catch (customerInfoError: any) {
          console.error('❌ Error getting customer info:', customerInfoError);
          console.log('⚠️ Continuing without customer info');
          customerInfo = null;
        }

        console.log('✅ RevenueCat initialization complete');

      } catch (error: any) {
        console.error('❌ FATAL ERROR in RevenueCat initialization:', error);
        console.error('Error details:', error?.message, error?.stack);
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

        // Track app opened with session info
        const sessionCount = 1; // You can persist this in AsyncStorage
        const daysSinceInstall = 0; // Calculate from install date
        const isFirstLaunch = true; // Check from AsyncStorage

        await Analytics.trackAppOpened(sessionCount, daysSinceInstall, isFirstLaunch);
        console.log('✅ Analytics initialized - Event "App Opened" sent to Mixpanel');
      } catch (error) {
        console.error('❌ Error configurando analytics:', error);
      }
    };

    console.log('🚀 Initializing app services...');
    initializeRevenueCat();
    initializeNotifications();
    initializeAnalytics();
    MetaAnalytics.initialize();
    MetaAnalytics.trackAppInstall(); // Track app activation
  }, []);

  // Handle notification responses
  useEffect(() => {
    const responseListener = NotificationService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      if (data?.redirectTo && typeof data.redirectTo === 'string') {
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
          console.log('✅ User signed in successfully');
          setIsAuthenticated(true);

          // Check if this is a new user
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
          Analytics.trackUserSignIn('apple');

          // Identify user in RevenueCat to sync purchases
          (async () => {
            try {
              await Purchases.logIn(session.user.id);
              console.log('✅ User identified in RevenueCat:', session.user.id);

              // Get customer info and sync premium status
              const customerInfo = await Purchases.getCustomerInfo();
              console.log('📋 Customer info after login:', {
                activeEntitlements: Object.keys(customerInfo.entitlements.active),
                allEntitlements: Object.keys(customerInfo.entitlements.all)
              });

              const premiumEntitlementKey = Object.keys(customerInfo.entitlements.active).find(
                key => ['premium', 'Weekly subscription', 'Monthly Access'].includes(key)
              );

              if (premiumEntitlementKey && (global as any).updatePremiumStatusGlobal) {
                const activeEntitlement = customerInfo.entitlements.active[premiumEntitlementKey];
                const subscriptionType = activeEntitlement?.productIdentifier || 'premium';
                console.log('🔄 Syncing premium status on login:', true, subscriptionType);
                await (global as any).updatePremiumStatusGlobal(true, subscriptionType);
              } else {
                console.log('⚠️ No active premium entitlements found after login');

                // Try to restore purchases to sync any subscriptions from anonymous user
                console.log('🔄 Attempting to restore purchases...');
                try {
                  const restoredInfo = await Purchases.restorePurchases();
                  console.log('📋 Restored customer info:', {
                    activeEntitlements: Object.keys(restoredInfo.entitlements.active),
                    allEntitlements: Object.keys(restoredInfo.entitlements.all)
                  });

                  // Check again for premium entitlements after restore
                  const restoredPremiumKey = Object.keys(restoredInfo.entitlements.active).find(
                    key => ['premium', 'Weekly subscription', 'Monthly Access'].includes(key)
                  );

                  if (restoredPremiumKey && (global as any).updatePremiumStatusGlobal) {
                    const restoredEntitlement = restoredInfo.entitlements.active[restoredPremiumKey];
                    const subscriptionType = restoredEntitlement?.productIdentifier || 'premium';
                    console.log('✅ Premium entitlement restored! Syncing to database:', true, subscriptionType);
                    await (global as any).updatePremiumStatusGlobal(true, subscriptionType);
                  } else {
                    console.log('ℹ️ No premium entitlements found after restore - user is not premium');
                  }
                } catch (restoreError) {
                  console.error('❌ Failed to restore purchases:', restoreError);
                }
              }
            } catch (error) {
              console.error('❌ Error identifying user in RevenueCat:', error);
            }
          })();

        } else if (event === 'SIGNED_OUT') {
          console.log('🔓 User signed out');
          setIsAuthenticated(false);
          Analytics.trackUserSignOut();
          Analytics.reset();
        } else {
          setIsAuthenticated(!!session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [resetOnboarding]);

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
    return <Onboarding onComplete={completeOnboarding} />;
  }

  console.log('🚀 Rendering navigation - Authenticated:', isAuthenticated);

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

// Component that exposes addImageGenerations and updatePremiumStatus globally for RevenueCat listener
function AppProvider({ children }: { children: React.ReactNode }) {
  const { addImageGenerations, updatePremiumStatus, forceUpdate } = useUser();

  React.useEffect(() => {
    if (addImageGenerations) {
      (global as any).addImageGenerationsGlobal = addImageGenerations;
      console.log('🌐 Global addImageGenerations function registered');
    }

    if (updatePremiumStatus) {
      (global as any).updatePremiumStatusGlobal = updatePremiumStatus;
      console.log('🌐 Global updatePremiumStatus function registered');
    }

    if (forceUpdate) {
      (global as any).forceUserUpdate = forceUpdate;
      console.log('🌐 Global forceUserUpdate function registered');
    }

    return () => {
      delete (global as any).addImageGenerationsGlobal;
      delete (global as any).updatePremiumStatusGlobal;
      delete (global as any).forceUserUpdate;
    };
  }, [addImageGenerations, updatePremiumStatus, forceUpdate]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
