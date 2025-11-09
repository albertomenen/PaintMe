import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Analytics } from '../lib/analytics';
import { useUser } from '../hooks/useUser';
import { supabase } from '../lib/supabase';

interface RevenueCatPaywallProps {
  offeringId?: string;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export default function RevenueCatPaywall({
  offeringId = 'default',
  onClose,
  onPurchaseComplete
}: RevenueCatPaywallProps) {
  const { addImageGenerations, updatePremiumStatus, refreshUser } = useUser();
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('⏱️ Paywall loading timeout - closing');
      setIsLoading(false);
      setHasError(true);
      // Auto-close after timeout if paywall doesn't load
      setTimeout(() => onClose(), 2000);
    }, 30000); // 30 second timeout - more generous for purchase processing

    presentNativePaywall().finally(() => {
      clearTimeout(timeout);
      setIsLoading(false);
    });

    Analytics.trackPaywallViewed('revenuecat_native');

    return () => clearTimeout(timeout);
  }, []);

  const presentNativePaywall = async () => {
    try {
      console.log('🛍️ Presenting native RevenueCat paywall with ID:', offeringId);

      // Get offerings first
      const offerings = await Purchases.getOfferings();

      // Log all available offerings for debugging
      console.log('📦 Available offerings:', Object.keys(offerings.all));

      // Try to find offering by identifier (case-insensitive and flexible matching)
      let targetOffering = offerings.all[offeringId];

      // If not found, try case-insensitive search
      if (!targetOffering && offeringId) {
        const lowerCaseId = offeringId.toLowerCase();
        const matchingKey = Object.keys(offerings.all).find(
          key => key.toLowerCase() === lowerCaseId
        );
        if (matchingKey) {
          targetOffering = offerings.all[matchingKey];
        }
      }

      // If still not found, use current offering as fallback
      if (!targetOffering) {
        console.warn('⚠️ Offering not found, using current offering');
        targetOffering = offerings.current;
      }

      if (!targetOffering) {
        console.error('❌ No offering available');
        onClose();
        return;
      }

      console.log('✅ Using offering:', targetOffering.identifier);

      // Present the native paywall with the offering object
      const result = await RevenueCatUI.presentPaywall({
        offering: targetOffering,
      });

      console.log('📊 Paywall result:', result);

      // Handle the result
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        console.log('✅ Purchase/Restore successful - waiting for processing...');

        // Wait a bit for the purchase to be processed by RevenueCat
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get customer info to check for subscriptions AND credits
        const customerInfo = await Purchases.getCustomerInfo();

        // DEBUG: Log ALL active entitlements
        console.log('🔍 ALL Active Entitlements:', Object.keys(customerInfo.entitlements.active));
        console.log('🔍 ALL Entitlements (active/inactive):', Object.keys(customerInfo.entitlements.all));

        // Check for SUBSCRIPTION (Premium) - support multiple entitlement names
        const premiumEntitlementKey = Object.keys(customerInfo.entitlements.active).find(
          key => ['premium', 'Weekly subscription', 'Monthly Access'].includes(key)
        );
        const hasPremiumEntitlement = premiumEntitlementKey !== undefined;
        console.log('👑 Premium entitlement check:', hasPremiumEntitlement, 'Key:', premiumEntitlementKey);

        if (hasPremiumEntitlement && premiumEntitlementKey) {
          // User purchased a subscription - update premium status
          const premiumEntitlement = customerInfo.entitlements.active[premiumEntitlementKey];
          const subscriptionType = premiumEntitlement.productIdentifier;

          console.log('🎯 Updating premium status after purchase:', subscriptionType);

          if (updatePremiumStatus) {
            await updatePremiumStatus(true, subscriptionType);
            console.log('✅ Premium status updated in database');
          }

          Analytics.trackEvent('subscription_purchased', {
            product_id: subscriptionType,
            source: 'revenuecat_paywall'
          });
        } else {
          // Check for CREDIT purchases (non-subscription)
          const transactions = customerInfo.nonSubscriptionTransactions;
          console.log('📦 Credit transactions:', transactions.length);

          if (transactions.length > 0) {
            const latestTransaction = transactions[0];
            const productId = latestTransaction.productIdentifier;

            const creditsMap: { [key: string]: number } = {
              'artme_5_credits': 5,
              'artme_15_credits': 15,
              'artme_30_credits': 30,
            };

            const credits = creditsMap[productId] || 5;

            if (addImageGenerations) {
              await addImageGenerations(credits);
              console.log(`✅ Added ${credits} credits`);
            }

            Analytics.trackEvent('credits_purchased', {
              product_id: productId,
              credits: credits,
              source: 'revenuecat_paywall'
            });
          }
        }

        // Refresh user data from database to ensure all screens show updated info
        console.log('🔄 Refreshing user data after purchase...');

        // Call refreshUser to update the hook state
        // This will fetch the auth user and reload the profile
        await refreshUser();

        // Force a re-render by updating the update trigger
        if ((global as any).forceUserUpdate) {
          (global as any).forceUserUpdate();
        }

        if (onPurchaseComplete) {
          onPurchaseComplete();
        }

        // Longer delay to ensure database updates and UI propagates
        console.log('✅ Purchase complete - closing paywall');
        setTimeout(() => {
          onClose();
        }, 1000);
      } else if (result === PAYWALL_RESULT.CANCELLED) {
        console.log('ℹ️ User cancelled paywall');
        Analytics.trackPaywallDismissed('user_cancelled');
        onClose();
      } else if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        console.log('⚠️ Paywall not presented');
        onClose();
      } else if (result === PAYWALL_RESULT.ERROR) {
        console.error('❌ Paywall error');
        onClose();
      }
    } catch (error: any) {
      console.error('❌ Error presenting paywall:', error);
      onClose();
    }
  };

  // Show loading while paywall is being presented
  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator size="large" color="#667eea" />}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load payment options</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}>
            <Text style={styles.closeButtonText}>Continue to App</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
