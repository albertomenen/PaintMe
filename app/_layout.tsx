import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import 'react-native-reanimated';
import { SuperwallProvider } from "expo-superwall";


import { useColorScheme } from '../hooks/useColorScheme';
import { useOnboarding } from '../hooks/useOnboarding';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../lib/notifications';
import { Analytics } from '../lib/analytics';
import Onboarding from '../components/Onboarding';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const { isOnboardingCompleted, loading: onboardingLoading, completeOnboarding, resetOnboarding } = useOnboarding();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const superwallApiKey = "pk_CWUYuUCZLqn5-DHooMRT5";


  // Inicializar RevenueCat y notificaciones cuando la app arranque
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        // Configurar logs para desarrollo
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

        // Configurar RevenueCat según la plataforma
        if (Platform.OS === 'ios') {
          await Purchases.configure({
            apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || 'appl_hruassCwittfwOnwpWiohOMQQUB'
          });
        } else {
          // Android
          await Purchases.configure({
            apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || 'goog_your_android_key'
          });
        }

        console.log('✅ RevenueCat configurado exitosamente');

        // Obtener información inicial del cliente
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('👤 Customer Info:', {
          originalAppUserId: customerInfo.originalAppUserId,
          firstSeen: customerInfo.firstSeen,
          activeEntitlements: Object.keys(customerInfo.entitlements.active)
        });

      } catch (error) {
        console.error('❌ Error configurando RevenueCat:', error);
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

    initializeRevenueCat();
    initializeNotifications();
    initializeAnalytics();
  }, []);

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
    return <Onboarding onComplete={() => {
      completeOnboarding();
    }} />;
  }

  console.log('🚀 Rendering navigation - Authenticated:', isAuthenticated);

  return (
    <SuperwallProvider apiKeys={{ ios: superwallApiKey }}>
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
    </SuperwallProvider>
  );
}
