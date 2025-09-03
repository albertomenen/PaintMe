import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../hooks/useI18n';
import { Analytics } from '../lib/analytics';

interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageSelector({ visible, onClose }: LanguageSelectorProps) {
  const { changeLocale, getCurrentLocale } = useI18n();
  const currentLocale = getCurrentLocale();

  const handleLanguageSelect = (languageCode: string) => {
    const previousLanguage = getCurrentLocale();
    changeLocale(languageCode);
    Analytics.trackLanguageChanged(previousLanguage, languageCode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Language</Text>
            <Text style={styles.subtitle}>Seleccionar Idioma</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.languageList}>
            {LANGUAGES.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageItem,
                  currentLocale === language.code && styles.selectedLanguageItem,
                ]}
                onPress={() => handleLanguageSelect(language.code)}
              >
                <Text style={styles.flag}>{language.flag}</Text>
                <Text style={[
                  styles.languageName,
                  currentLocale === language.code && styles.selectedLanguageName,
                ]}>
                  {language.name}
                </Text>
                {currentLocale === language.code && (
                  <Ionicons name="checkmark-circle" size={24} color="#667eea" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    width: '80%',
    maxWidth: 320,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  languageList: {
    padding: 10,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginVertical: 2,
  },
  selectedLanguageItem: {
    backgroundColor: '#F0F2FF',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  selectedLanguageName: {
    fontWeight: 'bold',
    color: '#667eea',
  },
});