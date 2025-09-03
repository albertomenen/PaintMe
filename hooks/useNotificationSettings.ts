import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const NOTIFICATION_SETTINGS_KEY = '@paintme_notification_settings';

export interface NotificationSettings {
  transformationComplete: boolean;
  reminders: boolean;
  marketing: boolean;
}

const defaultSettings: NotificationSettings = {
  transformationComplete: true,
  reminders: true,
  marketing: false,
};

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const getSettings = () => settings;

  return {
    settings,
    loading,
    updateSetting,
    getSettings,
    loadSettings,
  };
}