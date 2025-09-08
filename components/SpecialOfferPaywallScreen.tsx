import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';
import { useI18n } from '../hooks/useI18n';
import { Analytics } from '../lib/analytics';

interface SpecialOfferPaywallProps {
  onClose: () => void;
  fromNotification?: boolean;
}

export default function SpecialOfferPaywallScreen({ 
  onClose,
  fromNotification = false
}: SpecialOfferPaywallProps) {
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour countdown
  const { t } = useI18n();

  useEffect(() => {
    fetchSpecialOffering();
    
    // Track paywall view
    Analytics.trackEvent('paywall_viewed', {
      paywall_type: 'special_offer',
      offering_id: 'ofrng15feade036',
      from_notification: fromNotification
    });

    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchSpecialOffering = async () => {
    try {
      setLoading(true);
      const offerings = await Purchases.getOfferings();
      
      // Look for the special offering ID
      const specialOffering = offerings.all['ofrng15feade036'];
      
      if (specialOffering && specialOffering.availablePackages.length > 0) {
        setPackages(specialOffering.availablePackages);
        setSelectedPackage(specialOffering.availablePackages[0]); // Select first by default
        console.log('🎁 Special offering loaded:', specialOffering.availablePackages.length, 'packages');
      } else {
        console.error('❌ Special offering not found:', 'ofrng15feade036');
        Alert.alert(
          t('paywall.error.title'),
          t('paywall.error.offerNotAvailable'),
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('❌ Error fetching special offering:', error);
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

      console.log('🎁 Starting special offer purchase:', selectedPackage.product.identifier);
      
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      
      if (customerInfo.entitlements.active['premium'] !== undefined) {
        console.log('✅ Special offer purchase successful!');
        
        Analytics.trackEvent('purchase_completed', {
          product_id: selectedPackage.product.identifier,
          offering_id: 'ofrng15feade036',
          paywall_type: 'special_offer',
          from_notification: fromNotification
        });

        Alert.alert(
          t('paywall.specialOffer.successTitle'),
          t('paywall.specialOffer.successMessage'),
          [{ text: 'Awesome!', onPress: onClose }]
        );
      }
    } catch (error: any) {
      console.error('❌ Special offer purchase failed:', error);
      
      if (error.userCancelled) {
        console.log('🚫 User cancelled special offer purchase');
        
        Analytics.trackEvent('purchase_cancelled', {
          product_id: selectedPackage.product.identifier,
          offering_id: 'ofrng15feade036',
          paywall_type: 'special_offer',
          from_notification: fromNotification
        });
      } else {
        Alert.alert(t('paywall.error.title'), error.message || t('paywall.error.purchaseFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    Analytics.trackEvent('paywall_closed', {
      offering_id: 'ofrng15feade036',
      paywall_type: 'special_offer',
      from_notification: fromNotification
    });
    onClose();
  };

  if (loading && packages.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a1a', '#2d1b69']} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>{t('paywall.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#2d1b69']} style={StyleSheet.absoluteFill} />
      
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={28} color="#FFF" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Notification Badge */}
        {fromNotification && (
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{t('paywall.specialOffer.fromNotification')}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.offerBadge}>{t('paywall.specialOffer.limitedTime')}</Text>
        <Text style={styles.title}>{t('paywall.specialOffer.title')}</Text>
        <Text style={styles.discount}>80% OFF</Text>
        
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>{t('paywall.specialOffer.expiresIn')}</Text>
          <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="star" size={20} color="#FF6B6B" />
            <Text style={styles.featureText}>{t('paywall.features.unlimited')}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="brush" size={20} color="#FF6B6B" />
            <Text style={styles.featureText}>{t('paywall.features.exclusiveStyles')}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="cloud-download" size={20} color="#FF6B6B" />
            <Text style={styles.featureText}>{t('paywall.features.ultraHD')}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="flash" size={20} color="#FF6B6B" />
            <Text style={styles.featureText}>{t('paywall.features.vipSupport')}</Text>
          </View>
        </View>

        {/* Package */}
        {selectedPackage && (
          <View style={styles.packageContainer}>
            <Text style={styles.originalPrice}>{t('paywall.specialOffer.originalPrice')}</Text>
            <Text style={styles.offerPrice}>{selectedPackage.product.priceString}</Text>
            <Text style={styles.savings}>{t('paywall.specialOffer.youSave')}</Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, loading && styles.disabledButton]}
          onPress={handlePurchase}
          disabled={loading || !selectedPackage || timeLeft === 0}
        >
          <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.buttonGradient}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.purchaseButtonText}>
                  🎁 {t('paywall.specialOffer.claimDeal')} {selectedPackage?.product.priceString}
                </Text>
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
    backgroundColor: '#1a1a1a',
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
  notificationBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerBadge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  discount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 24,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  timerLabel: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 8,
  },
  timer: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  featuresContainer: {
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#FFF',
    marginLeft: 12,
    flex: 1,
  },
  packageContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  offerPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  savings: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  purchaseButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FF6B6B',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
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