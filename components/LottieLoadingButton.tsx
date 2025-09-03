import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import LottieIcon from './LottieIcon';
import { LOTTIE_ANIMATIONS } from '../constants/Animations';

interface LottieLoadingButtonProps {
  title: string;
  onPress: () => Promise<void> | void;
  disabled?: boolean;
  style?: ViewStyle;
  colors?: [string, string];
  isLoading?: boolean;
}

const LottieLoadingButton = ({
  title,
  onPress,
  disabled = false,
  style,
  colors = ['#FFD700', '#FFA500'],
  isLoading = false,
}: LottieLoadingButtonProps) => {
  const [internalLoading, setInternalLoading] = useState(false);
  
  const handlePress = async () => {
    if (disabled || isLoading || internalLoading) return;
    
    setInternalLoading(true);
    try {
      await onPress();
    } finally {
      setInternalLoading(false);
    }
  };

  const showLoading = isLoading || internalLoading;

  return (
    <TouchableOpacity
      style={[styles.button, style, (disabled || showLoading) && styles.disabledButton]}
      onPress={handlePress}
      disabled={disabled || showLoading}
    >
      <LinearGradient colors={colors} style={styles.buttonGradient}>
        {showLoading && (
          <LottieIcon 
            source={LOTTIE_ANIMATIONS.LOADING}
            size={24}
            autoPlay={true}
            loop={true}
            speed={1.5}
            style={styles.loadingIcon}
          />
        )}
        <Text style={[styles.buttonText, showLoading && styles.loadingText]}>
          {showLoading ? 'Processing...' : title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginLeft: 8,
  },
  loadingIcon: {
    marginRight: 4,
  },
});

export default LottieLoadingButton;