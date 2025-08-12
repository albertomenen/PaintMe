import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { BlurView } from 'expo-blur';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../../lib/supabase';

import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const nonceRef = useRef<string | null>(null);

  // Debug: Log when login screen renders
  React.useEffect(() => {
    console.log('🔐 Login Screen: Rendered successfully');
    console.log('📱 Screen dimensions:', { width, height });
  }, []);

  const handleLogin = async () => {
    console.log('🔐 Login attempt started for:', email);
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        console.error('Supabase login error:', error);
        Alert.alert('Login Failed', `Error: ${error.message}\n\nDetails: ${JSON.stringify(error, null, 2)}`);
      } else {
        console.log('✅ Login successful:', data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Wait a moment for auth state to update
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  
    try {
      // 1️⃣ Generar nonce aleatorio seguro
      const rawNonce = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15) + 
                       Date.now().toString(36);
      nonceRef.current = rawNonce; // Guardar para usar con Supabase
  
      console.log('🔑 Generated nonce:', rawNonce);
  
      // 2️⃣ Hashear el nonce en SHA256 (formato HEX para Apple)
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce // ⚠️ sin encoding extra, por defecto es HEX
      );
  
      console.log('🔐 Hashed nonce (HEX):', hashedNonce);
  
      // 3️⃣ Iniciar sesión con Apple usando el hashedNonce
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce, // Apple recibe el hash
      });
  
      console.log('🍎 Apple credential:', {
        user: credential.user,
        hasIdentityToken: !!credential.identityToken
      });
  
      // 4️⃣ Enviar token de Apple + nonce original a Supabase
      if (credential.identityToken && nonceRef.current) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: nonceRef.current, // ⚠️ aquí va el ORIGINAL, no el hash
        });
  
        nonceRef.current = null; // Limpieza
  
        if (error) {
          console.error('❌ Supabase Apple auth error:', error);
          Alert.alert('Authentication Failed', error.message);
        } else {
          console.log('✅ Apple Sign-In successful!', data);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Error', 'No identity token received from Apple.');
      }
    } catch (error: any) {
      console.error('🍎 Apple Sign-In error:', error);
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('🍎 User canceled Apple Sign-In');
      } else {
        Alert.alert('Error', 'Could not sign in with Apple. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.background}
      >
        {/* Background Art */}
        <View style={styles.artBackground}>
          <Image
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Caravaggio_-_Bacco_adolescente_-_Google_Art_Project.jpg/800px-Caravaggio_-_Bacco_adolescente_-_Google_Art_Project.jpg' }}
            style={styles.backgroundImage}
            blurRadius={4}
          />
          <LinearGradient
            colors={['rgba(26,26,46,0.9)', 'rgba(15,52,96,0.8)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF6347']}
                style={styles.logoGradient}
              >
                <Image
                  source={require('../../assets/images/appstore.png')}
                  style={styles.logoImage}
                />
              </LinearGradient>
            </View>
            <Text style={styles.title}>PaintMe</Text>
            <Text style={styles.subtitle}>Transform into Masterpieces</Text>
          </View>

          {/* Login Form */}
          <BlurView intensity={20} style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to continue your artistic journey</Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#8E8E93"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#8E8E93"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#8E8E93" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.loginGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <View style={styles.spinner} />
                      <Text style={styles.loginText}>Signing In...</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Apple Sign-In */}
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={16}
                  style={styles.appleButton}
                  onPress={handleAppleLogin}
                />
              )}

              {/* Sign Up Link */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don&apos;t have an account? </Text>
                <Link href="/(auth)/signup" asChild>
                  <TouchableOpacity>
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </BlurView>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  artBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  form: {
    padding: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  passwordToggle: {
    padding: 4,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: 10,
    marginRight: 8,
  },
  loginText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  socialText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  signupLink: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
}); 