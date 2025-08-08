// Polyfill para TransformStream (necesario para Replicate)
import 'web-streams-polyfill/polyfill';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';


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

  // Inicializar Stripe cuando la app arranque
  useEffect(() => {
    initializeStripe();
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
