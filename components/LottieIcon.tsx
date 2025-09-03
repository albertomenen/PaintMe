import LottieView from 'lottie-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface LottieIconProps {
  source: any; // JSON animation file
  size?: number;
  style?: ViewStyle;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  onAnimationFinish?: () => void;
}

const LottieIcon = ({
  source,
  size = 100,
  style,
  autoPlay = true,
  loop = true,
  speed = 1,
  onAnimationFinish,
}: LottieIconProps) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (autoPlay) {
      animationRef.current?.play();
    }
  }, [autoPlay]);

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
    },
    style,
  ];

  return (
    <View style={containerStyle}>
      <LottieView
        ref={animationRef}
        source={source}
        style={styles.lottie}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        onAnimationFinish={onAnimationFinish}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});

export default LottieIcon;