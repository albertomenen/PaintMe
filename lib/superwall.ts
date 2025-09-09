// NOTE: This service is deprecated. Use usePlacement and useSuperwall hooks directly instead.
// Keeping for compatibility during transition.

export const SuperwallService = {
  /**
   * @deprecated Use usePlacement hook directly instead
   */
  register: async (superwall: any, placement: string, feature: () => void): Promise<void> => {
    console.warn('⚠️ SuperwallService.register is deprecated. Use usePlacement hook directly.');
    // Fallback: execute feature immediately since we can't use hooks here
    feature();
  },

  /**
   * @deprecated Use usePlacement hook directly instead
   */
  presentPaywall: async (superwall: any, placement: string = 'credits_needed'): Promise<{ success: boolean }> => {
    console.warn('⚠️ SuperwallService.presentPaywall is deprecated. Use usePlacement hook directly.');
    return { success: false };
  },

  /**
   * Identify user in Superwall - Still valid for direct superwall usage
   */
  identify: async (superwall: any, userId: string): Promise<void> => {
    try {
      await superwall.identify(userId);
      console.log('✅ User identified in Superwall:', userId);
    } catch (error) {
      console.error('❌ Error identifying user in Superwall:', error);
    }
  },

  /**
   * Set user attributes in Superwall - Still valid for direct superwall usage
   */
  setUserAttributes: async (superwall: any, attributes: Record<string, any>): Promise<void> => {
    try {
      await superwall.setUserAttributes(attributes);
      console.log('✅ User attributes set in Superwall:', attributes);
    } catch (error) {
      console.error('❌ Error setting user attributes in Superwall:', error);
    }
  },

  /**
   * Reset Superwall - Still valid for direct superwall usage
   */
  reset: async (superwall: any): Promise<void> => {
    try {
      await superwall.reset();
      console.log('✅ Superwall reset successfully');
    } catch (error) {
      console.error('❌ Error resetting Superwall:', error);
    }
  }
};

// Superwall placements for the app
export const SUPERWALL_PLACEMENTS = {
  CREDITS_NEEDED: 'credits_needed',
  ONBOARDING_COMPLETE: 'onboarding_complete', 
  TRANSFORMATION_START: 'transformation_start',
  PROFILE_VIEW: 'profile_view',
  SIGN_UP: 'sign_up',
} as const;

export type SuperwallPlacement = typeof SUPERWALL_PLACEMENTS[keyof typeof SUPERWALL_PLACEMENTS];

// Legacy compatibility
export const SUPERWALL_EVENTS = SUPERWALL_PLACEMENTS;