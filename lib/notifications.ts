import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// Import translations
import en from '../locales/en.json';
import es from '../locales/es.json';

// Create I18n instance for notifications
const i18n = new I18n({
  en,
  es,
});

const deviceLanguage = getLocales()[0]?.languageCode || 'en';
i18n.locale = deviceLanguage;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications');
      return false;
    }

    return true;
  }

  static async getExpoPushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.error('Project ID not found');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log('✅ Expo Push Token:', tokenData.data);
      return tokenData.data;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  }

  static async registerForPushNotifications(): Promise<string | null> {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Configure iOS channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
      });
    }

    // Configure iOS sound
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('image_transformed', [
        {
          identifier: 'view_image',
          buttonTitle: 'Ver Imagen',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    }

    return await this.getExpoPushToken();
  }

  static async scheduleLocalNotification(
    title: string,
    body: string,
    seconds?: number,
    data?: any
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        categoryIdentifier: 'image_transformed',
      },
      trigger: seconds ? { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false 
      } : null,
    });
  }

  static async sendImageTransformedNotification(): Promise<void> {
    await this.scheduleLocalNotification(
      i18n.t('notifications.messages.imageReady.title'),
      i18n.t('notifications.messages.imageReady.body'),
      1,
      { 
        action: 'view_transformed_image',
        redirectTo: '/(tabs)/gallery'
      }
    );
  }

  static async sendReminderNotification(hoursFromNow: number = 24): Promise<void> {
    const seconds = hoursFromNow * 60 * 60; // Convert hours to seconds
    
    await this.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.messages.reminder.title'),
        body: i18n.t('notifications.messages.reminder.body'),
        data: { 
          action: 'create_art_reminder',
          redirectTo: '/(tabs)/'
        },
        sound: 'default',
      },
      trigger: seconds ? { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false 
      } : null,
    });
  }

  static async sendSpecialOfferNotification(minutesFromNow: number = 5): Promise<void> {
    const seconds = minutesFromNow * 60; // Convert minutes to seconds
    
    // Cancel any existing notifications first
    await this.cancelAllNotifications();
    
    await this.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.messages.specialOffer.title'),
        body: i18n.t('notifications.messages.specialOffer.body'),
        data: { 
          action: 'special_offer',
          isOffer: 'true',
          offeringId: 'ofrng15feade036',
          redirectTo: '/special-offer-paywall'
        },
        sound: 'default',
        categoryIdentifier: 'special_offer',
      },
      trigger: seconds ? { 
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false 
      } : null,
    });
    
    console.log(`⏰ Special offer notification scheduled for ${minutesFromNow} minutes from now`);
  }

  static async scheduleNotificationAsync(notificationRequest: Notifications.NotificationRequestInput): Promise<string> {
    return await Notifications.scheduleNotificationAsync(notificationRequest);
  }

  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Handle notification responses when app is opened from notification
  static addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Handle notifications when app is in foreground
  static addNotificationListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }
}