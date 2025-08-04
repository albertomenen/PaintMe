import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth, useUser } from '@/hooks/useUser';
import { StripeService } from '@/lib/stripe';

export default function ProfileScreen() {
  const { user, updateCredits, addImageGenerations, transformations } = useUser();

  // Monitor user changes in profile
  React.useEffect(() => {
    console.log('📊 Profile - User data changed:', {
      hasUser: !!user,
      imageGenerationsRemaining: user?.imageGenerationsRemaining,
      credits: user?.credits,
      totalTransformations: user?.totalTransformations
    });
  }, [user?.imageGenerationsRemaining, user?.credits, user?.totalTransformations]);
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchaseCredits = async (creditPackage: 'small' | 'medium' | 'large') => {
    setIsLoading(true);
    
    // In a real app, integrate with Stripe here
    try {
      let credits = 0;
      let price = '';
      
      switch (creditPackage) {
        case 'small':
          credits = 5;
          price = '$4.99';
          break;
        case 'medium':
          credits = 15;
          price = '$12.99';
          break;
        case 'large':
          credits = 30;
          price = '$19.99';
          break;
      }

      Alert.alert(
        'Purchase Credits',
        `Purchase ${credits} transformations for ${price}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Purchase',
            onPress: async () => {
              // Real Stripe purchase
              if (user) {
                console.log('💳 Starting Stripe purchase of', credits, 'generations');
                setIsLoading(true);
                
                try {
                  const result = await StripeService.purchaseCredits(creditPackage);
                  
                  if (result.success) {
                    console.log('💳 Stripe payment successful!');
                    await addImageGenerations(credits);
                    Alert.alert('¡Pago exitoso!', `${credits} generaciones añadidas a tu cuenta!`);
                  } else {
                    console.error('💳 Stripe payment failed:', result.error);
                    Alert.alert('Error de pago', result.error || 'El pago no se pudo procesar');
                  }
                } catch (error) {
                  console.error('💳 Purchase error:', error);
                  Alert.alert('Error', 'Hubo un problema procesando el pago');
                } finally {
                  setIsLoading(false);
                }
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
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
              // The auth state change will automatically redirect to login
              // No need to show alert, just let the navigation happen
            } else {
              console.error('❌ Sign out failed:', result.error);
              Alert.alert('Error', result.error || 'Failed to sign out.');
            }
          }
        }
      ]
    );
  };

  const renderCreditPackage = (
    type: 'small' | 'medium' | 'large',
    credits: number,
    price: string,
    popular?: boolean
  ) => (
    <TouchableOpacity
      key={type}
      style={[styles.creditPackage, popular && styles.popularPackage]}
      onPress={() => handlePurchaseCredits(type)}
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
    <ScrollView style={styles.container}>
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
          <ThemedText style={styles.creditsTitle}>Your Transformations</ThemedText>
          <View style={styles.creditsBalance}>
            <ThemedText style={styles.creditsCount}>{user?.imageGenerationsRemaining || 0}</ThemedText>
            <ThemedText style={styles.creditsLabel}>generaciones restantes</ThemedText>
          </View>
        </View>
        
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

        {/* Credit Packages */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Purchase Credits</ThemedText>
          <View style={styles.packagesGrid}>
            {renderCreditPackage('small', 5, '$4.99')}
            {renderCreditPackage('medium', 15, '$12.99', true)}
            {renderCreditPackage('large', 30, '$19.99')}
          </View>
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

        {/* Settings */}
        {renderProfileSection('Settings', [
          {
            icon: 'notifications',
            label: 'Notifications',
            onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon!'),
          },
          {
            icon: 'help-circle',
            label: 'Help & Support',
            onPress: () => Alert.alert('Help & Support', 'Contact us at support@paintme.app'),
          },
          {
            icon: 'document-text',
            label: 'Terms & Privacy',
            onPress: () => Alert.alert('Legal', 'Terms and Privacy Policy'),
          },
        ])}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#FF6B6B" />
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
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
    padding: 20,
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
    marginBottom: 25,
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
}); 