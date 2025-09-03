// Lottie animation sources
export const LOTTIE_ANIMATIONS = {
  // Onboarding animations
  UPLOAD_IMAGE: require('../assets/animations/Monarisa.json'),
  CHOOSE_ARTIST: require('../assets/animations/Artist.json'),
  TRANSFORM_ART: require('../assets/animations/Abstract Painting Loader.json'),
  
  // Additional animations for future use
  LOADING: require('../assets/animations/Abstract Painting Loader.json'),
  SUCCESS: require('../assets/animations/Artist.json'),
} as const;

export type AnimationType = keyof typeof LOTTIE_ANIMATIONS;