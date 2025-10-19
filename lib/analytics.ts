import { Mixpanel } from 'mixpanel-react-native';

/**
 * MIXPANEL TRACKING PLAN FOR ARTME
 *
 * PART 1: EVENT TRACKING PLAN
 * ============================
 *
 * ONBOARDING & ACTIVATION PHASE:
 * ------------------------------
 * Event: "App Opened"
 * Trigger: When user launches the app
 * Properties: session_count, days_since_install, is_first_launch
 * Why: Track app usage patterns and identify new vs returning users
 *
 * Event: "Onboarding Started"
 * Trigger: When user sees first onboarding screen
 * Properties: None
 * Why: Track activation funnel starting point
 *
 * Event: "Onboarding Completed"
 * Trigger: When user finishes all onboarding screens
 * Properties: completion_time_seconds, skipped_any_step
 * Why: Measure onboarding completion rate
 *
 * Event: "Style Selected" (Object Action format)
 * Trigger: When user taps on an art style card
 * Properties: style_name, style_category (classic/japanese), is_first_selection
 * Why: Track which art styles are most popular, answer engagement question
 *
 * Event: "Image Selected"
 * Trigger: When user picks image from gallery or takes photo
 * Properties: source (camera/gallery), is_first_image
 * Why: Track image selection behavior
 *
 * Event: "Masterpiece Created" (WOW MOMENT - CRITICAL)
 * Trigger: When transformation completes successfully
 * Properties: style_name, processing_time_seconds, is_first_transformation, credits_remaining
 * Why: Track activation success - this is the "wow" moment
 *
 * ENGAGEMENT PHASE:
 * ----------------
 * Event: "Style Selected" (repeated from above)
 * Properties: style_name, style_category, total_selections_count
 * Why: Track which styles are most popular over time
 *
 * Event: "Gallery Viewed"
 * Trigger: When user opens gallery tab
 * Properties: artwork_count
 * Why: Track engagement with past creations
 *
 * Event: "Masterpiece Saved"
 * Trigger: When image is saved to device gallery
 * Properties: style_name
 * Why: Track user satisfaction and engagement
 *
 * Event: "Masterpiece Shared"
 * Trigger: When user shares artwork
 * Properties: platform, style_name
 * Why: Track viral growth potential
 *
 * MONETIZATION PHASE:
 * ------------------
 * Event: "Paywall Viewed" (CRITICAL FOR MONETIZATION)
 * Trigger: When paywall screen appears
 * Properties: source (post_transformation/onboarding/profile/zero_credits),
 *            credits_remaining, transformations_completed_count
 * Why: Track where users hit monetization points, identify best conversion points
 *
 * Event: "Paywall Dismissed"
 * Trigger: When user closes paywall without purchasing
 * Properties: source, time_viewed_seconds, option_highlighted
 * Why: Understand why users don't convert
 *
 * Event: "Purchase Started"
 * Trigger: When user taps a purchase option
 * Properties: product_id, price, product_type (credits/subscription), credits_amount
 * Why: Track purchase intent
 *
 * Event: "Purchase Completed"
 * Trigger: When purchase is confirmed by RevenueCat
 * Properties: product_id, price, product_type, credits_received, revenue
 * Why: Track conversion and revenue (answers "which option is most popular")
 *
 * Event: "Purchase Failed"
 * Trigger: When purchase fails
 * Properties: product_id, error_message
 * Why: Identify technical issues blocking revenue
 *
 * Event: "Credits Depleted"
 * Trigger: When user runs out of credits
 * Properties: total_transformations_made, days_since_signup
 * Why: Track when users hit paywall naturally
 *
 * PART 2: USER PROPERTIES
 * ========================
 *
 * Property: "signup_date" - ISO timestamp of first app use
 * Property: "total_transformations" - Lifetime count of artworks created
 * Property: "favorite_style" - Most frequently used art style
 * Property: "subscription_status" - free/premium
 * Property: "credits_balance" - Current credit count
 * Property: "lifetime_revenue" - Total $ spent in app
 * Property: "days_since_last_transformation" - Recency metric
 * Property: "paywall_views_count" - How many times user saw paywall
 * Property: "onboarding_completed" - true/false
 * Property: "first_transformation_date" - When they hit "wow" moment
 *
 * PART 3: KEY FUNNELS
 * ====================
 *
 * 1. ACTIVATION FUNNEL (answers: "Are users getting to wow moment?")
 *    Steps: App Opened → Onboarding Started → Onboarding Completed →
 *           Style Selected → Image Selected → Masterpiece Created
 *    Analysis: Drop-off at each step identifies friction points
 *
 * 2. MONETIZATION FUNNEL (answers: "Why are they buying/not buying?")
 *    Steps: Paywall Viewed → Purchase Started → Purchase Completed
 *    Segment by: paywall source, credits_remaining, transformations_count
 *    Analysis: Which paywall trigger converts best? What user state = high purchase intent?
 *
 * 3. REPEAT ENGAGEMENT FUNNEL (answers: "Do users create more than one artwork?")
 *    Steps: Masterpiece Created (1st) → App Opened (Day 1+) → Masterpiece Created (2nd)
 *    Analysis: What % of users return and create again?
 */

class AnalyticsService {
  private isInitialized: boolean = false;
  private mixpanel: Mixpanel | null = null;

  constructor() {
    // Don't initialize in constructor for React Native
  }

  async init(): Promise<void> {
    try {
      // Initialize Mixpanel for React Native
      const mixpanelInstance = new Mixpanel('0727920bbe04bfe154712e1c41d9cc78', false);
      await mixpanelInstance.init();

      // Set server URL for EU
      mixpanelInstance.setServerURL('https://api-eu.mixpanel.com');

      this.mixpanel = mixpanelInstance;
      this.isInitialized = true;

      console.log('✅ Mixpanel initialized for React Native');
    } catch (error) {
      console.error('❌ Failed to initialize Mixpanel:', error);
    }
  }

  // User identification and properties
  async identifyUser(userId: string, email?: string): Promise<void> {
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      this.mixpanel.identify(userId);

      if (email) {
        this.mixpanel.getPeople().set('$email', email);
      }
      this.mixpanel.getPeople().set('signup_date', new Date().toISOString());

      console.log('👤 User identified:', userId);
    } catch (error) {
      console.error('❌ Failed to identify user:', error);
    }
  }

  async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      for (const [key, value] of Object.entries(properties)) {
        this.mixpanel.getPeople().set(key, value);
      }
      console.log('👤 User properties set:', properties);
    } catch (error) {
      console.error('❌ Failed to set user properties:', error);
    }
  }

  async incrementUserProperty(property: string, by: number = 1): Promise<void> {
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      this.mixpanel.getPeople().increment(property, by);
    } catch (error) {
      console.error('❌ Failed to increment user property:', error);
    }
  }

  // App lifecycle events
  async trackAppOpened(sessionCount: number = 1, daysSinceInstall: number = 0, isFirstLaunch: boolean = false): Promise<void> {
    await this.trackEvent('App Opened', {
      session_count: sessionCount,
      days_since_install: daysSinceInstall,
      is_first_launch: isFirstLaunch,
    });
  }

  async trackAppClosed(): Promise<void> {
    await this.trackEvent('App Closed');
  }

  // Authentication events
  async trackUserSignUp(method: 'email' | 'apple' | 'google'): Promise<void> {
    await this.trackEvent('User Sign Up', {
      method,
    });

    // Set user properties
    await this.setUserProperties({
      signup_date: new Date().toISOString(),
      signup_method: method,
      subscription_status: 'free',
      credits_balance: 1, // First free credit
      total_transformations: 0,
    });
  }

  async trackUserSignIn(method: 'email' | 'apple' | 'google'): Promise<void> {
    await this.trackEvent('User Sign In', {
      method,
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

  async trackOnboardingCompleted(completionTimeSeconds: number = 0, skippedAnyStep: boolean = false): Promise<void> {
    await this.trackEvent('Onboarding Completed', {
      completion_time_seconds: completionTimeSeconds,
      skipped_any_step: skippedAnyStep,
    });

    // Update user property
    await this.setUserProperties({
      onboarding_completed: true,
      onboarding_completion_time: completionTimeSeconds,
    });
  }

  async trackOnboardingSkipped(atStep: number): Promise<void> {
    await this.trackEvent('Onboarding Skipped', {
      at_step: atStep,
    });
  }

  // Image selection events
  async trackImageSelected(source: 'camera' | 'gallery', isFirstImage: boolean = false): Promise<void> {
    await this.trackEvent('Image Selected', {
      source,
      is_first_image: isFirstImage,
    });
  }

  // CRITICAL: Style selection tracking (answers "which styles are most popular")
  async trackArtistStyleSelected(
    artistName: string,
    styleCategory: 'classic' | 'japanese',
    isFirstSelection: boolean = false,
    totalSelectionsCount: number = 1
  ): Promise<void> {
    await this.trackEvent('Style Selected', {
      style_name: artistName,
      style_category: styleCategory,
      is_first_selection: isFirstSelection,
      total_selections_count: totalSelectionsCount,
    });

    // Track most popular style
    await this.incrementUserProperty(`style_${artistName}_count`, 1);
  }

  // Image transformation events - THE WOW MOMENT
  async trackImageTransformationStarted(artistStyle: string, creditsRemaining: number): Promise<void> {
    await this.trackEvent('Transformation Started', {
      style_name: artistStyle,
      credits_remaining: creditsRemaining,
    });
  }

  // CRITICAL: Masterpiece Created - This is the activation event
  async trackImageTransformationCompleted(
    artistStyle: string,
    processingTimeSeconds: number,
    isFirstTransformation: boolean = false,
    creditsRemaining: number = 0
  ): Promise<void> {
    await this.trackEvent('Masterpiece Created', {
      style_name: artistStyle,
      processing_time_seconds: processingTimeSeconds,
      is_first_transformation: isFirstTransformation,
      credits_remaining: creditsRemaining,
    });

    // Update user properties
    await this.incrementUserProperty('total_transformations', 1);

    if (isFirstTransformation) {
      await this.setUserProperties({
        first_transformation_date: new Date().toISOString(),
        first_transformation_style: artistStyle,
      });
    }

    // Track favorite style
    await this.setUserProperties({
      last_transformation_date: new Date().toISOString(),
    });
  }

  async trackImageTransformationFailed(
    artistStyle: string,
    error: string
  ): Promise<void> {
    await this.trackEvent('Transformation Failed', {
      style_name: artistStyle,
      error_message: error,
    });
  }

  async trackImageSaved(styleName: string): Promise<void> {
    await this.trackEvent('Masterpiece Saved', {
      style_name: styleName,
    });
  }

  async trackImageShared(platform: string, styleName: string): Promise<void> {
    await this.trackEvent('Masterpiece Shared', {
      platform: platform || 'unknown',
      style_name: styleName,
    });
  }

  // CRITICAL: Paywall tracking (answers monetization questions)
  async trackPaywallViewed(
    source: 'post_transformation' | 'onboarding' | 'profile' | 'zero_credits' | 'unknown',
    creditsRemaining: number = 0,
    transformationsCompletedCount: number = 0
  ): Promise<void> {
    await this.trackEvent('Paywall Viewed', {
      source,
      credits_remaining: creditsRemaining,
      transformations_completed_count: transformationsCompletedCount,
    });

    // Increment paywall views counter
    await this.incrementUserProperty('paywall_views_count', 1);
  }

  async trackPaywallDismissed(
    source: string,
    timeViewedSeconds: number = 0,
    optionHighlighted?: string
  ): Promise<void> {
    await this.trackEvent('Paywall Dismissed', {
      source,
      time_viewed_seconds: timeViewedSeconds,
      option_highlighted: optionHighlighted,
    });
  }

  // Purchase and monetization events
  async trackPurchaseStarted(
    productId: string,
    price: number,
    productType: 'credits' | 'subscription',
    creditsAmount?: number
  ): Promise<void> {
    await this.trackEvent('Purchase Started', {
      product_id: productId,
      price,
      product_type: productType,
      credits_amount: creditsAmount,
    });
  }

  async trackPurchaseCompleted(
    productId: string,
    price: number,
    productType: 'credits' | 'subscription',
    creditsReceived: number = 0
  ): Promise<void> {
    await this.trackEvent('Purchase Completed', {
      product_id: productId,
      price,
      product_type: productType,
      credits_received: creditsReceived,
      revenue: price,
    });

    // Update user properties
    await this.incrementUserProperty('lifetime_revenue', price);
    await this.incrementUserProperty('credits_balance', creditsReceived);

    if (productType === 'subscription') {
      await this.setUserProperties({
        subscription_status: 'premium',
        subscription_start_date: new Date().toISOString(),
      });
    }

    // Track revenue in Mixpanel
    if (this.mixpanel) {
      this.mixpanel.getPeople().trackCharge(price);
    }
  }

  async trackPurchaseFailed(productId: string, error: string): Promise<void> {
    await this.trackEvent('Purchase Failed', {
      product_id: productId,
      error_message: error,
    });
  }

  // Credits tracking
  async trackCreditsUsed(remainingCredits: number): Promise<void> {
    await this.trackEvent('Credits Used', {
      remaining_credits: remainingCredits,
    });

    await this.setUserProperties({
      credits_balance: remainingCredits,
    });
  }

  async trackCreditsAdded(creditsAdded: number, newBalance: number, source: string): Promise<void> {
    await this.trackEvent('Credits Added', {
      credits_added: creditsAdded,
      new_balance: newBalance,
      source,
    });

    await this.setUserProperties({
      credits_balance: newBalance,
    });
  }

  async trackCreditsDepleted(totalTransformationsMade: number, daysSinceSignup: number): Promise<void> {
    await this.trackEvent('Credits Depleted', {
      total_transformations_made: totalTransformationsMade,
      days_since_signup: daysSinceSignup,
    });

    await this.setUserProperties({
      credits_balance: 0,
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

    await this.setUserProperties({
      preferred_language: toLanguage,
    });
  }

  // Gallery and profile events
  async trackGalleryViewed(artworkCount: number = 0): Promise<void> {
    await this.trackEvent('Gallery Viewed', {
      artwork_count: artworkCount,
    });
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
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      const eventProperties = {
        timestamp: new Date().toISOString(),
        platform: 'mobile',
        ...properties,
      };

      this.mixpanel.track(eventName, eventProperties);
      console.log('📊 Event tracked:', eventName, eventProperties);
    } catch (error) {
      console.error('❌ Failed to track event:', eventName, error);
    }
  }

  // Session management
  async startTimedEvent(eventName: string): Promise<void> {
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      this.mixpanel.timeEvent(eventName);
      console.log('⏱️ Timed event started:', eventName);
    } catch (error) {
      console.error('❌ Failed to start timed event:', error);
    }
  }

  // Reset user data (for logout)
  async reset(): Promise<void> {
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      this.mixpanel.reset();
      console.log('🔄 Analytics data reset');
    } catch (error) {
      console.error('❌ Failed to reset Analytics:', error);
    }
  }

  // Opt out of tracking (for privacy compliance)
  async optOut(): Promise<void> {
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      this.mixpanel.optOutTracking();
      console.log('🔒 User opted out of tracking');
    } catch (error) {
      console.error('❌ Failed to opt out:', error);
    }
  }

  async optIn(): Promise<void> {
    if (!this.isInitialized || !this.mixpanel) return;

    try {
      this.mixpanel.optInTracking();
      console.log('✅ User opted in to tracking');
    } catch (error) {
      console.error('❌ Failed to opt in:', error);
    }
  }

  // Helper to get distinct ID
  async getDistinctId(): Promise<string | undefined> {
    if (!this.isInitialized || !this.mixpanel) return undefined;
    return await this.mixpanel.getDistinctId();
  }
}

// Export singleton instance
export const Analytics = new AnalyticsService();
export default Analytics;
