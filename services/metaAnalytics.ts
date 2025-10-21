import { AppEventsLogger } from 'react-native-fbsdk-next';

/**
 * Meta (Facebook) Analytics Service
 *
 * This service tracks events for Meta Ads campaigns.
 * Events are automatically sent to Facebook Events Manager for optimization.
 */

export class MetaAnalytics {
  /**
   * Initialize Meta SDK
   * Call this once at app startup
   */
  static async initialize() {
    try {
      console.log('📊 Meta Analytics: Initializing...');
      // SDK auto-initializes with settings from Info.plist
      console.log('✅ Meta Analytics: Initialized successfully');
    } catch (error) {
      console.error('❌ Meta Analytics: Initialization failed:', error);
    }
  }

  /**
   * Track app install/first open
   * Standard Facebook event: fb_mobile_activate_app
   */
  static trackAppInstall() {
    try {
      AppEventsLogger.logEvent('fb_mobile_activate_app');
      console.log('📊 Meta Event: App Install/Activate');
    } catch (error) {
      console.error('❌ Meta Event Error (App Install):', error);
    }
  }

  /**
   * Track user registration/sign up
   * Standard Facebook event: fb_mobile_complete_registration
   */
  static trackSignUp(params?: {
    method?: 'email' | 'apple' | 'google';
    userId?: string;
  }) {
    try {
      const eventParams = {
        fb_registration_method: params?.method || 'email',
      };

      AppEventsLogger.logEvent('fb_mobile_complete_registration', eventParams);
      console.log('📊 Meta Event: Complete Registration', eventParams);

      // Also set user ID for advanced matching
      if (params?.userId) {
        AppEventsLogger.setUserID(params.userId);
      }
    } catch (error) {
      console.error('❌ Meta Event Error (Sign Up):', error);
    }
  }

  /**
   * Track user login
   * Custom event: Login
   */
  static trackLogin(params?: {
    method?: 'email' | 'apple' | 'google';
    userId?: string;
  }) {
    try {
      const eventParams = {
        login_method: params?.method || 'email',
      };

      AppEventsLogger.logEvent('Login', eventParams);
      console.log('📊 Meta Event: Login', eventParams);

      if (params?.userId) {
        AppEventsLogger.setUserID(params.userId);
      }
    } catch (error) {
      console.error('❌ Meta Event Error (Login):', error);
    }
  }

  /**
   * Track content/image view
   * Standard Facebook event: fb_mobile_content_view
   */
  static trackContentView(params: {
    contentType: string;
    contentId?: string;
    contentName?: string;
  }) {
    try {
      const eventParams = {
        fb_content_type: params.contentType,
        fb_content_id: params.contentId || '',
        fb_content: params.contentName || '',
      };

      AppEventsLogger.logEvent('fb_mobile_content_view', eventParams);
      console.log('📊 Meta Event: Content View', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Content View):', error);
    }
  }

  /**
   * Track image selection
   * Custom event: Image Selected
   */
  static trackImageSelected(params?: {
    source?: 'gallery' | 'camera';
    isFirstImage?: boolean;
  }) {
    try {
      const eventParams = {
        source: params?.source || 'gallery',
        is_first_image: params?.isFirstImage || false,
      };

      AppEventsLogger.logEvent('ImageSelected', eventParams);
      console.log('📊 Meta Event: Image Selected', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Image Selected):', error);
    }
  }

  /**
   * Track style selection
   * Custom event: Style Selected
   */
  static trackStyleSelected(params: {
    styleName: string;
    styleCategory?: string;
  }) {
    try {
      const eventParams = {
        style_name: params.styleName,
        style_category: params.styleCategory || 'unknown',
      };

      AppEventsLogger.logEvent('StyleSelected', eventParams);
      console.log('📊 Meta Event: Style Selected', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Style Selected):', error);
    }
  }

  /**
   * Track transformation started
   * Custom event: Transformation Started
   */
  static trackTransformationStarted(params: {
    styleName: string;
    creditsRemaining?: number;
  }) {
    try {
      const eventParams = {
        style_name: params.styleName,
        credits_remaining: params.creditsRemaining || 0,
      };

      AppEventsLogger.logEvent('TransformationStarted', eventParams);
      console.log('📊 Meta Event: Transformation Started', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Transformation Started):', error);
    }
  }

  /**
   * Track transformation completed
   * Custom event: Transformation Completed
   */
  static trackTransformationCompleted(params: {
    styleName: string;
    success: boolean;
    duration?: number;
  }) {
    try {
      const eventParams = {
        style_name: params.styleName,
        success: params.success,
        duration_seconds: params.duration || 0,
      };

      AppEventsLogger.logEvent('TransformationCompleted', eventParams);
      console.log('📊 Meta Event: Transformation Completed', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Transformation Completed):', error);
    }
  }

  /**
   * Track add to cart (viewing purchase options)
   * Standard Facebook event: fb_mobile_add_to_cart
   */
  static trackAddToCart(params: {
    contentId: string;
    contentType: string;
    currency: string;
    price: number;
  }) {
    try {
      AppEventsLogger.logEvent('fb_mobile_add_to_cart', {
        fb_content_id: params.contentId,
        fb_content_type: params.contentType,
        fb_currency: params.currency,
        _valueToSum: params.price,
      });
      console.log('📊 Meta Event: Add to Cart', params);
    } catch (error) {
      console.error('❌ Meta Event Error (Add to Cart):', error);
    }
  }

  /**
   * Track purchase initiated
   * Standard Facebook event: fb_mobile_initiated_checkout
   */
  static trackInitiatedCheckout(params: {
    contentId: string;
    contentType: string;
    currency: string;
    price: number;
    numItems?: number;
  }) {
    try {
      AppEventsLogger.logEvent('fb_mobile_initiated_checkout', {
        fb_content_id: params.contentId,
        fb_content_type: params.contentType,
        fb_currency: params.currency,
        fb_num_items: params.numItems || 1,
        _valueToSum: params.price,
      });
      console.log('📊 Meta Event: Initiated Checkout', params);
    } catch (error) {
      console.error('❌ Meta Event Error (Initiated Checkout):', error);
    }
  }

  /**
   * Track purchase completed
   * Standard Facebook event: fb_mobile_purchase
   * This is the most important event for Meta Ads optimization!
   */
  static trackPurchase(params: {
    amount: number;
    currency: string;
    contentId: string;
    contentType: string;
    numItems?: number;
    transactionId?: string;
  }) {
    try {
      AppEventsLogger.logPurchase(
        params.amount,
        params.currency,
        {
          fb_content_id: params.contentId,
          fb_content_type: params.contentType,
          fb_num_items: params.numItems || 1,
          fb_transaction_id: params.transactionId || '',
        }
      );
      console.log('📊 Meta Event: Purchase', params);
    } catch (error) {
      console.error('❌ Meta Event Error (Purchase):', error);
    }
  }

  /**
   * Track subscription started
   * Standard Facebook event: Subscribe
   */
  static trackSubscribe(params: {
    subscriptionType: string;
    amount: number;
    currency: string;
    predictedLTV?: number;
  }) {
    try {
      const eventParams = {
        fb_subscription_type: params.subscriptionType,
        fb_currency: params.currency,
        _valueToSum: params.amount,
        fb_predicted_ltv: params.predictedLTV || params.amount,
      };

      AppEventsLogger.logEvent('Subscribe', eventParams);
      console.log('📊 Meta Event: Subscribe', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Subscribe):', error);
    }
  }

  /**
   * Track trial started
   * Standard Facebook event: StartTrial
   */
  static trackStartTrial(params: {
    trialType: string;
    value?: number;
    currency?: string;
  }) {
    try {
      const eventParams = {
        fb_trial_type: params.trialType,
        fb_currency: params.currency || 'USD',
        _valueToSum: params.value || 0,
      };

      AppEventsLogger.logEvent('StartTrial', eventParams);
      console.log('📊 Meta Event: Start Trial', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Start Trial):', error);
    }
  }

  /**
   * Track app rating
   * Standard Facebook event: fb_mobile_rate
   */
  static trackRating(params: {
    rating: number;
    maxRating?: number;
  }) {
    try {
      const eventParams = {
        fb_rating: params.rating,
        fb_max_rating: params.maxRating || 5,
      };

      AppEventsLogger.logEvent('fb_mobile_rate', eventParams);
      console.log('📊 Meta Event: Rate', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Rate):', error);
    }
  }

  /**
   * Track search
   * Standard Facebook event: fb_mobile_search
   */
  static trackSearch(params: {
    searchString: string;
    contentType?: string;
    success?: boolean;
  }) {
    try {
      const eventParams = {
        fb_search_string: params.searchString,
        fb_content_type: params.contentType || '',
        fb_success: params.success !== undefined ? params.success : true,
      };

      AppEventsLogger.logEvent('fb_mobile_search', eventParams);
      console.log('📊 Meta Event: Search', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Search):', error);
    }
  }

  /**
   * Track tutorial/onboarding completion
   * Standard Facebook event: fb_mobile_tutorial_completion
   */
  static trackTutorialCompletion(params?: {
    tutorialId?: string;
    success?: boolean;
  }) {
    try {
      const eventParams = {
        fb_tutorial_id: params?.tutorialId || 'main_onboarding',
        fb_success: params?.success !== undefined ? params.success : true,
      };

      AppEventsLogger.logEvent('fb_mobile_tutorial_completion', eventParams);
      console.log('📊 Meta Event: Tutorial Completion', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Tutorial Completion):', error);
    }
  }

  /**
   * Track share/social action
   * Custom event: Share
   */
  static trackShare(params: {
    contentType: string;
    contentId?: string;
    method?: string;
  }) {
    try {
      const eventParams = {
        content_type: params.contentType,
        content_id: params.contentId || '',
        share_method: params.method || 'unknown',
      };

      AppEventsLogger.logEvent('Share', eventParams);
      console.log('📊 Meta Event: Share', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Share):', error);
    }
  }

  /**
   * Track ad click (if you're running ads within your app)
   * Standard Facebook event: fb_mobile_add_click
   */
  static trackAdClick(params: {
    adId: string;
    adType?: string;
  }) {
    try {
      const eventParams = {
        fb_ad_id: params.adId,
        fb_ad_type: params.adType || 'banner',
      };

      AppEventsLogger.logEvent('AdClick', eventParams);
      console.log('📊 Meta Event: Ad Click', eventParams);
    } catch (error) {
      console.error('❌ Meta Event Error (Ad Click):', error);
    }
  }

  /**
   * Flush events immediately
   * Useful before app closes or important events
   */
  static flush() {
    try {
      AppEventsLogger.flush();
      console.log('📊 Meta Analytics: Events flushed');
    } catch (error) {
      console.error('❌ Meta Analytics: Flush failed:', error);
    }
  }

  /**
   * Set user properties for advanced matching
   */
  static setUserData(params: {
    email?: string;
    phone?: string;
    gender?: 'm' | 'f';
    dateOfBirth?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  }) {
    try {
      AppEventsLogger.setUserData({
        email: params.email,
        phone: params.phone,
        gender: params.gender,
        dateOfBirth: params.dateOfBirth,
        firstName: params.firstName,
        lastName: params.lastName,
        city: params.city,
        state: params.state,
        zip: params.zip,
        country: params.country,
      });
      console.log('📊 Meta Analytics: User data set');
    } catch (error) {
      console.error('❌ Meta Analytics: Set user data failed:', error);
    }
  }
}

export default MetaAnalytics;
