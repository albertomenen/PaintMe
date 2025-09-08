import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';
import { router } from 'expo-router';
import { useI18n } from '../hooks/useI18n';
import { Analytics } from '../lib/analytics';

interface NormalPaywallProps {
  onClose: () => void;
  onPurchaseStarted?: () => void;
  onPurchaseCancelled?: () => void;
}

export default function NormalPaywallScreen({ 
  onClose, 
  onPurchaseStarted,
  onPurchaseCancelled 
}: NormalPaywallProps) {
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const { t } = useI18n();

  useEffect(() => {
    fetchNormalOffering();
    
    // Track paywall view
    Analytics.trackEvent('paywall_viewed', {
      paywall_type: 'normal',
      offering_id: 'ofrngc1ed58f858'
    });

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background') {
      // User put app in background - they might have cancelled
      console.log('🔄 User backgrounded app from normal paywall');
      onPurchaseCancelled?.();
    }
  };

  const fetchNormalOffering = async () => {
    try {
      setLoading(true);
      const offerings = await Purchases.getOfferings();
      
      // Look for the specific offering ID
      const normalOffering = offerings.all['ofrngc1ed58f858'];
      
      if (normalOffering && normalOffering.availablePackages.length > 0) {
        setPackages(normalOffering.availablePackages);
        setSelectedPackage(normalOffering.availablePackages[0]); // Select first by default
        console.log('📦 Normal offering loaded:', normalOffering.availablePackages.length, 'packages');
      } else {
        console.error('❌ Normal offering not found:', 'ofrngc1ed58f858');
        Alert.alert(
          t('paywall.error.title'),
          t('paywall.error.loadFailed'),
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('❌ Error fetching normal offering:', error);
      Alert.alert(
        t('paywall.error.title'),
        t('paywall.error.loadFailed'),
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      setLoading(true);
      onPurchaseStarted?.();

      console.log('💳 Starting normal purchase:', selectedPackage.product.identifier);
      
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        console.log('✅ Normal purchase successful!');
        
        Analytics.trackEvent('purchase_completed', {
          product_id: selectedPackage.product.identifier,
          offering_id: 'ofrngc1ed58f858',
          paywall_type: 'normal'
        });

        Alert.alert(
          t('paywall.success.title'),
          t('paywall.success.message'),
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error: any) {
      console.error('❌ Normal purchase failed:', error);
      
      if (error.userCancelled) {
        console.log('🚫 User cancelled normal purchase');
        onPurchaseCancelled?.();
        
        Analytics.trackEvent('purchase_cancelled', {
          product_id: selectedPackage.product.identifier,
          offering_id: 'ofrngc1ed58f858',
          paywall_type: 'normal'
        });
      } else {
        Alert.alert(t('paywall.error.title'), error.message || t('paywall.error.purchaseFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Analytics.trackEvent('paywall_closed', {
      offering_id: 'ofrngc1ed58f858',
      paywall_type: 'normal'
    });
    onPurchaseCancelled?.();
    onClose();
  };

  if (loading && packages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>{t('paywall.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={StyleSheet.absoluteFill} />
      
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{t('paywall.normal.title')}</Text>
        <Text style={styles.subtitle}>{t('paywall.normal.subtitle')}</Text>
        
        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="images" size={24} color="#FFD700" />
            <Text style={styles.featureText}>{t('paywall.features.unlimited')}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="brush" size={24} color="#FFD700" />
            <Text style={styles.featureText}>{t('paywall.features.allStyles')}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="cloud-download" size={24} color="#FFD700" />
            <Text style={styles.featureText}>{t('paywall.features.hdDownload')}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="flash" size={24} color="#FFD700" />
            <Text style={styles.featureText}>{t('paywall.features.priority')}</Text>
          </View>
        </View>

        {/* Packages */}
        {packages.length > 0 && (
          <View style={styles.packagesContainer}>
            {packages.map((pkg, index) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageCard,
                  selectedPackage?.identifier === pkg.identifier && styles.selectedPackage
                ]}
                onPress={() => setSelectedPackage(pkg)}
              >
                <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                <Text style={styles.packageDescription}>{pkg.product.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, loading && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={loading || !selectedPackage}
        >
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.buttonGradient}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Text style={styles.purchaseButtonText}>
                  {t('paywall.purchase')} {selectedPackage?.product.priceString}
                </Text>
                <Ionicons name="card" size={20} color="#000" style={styles.buttonIcon} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.laterButton} onPress={handleClose}>
          <Text style={styles.laterButtonText}>{t('paywall.maybe_later')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFF',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 16,
    flex: 1,
  },
  packagesContainer: {
    marginBottom: 32,
  },
  packageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPackage: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  purchaseButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
});