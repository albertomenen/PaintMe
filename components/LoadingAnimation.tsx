import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingAnimationProps {
  message?: string;
  visible: boolean;
}

const { width, height } = Dimensions.get('window');

export default function LoadingAnimation({ message, visible }: LoadingAnimationProps) {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible && animationRef.current) {
      animationRef.current.play();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <LottieView
            ref={animationRef}
            source={require('../assets/animations/Monarisa.json')}
            style={styles.animation}
            autoPlay
            loop
          />
          {message && (
            <ThemedText style={styles.message}>{message}</ThemedText>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: width * 0.8,
    height: width * 0.8,
    maxWidth: 400,
    maxHeight: 400,
  },
  message: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
