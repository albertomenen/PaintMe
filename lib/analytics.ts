import { Mixpanel } from 'mixpanel-react-native';

// Mixpanel configuration
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || 'ea8d5a82b7acec2b782ede1f1225e6f2';
const trackAutomaticEvents = false;

class AnalyticsService {
  private mixpanel: Mixpanel;
  private isInitialized: boolean = false;

  constructor() {
    this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, trackAutomaticEvents);
  }

  async init(): Promise<void> {
    try {
      await this.mixpanel.init();
      this.isInitialized = true;
      console.log('✅ Mixpanel initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Mixpanel:', error);
    }
  }

  // User identification and properties
  async identifyUser(userId: string, email?: string): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await this.mixpanel.identify(userId);
      
      if (email) {
        await this.mixpanel.getPeople().set({
          '$email': email,
          '$name': email.split('@')[0],
        });
      }
      
      console.log('👤 User identified in Mixpanel:', userId);
    } catch (error) {
      console.error('❌ Failed to identify user:', error);
    }
  }

  async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await this.mixpanel.getPeople().set(properties);
    } catch (error) {
      console.error('❌ Failed to set user properties:', error);
    }
  }

  // App lifecycle events
  async trackAppOpened(): Promise<void> {
    await this.trackEvent('App Opened');
  }

  async trackAppClosed(): Promise<void> {
    await this.trackEvent('App Closed');
  }

  // Authentication events
  async trackUserSignUp(method: 'email' | 'apple' | 'google'): Promise<void> {
    await this.trackEvent('User Sign Up', {
      method,
      timestamp: new Date().toISOString(),
    });
  }

  async trackUserSignIn(method: 'email' | 'apple' | 'google'): Promise<void> {
    await this.trackEvent('User Sign In', {
      method,
      timestamp: new Date().toISOString(),
    });
  }

  async trackUserSignOut(): Promise<void> {
    await this.trackEvent('User Sign Out');
  }

  // Onboarding events
  async trackOnboardingStarted(): Promise<void> {
    await this.trackEvent('Onboarding Started');
  }

  async trackOnboardingStepViewed(stepNumber: number, stepName: string): Promise<void> {
    await this.trackEvent('Onboarding Step Viewed', {
      step_number: stepNumber,
      step_name: stepName,
    });
  }

  async trackOnboardingCompleted(): Promise<void> {
    await this.trackEvent('Onboarding Completed');
  }

  async trackOnboardingSkipped(atStep: number): Promise<void> {
    await this.trackEvent('Onboarding Skipped', {
      at_step: atStep,
    });
  }

  // Image transformation events
  async trackImageSelected(source: 'camera' | 'gallery'): Promise<void> {
    await this.trackEvent('Image Selected', {
      source,
    });
  }

  async trackArtistStyleSelected(artistName: string): Promise<void> {
    await this.trackEvent('Artist Style Selected', {
      artist_name: artistName,
    });
  }

  async trackImageTransformationStarted(artistStyle: string): Promise<void> {
    await this.trackEvent('Image Transformation Started', {
      artist_style: artistStyle,
    });
  }

  async trackImageTransformationCompleted(
    artistStyle: string,
    processingTimeSeconds: number
  ): Promise<void> {
    await this.trackEvent('Image Transformation Completed', {
      artist_style: artistStyle,
      processing_time_seconds: processingTimeSeconds,
    });
  }

  async trackImageTransformationFailed(
    artistStyle: string,
    error: string
  ): Promise<void> {
    await this.trackEvent('Image Transformation Failed', {
      artist_style: artistStyle,
      error_message: error,
    });
  }

  async trackImageSaved(): Promise<void> {
    await this.trackEvent('Image Saved to Gallery');
  }

  async trackImageShared(platform?: string): Promise<void> {
    await this.trackEvent('Image Shared', {
      platform: platform || 'unknown',
    });
  }

  // Purchase and monetization events
  async trackPurchaseStarted(packageId: string, price: number): Promise<void> {
    await this.trackEvent('Purchase Started', {
      package_id: packageId,
      price,
    });
  }

  async trackPurchaseCompleted(
    packageId: string,
    price: number,
    creditsReceived: number
  ): Promise<void> {
    await this.trackEvent('Purchase Completed', {
      package_id: packageId,
      price,
      credits_received: creditsReceived,
    });

    // Track revenue
    await this.mixpanel.getPeople().trackCharge(price);
  }

  async trackPurchaseFailed(packageId: string, error: string): Promise<void> {
    await this.trackEvent('Purchase Failed', {
      package_id: packageId,
      error_message: error,
    });
  }

  async trackCreditsUsed(remainingCredits: number): Promise<void> {
    await this.trackEvent('Credits Used', {
      remaining_credits: remainingCredits,
    });
  }

  // Settings and preferences
  async trackNotificationSettingsChanged(
    setting: string,
    enabled: boolean
  ): Promise<void> {
    await this.trackEvent('Notification Settings Changed', {
      setting_name: setting,
      enabled,
    });
  }

  async trackLanguageChanged(
    fromLanguage: string,
    toLanguage: string
  ): Promise<void> {
    await this.trackEvent('Language Changed', {
      from_language: fromLanguage,
      to_language: toLanguage,
    });
  }

  // Gallery and profile events
  async trackGalleryViewed(): Promise<void> {
    await this.trackEvent('Gallery Viewed');
  }

  async trackProfileViewed(): Promise<void> {
    await this.trackEvent('Profile Viewed');
  }

  async trackHelpContacted(method: 'email' | 'other'): Promise<void> {
    await this.trackEvent('Help Contacted', {
      method,
    });
  }

  // Generic event tracking
  async trackEvent(eventName: string, properties?: Record<string, any>): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const eventProperties = {
        timestamp: new Date().toISOString(),
        platform: 'mobile',
        ...properties,
      };

      await this.mixpanel.track(eventName, eventProperties);
      console.log('📊 Event tracked:', eventName, eventProperties);
    } catch (error) {
      console.error('❌ Failed to track event:', eventName, error);
    }
  }

  // Session management
  async startTimedEvent(eventName: string): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await this.mixpanel.timeEvent(eventName);
    } catch (error) {
      console.error('❌ Failed to start timed event:', error);
    }
  }

  // Reset user data (for logout)
  async reset(): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await this.mixpanel.reset();
      console.log('🔄 Mixpanel data reset');
    } catch (error) {
      console.error('❌ Failed to reset Mixpanel:', error);
    }
  }

  // Opt out of tracking (for privacy compliance)
  async optOut(): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await this.mixpanel.optOutTracking();
      console.log('🔒 User opted out of tracking');
    } catch (error) {
      console.error('❌ Failed to opt out:', error);
    }
  }

  async optIn(): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      await this.mixpanel.optInTracking();
      console.log('✅ User opted in to tracking');
    } catch (error) {
      console.error('❌ Failed to opt in:', error);
    }
  }
}

// Export singleton instance
export const Analytics = new AnalyticsService();
export default Analytics;