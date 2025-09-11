import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth, useUser } from '../../hooks/useUser';
import { CREDIT_PACKAGES, RevenueCatService } from '../../lib/revenuecat';
import { supabase } from '../../lib/supabase';
import NotificationSettingsScreen from '../../components/NotificationSettings';
import LanguageSelector from '../../components/LanguageSelector';
import { Analytics } from '../../lib/analytics';

export default function ProfileScreen() {
  const { user, addImageGenerations, transformations, updateTrigger } = useUser();
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  // Force re-render trigger
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Track profile view
  React.useEffect(() => {
    Analytics.trackProfileViewed();
  }, []);

  // Monitor user changes in profile
  React.useEffect(() => {
    console.log('📊 Profile - User data changed:', {
      hasUser: !!user,
      imageGenerationsRemaining: user?.imageGenerationsRemaining,
      credits: user?.credits,
      totalTransformations: user?.totalTransformations,
      updateTrigger
    });
  }, [user?.imageGenerationsRemaining, user?.credits, user?.totalTransformations, updateTrigger]);

  // Cargar datos de RevenueCat
  // ProfileScreen.tsx

// Cargar datos de RevenueCat
useEffect(() => {
  const loadRevenueCatData = async () => {
    try {
      // Identificar usuario si está logueado
      if (user?.id) {
        await RevenueCatService.identifyUser(user.id);
      }

      // Obtener customer info
      const info = await RevenueCatService.getCustomerInfo();
      setCustomerInfo(info);

      // Obtener los paquetes de la oferta actual directamente
      const packages = await RevenueCatService.getPackages();
      setOfferings(packages);

    } catch (error) { // <-- Ahora el catch está dentro de la función
      console.error('❌ Error cargando datos de RevenueCat:', error);
      Alert.alert('Error', 'Could not load products. Please try again later.');
    }
  }; // <-- La llave que cierra 'loadRevenueCatData' está aquí

  if (user) {
    loadRevenueCatData();
  }
}, [user?.id, user]);

  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Nueva función para comprar con RevenueCat
  const handleRevenueCatPurchase = async (packageToPurchase: PurchasesPackage) => {
    setIsLoading(true);
    
    try {
      const result = await RevenueCatService.purchasePackage(packageToPurchase);
      
      if (result.success && result.customerInfo) {
        // Determinar cuántos créditos corresponden a este paquete
        const packageData = CREDIT_PACKAGES.find(p => p.identifier === packageToPurchase.product.identifier);
        const credits = packageData?.credits || 5;
        
        // Actualizar créditos en Supabase
        console.log('🏪 PROFILE: Attempting to add credits:', credits);
        await addImageGenerations(credits);
        console.log('🏪 PROFILE: Credits added successfully via Profile purchase');
        
        // Force immediate UI update in profile
        forceUpdate();
        
        // Wait a bit for the database update to propagate
        setTimeout(() => {
          forceUpdate();
        }, 1000);
        
        // Actualizar customer info local
        setCustomerInfo(result.customerInfo);
        
        Alert.alert(
          '🎉 ¡Compra Exitosa!',
          `${credits} transformaciones añadidas a tu cuenta!`
        );
      } else {
        if (result.error !== 'Purchase cancelled by user') {
          Alert.alert('Error de Compra', result.error || 'No se pudo procesar el pago');
        }
      }
    } catch (error) {
      console.error('❌ Error en compra:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para restaurar compras
  const handleRestorePurchases = async () => {
    setIsLoading(true);
    
    try {
      const result = await RevenueCatService.restorePurchases();
      
      if (result.success) {
        Alert.alert(
          '✅ Compras Restauradas',
          'Tus compras anteriores han sido restauradas exitosamente.'
        );
        
        // Recargar customer info
        const info = await RevenueCatService.getCustomerInfo();
        setCustomerInfo(info);
      } else {
        Alert.alert(
          'Sin Compras',
          'No se encontraron compras anteriores para restaurar.'
        );
      }
    } catch (error) {
      console.error('❌ Error restaurando compras:', error);
      Alert.alert('Error', 'No se pudieron restaurar las compras.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para eliminar cuenta
  const handleDeleteAccount = async () => {
    Alert.alert(
      '⚠️ Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data, transformations, and purchases.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Segunda confirmación
            Alert.alert(
              '🚨 Final Confirmation',
              'This will permanently delete your account and all associated data. Type DELETE to confirm.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE ACCOUNT',
                  style: 'destructive',
                  onPress: async () => {
                    setIsLoading(true);
                    
                    try {
                      console.log('🗑️ Attempting to delete user account...');
                      
                      // Llamar a Supabase Edge Function para eliminar cuenta
                      const { error } = await supabase.functions.invoke('delete-user', {
                        body: JSON.stringify({ userId: user?.id })
                      });

                      if (error) {
                        console.error('❌ Delete account error:', error);
                        Alert.alert(
                          'Error', 
                          'Failed to delete account. Please contact support at alberto@notjustvpn.com'
                        );
                      } else {
                        console.log('✅ Account deleted successfully');
                        
                        // Logout de RevenueCat
                        await RevenueCatService.logout();
                        
                        // Sign out de Supabase
                        await signOut();
                        
                        Alert.alert(
                          '✅ Account Deleted',
                          'Your account has been permanently deleted.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                router.replace('/(auth)/login');
                              }
                            }
                          ]
                        );
                      }
                    } catch (error) {
                      console.error('❌ Delete account error:', error);
                      Alert.alert(
                        'Error',
                        'An unexpected error occurred. Please contact support.'
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const openEmailSupport = async () => {
    const email = 'alberto@notjustvpn.com';
    const subject = 'PaintMe App Support';
    const body = 'Hi Alberto,\n\nI need help with the PaintMe app.\n\n';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No email app available. Please email us at: alberto@notjustvpn.com');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open email app. Please contact: alberto@notjustvpn.com');
    }
  };

  const openTermsAndPrivacy = async () => {
    const url = 'https://menendez.dev/terms';
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not open browser. Please visit: https://menendez.dev/terms');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open link. Please visit: https://menendez.dev/terms');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            console.log('🔓 Attempting to sign out...');
            
            const result = await signOut();
            
            setIsLoading(false);
            
            if (result.success) {
              console.log('✅ Sign out successful');
              // Redirigir manualmente al login
              setTimeout(() => {
                router.replace('/(auth)/login');
              }, 100);
            } else {
              console.error('❌ Sign out failed:', result.error);
              Alert.alert('Error', result.error || 'Failed to sign out.');
            }
          }
        }
      ]
    );
  };

  // Renderizar paquetes de RevenueCat
  const renderRevenueCatPackage = (packageItem: PurchasesPackage, popular?: boolean) => {
    const packageData = CREDIT_PACKAGES.find(p => p.identifier === packageItem.product.identifier);
    if (!packageData) return null;

    return (
      <TouchableOpacity
        key={packageItem.identifier}
        style={[styles.creditPackage, popular && styles.popularPackage]}
        onPress={() => handleRevenueCatPurchase(packageItem)}
        disabled={isLoading}
      >
        {popular && (
          <View style={styles.popularBadge}>
            <ThemedText style={styles.popularText}>POPULAR</ThemedText>
          </View>
        )}
        
        <LinearGradient
          colors={popular ? ['#FFD700', '#FFA500'] : ['#f8f9fa', '#e9ecef']}
          style={styles.packageGradient}
        >
          <ThemedText style={[styles.creditsNumber, popular && styles.popularCreditsNumber]}>
            {packageData.credits}
          </ThemedText>
          <ThemedText style={[styles.creditsLabel, popular && styles.popularCreditsLabel]}>
            Transformations
          </ThemedText>
          <ThemedText style={[styles.price, popular && styles.popularPrice]}>
            {packageItem.product.priceString}
          </ThemedText>
          <ThemedText style={[styles.pricePerCredit, popular && styles.popularPricePerCredit]}>
            ${(packageItem.product.price / packageData.credits).toFixed(2)} each
          </ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Fallback para paquetes estáticos si RevenueCat no está disponible
  const renderFallbackPackage = (
    type: 'small' | 'medium' | 'large',
    credits: number,
    price: string,
    popular?: boolean
  ) => (
    <TouchableOpacity
      key={type}
      style={[styles.creditPackage, popular && styles.popularPackage]}
      disabled={true}
    >
      {popular && (
        <View style={styles.popularBadge}>
          <ThemedText style={styles.popularText}>POPULAR</ThemedText>
        </View>
      )}
      
      <LinearGradient
        colors={popular ? ['#FFD700', '#FFA500'] : ['#f8f9fa', '#e9ecef']}
        style={styles.packageGradient}
      >
        <ThemedText style={[styles.creditsNumber, popular && styles.popularCreditsNumber]}>
          {credits}
        </ThemedText>
        <ThemedText style={[styles.creditsLabel, popular && styles.popularCreditsLabel]}>
          Transformations
        </ThemedText>
        <ThemedText style={[styles.price, popular && styles.popularPrice]}>
          {price}
        </ThemedText>
        <ThemedText style={[styles.pricePerCredit, popular && styles.popularPricePerCredit]}>
          ${(parseFloat(price.slice(1)) / credits).toFixed(2)} each
        </ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderProfileSection = (title: string, items: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    color?: string;
  }[]) => (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.sectionContent}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.sectionItem}
            onPress={item.onPress}
            disabled={!item.onPress}
          >
            <View style={styles.sectionItemLeft}>
              <Ionicons name={item.icon as any} size={24} color={item.color || '#667eea'} />
              <ThemedText style={styles.sectionItemLabel}>{item.label}</ThemedText>
            </View>
            <View style={styles.sectionItemRight}>
              {item.value && (
                <ThemedText style={styles.sectionItemValue}>{item.value}</ThemedText>
              )}
              {item.onPress && (
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="white" />
          </View>
          <ThemedText style={styles.userEmail}>{user?.email || 'Loading...'}</ThemedText>
          <ThemedText style={styles.memberSince}>
            Member since {user ? new Date(user.createdAt).toLocaleDateString() : '...'}
          </ThemedText>
        </View>
      </LinearGradient>

      <ThemedView style={styles.content}>
        {/* Credits Section */}
        <View style={styles.creditsSection}>
                  <View style={styles.creditsHeader}>
          <ThemedText style={styles.creditsTitle}>Your Masterpieces</ThemedText>
          <View style={styles.creditsBalance}>
            <ThemedText style={styles.creditsCount}>{user?.imageGenerationsRemaining || 0}</ThemedText>
            <ThemedText style={styles.creditsLabel}>generaciones restantes</ThemedText>
          </View>
        </View>
        
        {/* DEBUG: Mostrar el valor actual en profile */}
        <ThemedText style={{ fontSize: 12, color: 'red', textAlign: 'center', marginTop: 10 }}>
          DEBUG PROFILE: user={!!user ? 'exists' : 'null'}, credits={user?.imageGenerationsRemaining || 'undefined'}, updateTrigger={updateTrigger}
        </ThemedText>
        
        {user && user.imageGenerationsRemaining === 0 && user.totalTransformations > 0 && (
          <View style={styles.freeTrialNotice}>
            <Ionicons name="gift" size={24} color="#FF6B6B" />
            <ThemedText style={styles.freeTrialText}>
              Has usado tu generación gratuita! Compra más para seguir creando obras maestras.
            </ThemedText>
          </View>
        )}
        
        {user && user.totalTransformations === 0 && (
          <View style={styles.freeTrialNotice}>
            <Ionicons name="gift" size={24} color="#28a745" />
            <ThemedText style={[styles.freeTrialText, { color: '#28a745' }]}>
              Welcome! You have one free transformation to try PaintMe.
            </ThemedText>
          </View>
        )}
        </View>

        {/* Credit Packages - RevenueCat */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Purchase Credits</ThemedText>
          <View style={styles.packagesGrid}>
            {offerings.length > 0 ? (
              offerings.map((packageItem, index) => 
                renderRevenueCatPackage(packageItem, index === 1) // Hacer el segundo "popular"
              )
            ) : (
              // Fallback si RevenueCat no está disponible
              <>
                {renderFallbackPackage('small', 5, '$4.99')}
                {renderFallbackPackage('medium', 15, '$12.99', true)}
                {renderFallbackPackage('large', 30, '$19.99')}
              </>
            )}
          </View>
          
          {/* Botón para restaurar compras */}
          {offerings.length > 0 && (
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
              disabled={isLoading}
            >
              <Ionicons name="refresh" size={16} color="#667eea" />
              <ThemedText style={styles.restoreText}>Restore Purchases</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Account Info */}
        {user && renderProfileSection('Account', [
          {
            icon: 'mail',
            label: 'Email',
            value: user.email,
          },
          {
            icon: 'stats-chart',
            label: 'Total Transformations',
            value: transformations.length.toString(),
          },
          {
            icon: 'images',
            label: 'Completed Artworks',
            value: transformations.filter(t => t.status === 'completed').length.toString(),
          },
          {
            icon: 'heart',
            label: 'Favorite Artist',
            value: user.favoriteArtist || 'Not selected',
          },
        ])}

        {/* Sign Out Button - Prominente */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#FF6B6B" />
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </TouchableOpacity>

        {/* Settings */}
        {renderProfileSection('Settings', [
          {
            icon: 'notifications',
            label: 'Notifications',
            onPress: () => {
              setShowNotificationSettings(true);
              Analytics.trackEvent('Notification Settings Opened');
            },
          },
          {
            icon: 'language',
            label: 'Language / Idioma',
            onPress: () => {
              setShowLanguageSelector(true);
              Analytics.trackEvent('Language Selector Opened');
            },
          },
          {
            icon: 'help-circle',
            label: 'Help & Support',
            onPress: openEmailSupport,
          },
          {
            icon: 'document-text',
            label: 'Terms & Privacy',
            onPress: openTermsAndPrivacy,
          },
          {
            icon: 'trash',
            label: 'Delete Account',
            onPress: handleDeleteAccount,
            color: '#FF6B6B',
          },
        ])}
      </ThemedView>
      
      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <View style={styles.modalOverlay}>
          <NotificationSettingsScreen onBack={() => setShowNotificationSettings(false)} />
        </View>
      )}
      
      {/* Language Selector Modal */}
      <LanguageSelector 
        visible={showLanguageSelector} 
        onClose={() => setShowLanguageSelector(false)} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  userEmail: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 5,
  },
  memberSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 15,
    paddingBottom: 100, // Espacio extra para que todo sea visible
  },
  creditsSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  creditsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  creditsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  creditsBalance: {
    alignItems: 'flex-end',
  },
  creditsCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  creditsLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  freeTrialNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  freeTrialText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    marginBottom: 25, // Más espacio entre secciones
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2c3e50',
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionItemLabel: {
    marginLeft: 12,
    fontSize: 16,
  },
  sectionItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionItemValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  packagesGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  creditPackage: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  popularPackage: {
    transform: [{ scale: 1.05 }],
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    paddingVertical: 4,
    zIndex: 1,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  packageGradient: {
    padding: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  creditsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
  },
  popularCreditsNumber: {
    color: '#2c3e50',
  },
  popularCreditsLabel: {
    color: '#2c3e50',
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 8,
  },
  popularPrice: {
    color: '#2c3e50',
  },
  pricePerCredit: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  popularPricePerCredit: {
    color: '#2c3e50',
    opacity: 0.8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  signOutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  restoreText: {
    marginLeft: 6,
    color: '#667eea',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    zIndex: 1000,
  },
}); 