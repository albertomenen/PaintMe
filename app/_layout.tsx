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

        // Agregar listener automático para compras
        let lastProcessedTransactionId: string | null = null;
        let listenerProcessing = false;

        Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
          console.log('🔔 LISTENER: Customer Info Updated - Checking for new purchases...');
          console.log('🔔 LISTENER: Currently processing?', listenerProcessing);

          if (listenerProcessing) {
            console.log('⏭️ LISTENER: Already processing, skipping...');
            return;
          }

          listenerProcessing = true;

          try {
            const recentTransactions = customerInfo.nonSubscriptionTransactions;
            console.log('🔔 LISTENER: Transaction count:', recentTransactions.length);

            if (recentTransactions.length > 0) {
              const latestTransaction = recentTransactions[0];

              if (lastProcessedTransactionId === latestTransaction.transactionIdentifier) {
                console.log('⏭️ LISTENER: Transaction already processed, skipping...');
                return;
              }

              console.log('💰 LISTENER: New transaction detected:', {
                productId: latestTransaction.productIdentifier,
                transactionId: latestTransaction.transactionIdentifier,
                purchaseDate: latestTransaction.purchaseDate
              });

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
              }
            } else {
              console.log('🔔 LISTENER: No transactions to process');
            }

          } finally {
            listenerProcessing = false;
            console.log('🔔 LISTENER: Processing flag reset');
          }
        });

        // Obtener customer info
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

// Component that exposes addImageGenerations globally for RevenueCat listener
function AppProvider({ children }: { children: React.ReactNode }) {
  const { addImageGenerations } = useUser();

  React.useEffect(() => {
    if (addImageGenerations) {
      (global as any).addImageGenerationsGlobal = addImageGenerations;
      console.log('🌐 Global addImageGenerations function registered');
    }

    return () => {
      delete (global as any).addImageGenerationsGlobal;
    };
  }, [addImageGenerations]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
