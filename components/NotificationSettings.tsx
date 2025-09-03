import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NotificationService } from '../lib/notifications';
import { useI18n } from '../hooks/useI18n';
import { Analytics } from '../lib/analytics';

const NOTIFICATION_SETTINGS_KEY = '@paintme_notification_settings';

interface NotificationSettings {
  transformationComplete: boolean;
  reminders: boolean;
  marketing: boolean;
}

const defaultSettings: NotificationSettings = {
  transformationComplete: true,
  reminders: true,
  marketing: false,
};

interface NotificationSettingsProps {
  onBack: () => void;
}

export default function NotificationSettingsScreen({ onBack }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

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
    Analytics.trackNotificationSettingsChanged(key, value);
  };

  const testNotification = async () => {
    try {
      await NotificationService.scheduleLocalNotification(
        t('notifications.messages.test.title'),
        t('notifications.messages.test.body'),
        1
      );
      Alert.alert(t('notifications.alerts.scheduled'), t('notifications.alerts.testMessage'));
    } catch (error) {
      Alert.alert(t('common.error'), t('notifications.alerts.error'));
    }
  };

  const renderSettingItem = (
    title: string,
    description: string,
    key: keyof NotificationSettings,
    icon: keyof typeof Ionicons.glyphMap
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Ionicons name={icon} size={24} color="#667eea" />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ false: '#E0E0E0', true: '#667eea' }}
        thumbColor={settings[key] ? '#FFF' : '#FFF'}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#667eea" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('notifications.title')}</Text>
        <TouchableOpacity onPress={testNotification} style={styles.testButton}>
          <Ionicons name="notifications-outline" size={20} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* Settings List */}
      <View style={styles.settingsList}>
        {renderSettingItem(
          t('notifications.settings.transformationComplete.title'),
          t('notifications.settings.transformationComplete.description'),
          'transformationComplete',
          'checkmark-circle'
        )}

        {renderSettingItem(
          t('notifications.settings.reminders.title'),
          t('notifications.settings.reminders.description'),
          'reminders',
          'time'
        )}

        {renderSettingItem(
          t('notifications.settings.marketing.title'),
          t('notifications.settings.marketing.description'),
          'marketing',
          'pricetag'
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Ionicons name="information-circle" size={20} color="#667eea" />
          <Text style={styles.infoText}>
            {t('notifications.info.help')}
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark" size={20} color="#28a745" />
          <Text style={styles.infoText}>
            {t('notifications.info.privacy')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  testButton: {
    padding: 5,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#666',
  },
  settingsList: {
    backgroundColor: '#FFF',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 34,
  },
  infoSection: {
    marginTop: 30,
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 10,
  },
});