import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useI18n } from '../hooks/useI18n';
import LottieIcon from './LottieIcon';
import { LOTTIE_ANIMATIONS } from '../constants/Animations';
import { Analytics } from '../lib/analytics';

interface OnboardingStep {
  titleKey: string;
  descriptionKey: string;
  animation: any;
  color: [string, string];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    titleKey: 'onboarding.steps.upload.title',
    descriptionKey: 'onboarding.steps.upload.description',
    animation: LOTTIE_ANIMATIONS.UPLOAD_IMAGE,
    color: ['#FF6B6B', '#FF8E8E'],
  },
  {
    titleKey: 'onboarding.steps.style.title',
    descriptionKey: 'onboarding.steps.style.description',
    animation: LOTTIE_ANIMATIONS.CHOOSE_ARTIST,
    color: ['#4ECDC4', '#44A08D'],
  },
  {
    titleKey: 'onboarding.steps.transform.title',
    descriptionKey: 'onboarding.steps.transform.description',
    animation: LOTTIE_ANIMATIONS.TRANSFORM_ART,
    color: ['#FFD700', '#FFA500'],
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const progressValue = useSharedValue(0);
  const { t } = useI18n();

  // Track onboarding started
  useEffect(() => {
    Analytics.trackOnboardingStarted();
  }, []);

  // Track step changes
  useEffect(() => {
    const stepName = t(ONBOARDING_STEPS[currentStep].titleKey);
    Analytics.trackOnboardingStepViewed(currentStep + 1, stepName);
  }, [currentStep, t]);

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      progressValue.value = withSpring((currentStep + 2) / ONBOARDING_STEPS.length);
    } else {
      Analytics.trackOnboardingCompleted();
      onComplete();
    }
  };

  const skipOnboarding = () => {
    Analytics.trackOnboardingSkipped(currentStep + 1);
    onComplete();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000']} style={StyleSheet.absoluteFill} />
      
      {/* Skip button */}
      <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <Animated.View 
        key={currentStep}
        entering={FadeInRight.duration(500)}
        exiting={FadeOutLeft.duration(500)}
        style={styles.content}
      >
        {/* Animation */}
        <View style={styles.animationContainer}>
          <LinearGradient colors={currentStepData.color} style={styles.animationGradient}>
            <LottieIcon 
              source={currentStepData.animation}
              size={120}
              autoPlay={true}
              loop={true}
              speed={0.8}
            />
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={styles.title}>{t(currentStepData.titleKey)}</Text>

        {/* Description */}
        <Text style={styles.description}>{t(currentStepData.descriptionKey)}</Text>
      </Animated.View>

      {/* Navigation */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.buttonGradient}>
            <Text style={styles.nextButtonText}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? t('onboarding.start') : t('onboarding.next')}
            </Text>
            <Ionicons 
              name={currentStep === ONBOARDING_STEPS.length - 1 ? 'rocket-outline' : 'chevron-forward'} 
              size={20} 
              color="#000" 
              style={styles.buttonIcon}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#FFD700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  animationContainer: {
    marginBottom: 40,
  },
  animationGradient: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  navigationContainer: {
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});