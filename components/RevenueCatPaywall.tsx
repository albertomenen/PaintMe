import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Analytics } from '../lib/analytics';
import { useUser } from '../hooks/useUser';

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
  const { addImageGenerations, refreshUser } = useUser();

  useEffect(() => {
    presentNativePaywall();
    Analytics.trackPaywallViewed('revenuecat_native');
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
        console.log('✅ Purchase/Restore successful');

        // Get customer info to sync credits
        const customerInfo = await Purchases.getCustomerInfo();
        const transactions = customerInfo.nonSubscriptionTransactions;

        console.log('📦 Transactions:', transactions.length);

        // Map product IDs to credits
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
        }

        // Refresh user data from database to ensure all screens show updated credits
        console.log('🔄 Refreshing user data after purchase...');
        refreshUser();

        if (onPurchaseComplete) {
          onPurchaseComplete();
        }
        onClose();
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
      <ActivityIndicator size="large" color="#667eea" />
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
});
