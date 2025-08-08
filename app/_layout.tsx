// Polyfill para TransformStream (necesario para Replicate)
import 'web-streams-polyfill/polyfill';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import 'react-native-reanimated';


import { useColorScheme } from '../hooks/useColorScheme';
import { supabase } from '../lib/supabase';

// Configurar TransformStream globalmente
if (typeof global.TransformStream === 'undefined') {
  const { TransformStream } = require('web-streams-polyfill');
  global.TransformStream = TransformStream;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Inicializar RevenueCat cuando la app arranque
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

    initializeRevenueCat();
  }, []);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
        } else if (event === 'SIGNED_OUT') {
          console.log('🔓 User signed out');
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!session);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!loaded || isAuthenticated === null) {
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
