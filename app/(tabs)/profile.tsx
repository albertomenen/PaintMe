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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useAuth, useUser } from '../../hooks/useUser';
import { CREDIT_PACKAGES, SUBSCRIPTION_PACKAGES, RevenueCatService } from '../../lib/revenuecat';
import { supabase } from '../../lib/supabase';
import NotificationSettingsScreen from '../../components/NotificationSettings';
import LanguageSelector from '../../components/LanguageSelector';
import { Analytics } from '../../lib/analytics';
import { useI18n } from '../../hooks/useI18n';
import RevenueCatPaywall from '../../components/RevenueCatPaywall';

export default function ProfileScreen() {
  const { user, addImageGenerations, transformations, updateTrigger } = useUser();
  const { t } = useI18n();
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSubscriptionPaywall, setShowSubscriptionPaywall] = useState(false);

  const offeringId = 'default'; // RevenueCat offering identifier for credits
  const subscriptionOfferingId = 'Artme Subscription'; // RevenueCat paywall identifier for subscription

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

      // Verificar estado de suscripción
      const subInfo = await RevenueCatService.getSubscriptionInfo();
      setSubscriptionInfo(subInfo);

      // Sincronizar estado premium con Supabase si cambió
      if (user && subInfo.isActive !== user.isPremium) {
        console.log('🔄 Syncing premium status to Supabase:', subInfo.isActive);
        await supabase
          .from('users')
          .update({
            is_premium: subInfo.isActive,
            subscription_type: subInfo.productId,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }

    } catch (error) {
      console.error('❌ Error cargando datos de RevenueCat:', error);
      Alert.alert('Error', 'Could not load products. Please try again later.');
    }
  };

  if (user) {
    loadRevenueCatData();
  }
}, [user?.id, user]);

  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    isActive: boolean;
    productId: string | null;
    expirationDate: string | null;
    willRenew: boolean;
  }>({ isActive: false, productId: null, expirationDate: null, willRenew: false });

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
        
        // FORCE SYNC: Store credits in AsyncStorage for index to read
        const newTotal = (user?.imageGenerationsRemaining || 0) + credits;
        await AsyncStorage.setItem('user_credits', newTotal.toString());
        console.log('💾 Stored credits in AsyncStorage:', newTotal);
        
        // Actualizar customer info local
        setCustomerInfo(result.customerInfo);

        Alert.alert(
          `🎉 ${t('profile.purchase.successTitle')}`,
          t('profile.purchase.successMessage', { credits })
        );
      } else {
        if (result.error !== 'Purchase cancelled by user') {
          Alert.alert(t('profile.purchase.errorTitle'), result.error || t('profile.purchase.errorMessage'));
        }
      }
    } catch (error) {
      console.error('❌ Error en compra:', error);
      Alert.alert(t('common.error'), t('profile.purchase.unexpectedError'));
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
          `✅ ${t('profile.restore.successTitle')}`,
          t('profile.restore.successMessage')
        );

        // Recargar customer info
        const info = await RevenueCatService.getCustomerInfo();
        setCustomerInfo(info);
      } else {
        Alert.alert(
          t('profile.restore.noPurchasesTitle'),
          t('profile.restore.noPurchasesMessage')
        );
      }
    } catch (error) {
      console.error('❌ Error restaurando compras:', error);
      Alert.alert(t('common.error'), t('profile.restore.errorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  // Función para eliminar cuenta
  const handleDeleteAccount = async () => {
    Alert.alert(
      `⚠️ ${t('profile.deleteAccount.confirmTitle')}`,
      t('profile.deleteAccount.confirmMessage'),
      [
        { text: t('profile.deleteAccount.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount.button'),
          style: 'destructive',
          onPress: () => {
            // Segunda confirmación
            Alert.alert(
              `🚨 ${t('profile.deleteAccount.finalConfirmTitle')}`,
              t('profile.deleteAccount.finalConfirmMessage'),
              [
                { text: t('profile.deleteAccount.cancel'), style: 'cancel' },
                {
                  text: t('profile.deleteAccount.confirm'),
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
                          t('common.error'),
                          t('profile.deleteAccount.errorMessage')
                        );
                      } else {
                        console.log('✅ Account deleted successfully');

                        // Logout de RevenueCat
                        await RevenueCatService.logout();

                        // Sign out de Supabase
                        await signOut();

                        Alert.alert(
                          `✅ ${t('profile.deleteAccount.successTitle')}`,
                          t('profile.deleteAccount.successMessage'),
                          [
                            {
                              text: t('common.ok'),
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
                        t('common.error'),
                        t('profile.deleteAccount.unexpectedError')
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
    const subject = t('profile.support.emailSubject');
    const body = t('profile.support.emailBody');
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('profile.support.noEmailApp'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.support.emailError'));
    }
  };

  const openTermsAndPrivacy = async () => {
    const url = 'https://menendez.dev/terms';

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('profile.terms.noBrowser'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.terms.linkError'));
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t('profile.signOut.confirmTitle'),
      t('profile.signOut.confirmMessage'),
      [
        { text: t('profile.signOut.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut.confirm'),
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
              Alert.alert(t('common.error'), result.error || t('profile.signOut.errorMessage'));
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
            <ThemedText style={styles.popularText}>{t('profile.purchase.popular')}</ThemedText>
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
            {t('profile.purchase.transformations')}
          </ThemedText>
          <ThemedText style={[styles.price, popular && styles.popularPrice]}>
            {packageItem.product.priceString}
          </ThemedText>
          <ThemedText style={[styles.pricePerCredit, popular && styles.popularPricePerCredit]}>
            ${(packageItem.product.price / packageData.credits).toFixed(2)} {t('profile.purchase.each')}
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
          <ThemedText style={styles.popularText}>{t('profile.purchase.popular')}</ThemedText>
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
          {t('profile.purchase.transformations')}
        </ThemedText>
        <ThemedText style={[styles.price, popular && styles.popularPrice]}>
          {price}
        </ThemedText>
        <ThemedText style={[styles.pricePerCredit, popular && styles.popularPricePerCredit]}>
          ${(parseFloat(price.slice(1)) / credits).toFixed(2)} {t('profile.purchase.each')}
        </ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Renderizar suscripción activa
  const renderActiveSubscription = () => {
    if (!subscriptionInfo.isActive || !subscriptionInfo.productId) return null;

    const subPackage = SUBSCRIPTION_PACKAGES.find(
      p => p.identifier === subscriptionInfo.productId || p.productId === subscriptionInfo.productId
    );

    const periodText = subPackage?.period === 'weekly' ? t('profile.subscription.weekly') :
                       subPackage?.period === 'monthly' ? t('profile.subscription.monthly') :
                       t('profile.subscription.yearly');

    return (
      <View style={styles.activeSubscriptionCard}>
        <View style={styles.activeBadge}>
          <ThemedText style={styles.activeBadgeText}>{t('profile.subscription.activeBadge')}</ThemedText>
        </View>
        <View style={styles.activeSubContent}>
          <Ionicons name="star" size={40} color="#FFD700" />
          <ThemedText style={styles.activeSubTitle}>{t('profile.subscription.activeTitle')}</ThemedText>
          <ThemedText style={styles.activeSubDescription}>
            {t('profile.subscription.activeDescription')}
          </ThemedText>
          <ThemedText style={styles.activeSubPeriod}>{periodText}</ThemedText>
          {subscriptionInfo.expirationDate && (
            <ThemedText style={styles.activeSubExpiry}>
              {subscriptionInfo.willRenew ? t('profile.subscription.renewsOn') : t('profile.subscription.expiresOn')}:{' '}
              {new Date(subscriptionInfo.expirationDate).toLocaleDateString()}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  // Renderizar paquete de suscripción
  const renderSubscriptionPackage = (packageItem: PurchasesPackage, recommended?: boolean) => {
    const subPackage = SUBSCRIPTION_PACKAGES.find(
      p => packageItem.product.identifier.includes(p.identifier) ||
           packageItem.product.identifier === p.productId
    );

    if (!subPackage) return null;

    const periodSuffix = subPackage.period === 'weekly' ? t('profile.subscription.perWeek') :
                         subPackage.period === 'monthly' ? t('profile.subscription.perMonth') :
                         t('profile.subscription.perYear');

    return (
      <TouchableOpacity
        key={packageItem.identifier}
        style={[styles.subscriptionPackage, recommended && styles.recommendedPackage]}
        onPress={() => handleRevenueCatPurchase(packageItem)}
        disabled={isLoading}
      >
        {recommended && (
          <View style={styles.recommendedBadge}>
            <ThemedText style={styles.recommendedText}>{t('profile.subscription.bestValue')}</ThemedText>
          </View>
        )}

        <ThemedText style={styles.subPackagePeriod}>{subPackage.displayName}</ThemedText>
        <ThemedText style={styles.subPackagePrice}>
          {packageItem.product.priceString}{periodSuffix}
        </ThemedText>

        <View style={styles.subFeatures}>
          <View style={styles.subFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <ThemedText style={styles.subFeatureText}>{t('profile.subscription.unlimitedTransformations')}</ThemedText>
          </View>
          <View style={styles.subFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <ThemedText style={styles.subFeatureText}>{t('profile.subscription.allStyles')}</ThemedText>
          </View>
          <View style={styles.subFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <ThemedText style={styles.subFeatureText}>{t('profile.subscription.priorityProcessing')}</ThemedText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          <ThemedText style={styles.userEmail}>{user?.email || t('common.loading')}</ThemedText>
          <ThemedText style={styles.memberSince}>
            {t('profile.header.memberSince')} {user ? new Date(user.createdAt).toLocaleDateString() : '...'}
          </ThemedText>
        </View>
      </LinearGradient>

      <ThemedView style={styles.content}>
        {/* Active Subscription Section */}
        {user?.isPremium && renderActiveSubscription()}

        {/* Subscription Packages - Only show if not premium */}
        {!user?.isPremium && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{t('profile.subscription.title')}</ThemedText>
            {offerings.length > 0 && (
              <>
                {offerings.map((packageItem) => {
                  // Filtrar solo los paquetes de suscripción (que contienen "subscription" o los identificadores que definimos)
                  const isSubscription = SUBSCRIPTION_PACKAGES.some(
                    sub => packageItem.product.identifier.includes(sub.identifier) ||
                           packageItem.product.identifier === sub.productId
                  );

                  if (!isSubscription) return null;

                  // El mensual es el recomendado
                  const isMonthly = packageItem.product.identifier.includes('monthly');
                  return renderSubscriptionPackage(packageItem, isMonthly);
                })}
              </>
            )}
            <ThemedText style={[styles.sectionItemLabel, { textAlign: 'center', marginTop: 15, opacity: 0.7 }]}>
              {t('profile.subscription.orBuyCredits')}
            </ThemedText>
          </View>
        )}

        {/* Credits Section - Only show if not premium */}
        {!user?.isPremium && (
          <View style={styles.creditsSection}>
          <View style={styles.creditsHeader}>
            <ThemedText style={styles.creditsTitle}>{t('profile.credits.title')}</ThemedText>
            <View style={styles.creditsBalance}>
              <ThemedText style={styles.creditsCount}>{user?.imageGenerationsRemaining || 0}</ThemedText>
              <ThemedText style={styles.creditsLabel}>{t('profile.credits.remaining')}</ThemedText>
            </View>
          </View>

          {user && user.imageGenerationsRemaining === 0 && user.totalTransformations > 0 && (
            <View style={styles.freeTrialNotice}>
              <Ionicons name="gift" size={24} color="#FF6B6B" />
              <ThemedText style={styles.freeTrialText}>
                {t('profile.credits.freeTrialUsed')}
              </ThemedText>
            </View>
          )}

          {user && user.totalTransformations === 0 && (
            <View style={styles.freeTrialNotice}>
              <Ionicons name="gift" size={24} color="#28a745" />
              <ThemedText style={[styles.freeTrialText, { color: '#28a745' }]}>
                {t('profile.credits.welcomeFreeTrial')}
              </ThemedText>
            </View>
          )}
          </View>
        )}

        {/* Credit Packages - RevenueCat - Only show if not premium */}
        {!user?.isPremium && (
          <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('profile.purchase.sectionTitle')}</ThemedText>
          <View style={styles.packagesGrid}>
            {offerings.length > 0 ? (
              offerings.map((packageItem, index) => {
                // Encontrar el paquete de 30 créditos
                const packageData = CREDIT_PACKAGES.find(p => p.identifier === packageItem.product.identifier);
                const isPopular = packageData?.credits === 30; // El paquete de 30 es el más popular
                return renderRevenueCatPackage(packageItem, isPopular);
              })
            ) : (
              // Fallback si RevenueCat no está disponible
              <>
                {renderFallbackPackage('small', 5, '$4.99')}
                {renderFallbackPackage('medium', 15, '$12.99')}
                {renderFallbackPackage('large', 30, '$19.99', true)}
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
              <ThemedText style={styles.restoreText}>{t('profile.purchase.restorePurchases')}</ThemedText>
            </TouchableOpacity>
          )}
          </View>
        )}

        {/* Account Info */}
        {user && renderProfileSection(t('profile.account.sectionTitle'), [
          {
            icon: 'mail',
            label: t('profile.account.email'),
            value: user.email,
          },
          {
            icon: 'stats-chart',
            label: t('profile.account.totalTransformations'),
            value: transformations.length.toString(),
          },
          {
            icon: 'images',
            label: t('profile.account.completedArtworks'),
            value: transformations.filter(t => t.status === 'completed').length.toString(),
          },
          {
            icon: 'heart',
            label: t('profile.account.favoriteArtist'),
            value: user.favoriteArtist || t('profile.account.notSelected'),
          },
        ])}

        {/* Credits Balance Card - Destacado */}
        {user && !user.isPremium && (
          <View style={styles.creditsBalanceCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.creditsBalanceGradient}>
              <View style={styles.creditsBalanceContent}>
                <View style={styles.creditsBalanceIcon}>
                  <Ionicons name="images" size={32} color="#FFF" />
                </View>
                <View style={styles.creditsBalanceInfo}>
                  <ThemedText style={styles.creditsBalanceLabel}>
                    {t('profile.credits.remaining')}
                  </ThemedText>
                  <ThemedText style={styles.creditsBalanceNumber}>
                    {user.imageGenerationsRemaining || 0}
                  </ThemedText>
                  <ThemedText style={styles.creditsBalanceSubtext}>
                    {t('profile.purchase.transformations')}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Premium Status Card */}
        {user?.isPremium && (
          <View style={styles.premiumStatusCard}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.premiumStatusGradient}>
              <Ionicons name="star" size={40} color="#FFF" />
              <ThemedText style={styles.premiumStatusText}>
                ⭐ Premium Active - Unlimited Transformations
              </ThemedText>
            </LinearGradient>
          </View>
        )}

        {/* Purchase Credits Button - Destacado */}
        <TouchableOpacity
          style={styles.purchaseCreditsButton}
          onPress={() => {
            setShowPaywall(true);
            Analytics.trackEvent('Paywall Opened From Profile');
          }}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.purchaseCreditsGradient}>
            <Ionicons name="cart" size={24} color="#FFF" />
            <ThemedText style={styles.purchaseCreditsText}>Buy Credits</ThemedText>
          </LinearGradient>
        </TouchableOpacity>

        {/* Subscribe to Pro Button - Premium */}
        {!user?.isPremium && (
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => {
              setShowSubscriptionPaywall(true);
              Analytics.trackEvent('Subscription Paywall Opened From Profile');
            }}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.subscribeGradient}>
              <Ionicons name="star" size={24} color="#FFF" />
              <ThemedText style={styles.subscribeText}>Subscribe to Pro</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Sign Out Button - Prominente */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#FF6B6B" />
          <ThemedText style={styles.signOutText}>{t('profile.signOut.button')}</ThemedText>
        </TouchableOpacity>

        {/* Settings */}
        {renderProfileSection(t('profile.settings.sectionTitle'), [
          {
            icon: 'notifications',
            label: t('profile.settings.notifications'),
            onPress: () => {
              setShowNotificationSettings(true);
              Analytics.trackEvent('Notification Settings Opened');
            },
          },
          {
            icon: 'language',
            label: t('profile.settings.language'),
            onPress: () => {
              setShowLanguageSelector(true);
              Analytics.trackEvent('Language Selector Opened');
            },
          },
          {
            icon: 'help-circle',
            label: t('profile.settings.helpSupport'),
            onPress: openEmailSupport,
          },
          {
            icon: 'document-text',
            label: t('profile.settings.termsPrivacy'),
            onPress: openTermsAndPrivacy,
          },
          {
            icon: 'trash',
            label: t('profile.deleteAccount.button'),
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

      {/* RevenueCat Paywall Modal - Credits */}
      <Modal
        visible={showPaywall}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPaywall(false)}>
        <RevenueCatPaywall
          offeringId={offeringId}
          onClose={() => setShowPaywall(false)}
          onPurchaseComplete={() => {
            setShowPaywall(false);
            forceUpdate();
          }}
        />
      </Modal>

      {/* RevenueCat Subscription Paywall Modal */}
      <Modal
        visible={showSubscriptionPaywall}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowSubscriptionPaywall(false)}>
        <RevenueCatPaywall
          offeringId={subscriptionOfferingId}
          onClose={() => setShowSubscriptionPaywall(false)}
          onPurchaseComplete={() => {
            setShowSubscriptionPaywall(false);
            forceUpdate();
          }}
        />
      </Modal>
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
  // Subscription styles
  activeSubscriptionCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  activeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 13,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeSubContent: {
    alignItems: 'center',
    marginTop: 10,
  },
  activeSubTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
  },
  activeSubDescription: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  activeSubPeriod: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    marginTop: 10,
  },
  activeSubExpiry: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  subscriptionPackage: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  recommendedPackage: {
    borderColor: '#667eea',
    borderWidth: 3,
    transform: [{ scale: 1.02 }],
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 13,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subPackagePeriod: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subPackagePrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 20,
  },
  subFeatures: {
    gap: 12,
  },
  subFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subFeatureText: {
    fontSize: 16,
    color: '#555',
  },
  purchaseCreditsButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  purchaseCreditsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  purchaseCreditsText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subscribeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    gap: 12,
  },
  subscribeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  creditsBalanceCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  creditsBalanceGradient: {
    padding: 24,
  },
  creditsBalanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  creditsBalanceIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsBalanceInfo: {
    flex: 1,
  },
  creditsBalanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  creditsBalanceNumber: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFF',
    lineHeight: 48,
  },
  creditsBalanceSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  premiumStatusCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  premiumStatusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  premiumStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
}); 