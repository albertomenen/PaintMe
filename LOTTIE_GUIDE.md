# Guía de Animaciones Lottie - PaintMe App

Esta guía explica cómo usar y personalizar las animaciones Lottie en PaintMe para crear una experiencia de usuario más atractiva e interactiva.

## 🎨 Animaciones Disponibles

### Animaciones del Onboarding
- **`Monarisa.json`** - Mona Lisa animada para el paso "Sube tu imagen"
- **`Artist.json`** - Artista pintando para el paso "Elige tu estilo"
- **`Abstract Painting Loader.json`** - Pintura abstracta para "Transforma y disfruta"

## 📱 Componentes Implementados

### 1. LottieIcon - Componente Base
```typescript
import LottieIcon from '../components/LottieIcon';
import { LOTTIE_ANIMATIONS } from '../constants/Animations';

// Uso básico
<LottieIcon 
  source={LOTTIE_ANIMATIONS.UPLOAD_IMAGE}
  size={120}
  autoPlay={true}
  loop={true}
  speed={0.8}
/>
```

**Props disponibles:**
- `source` - Archivo JSON de la animación
- `size` - Tamaño del contenedor (ancho y alto)
- `style` - Estilos adicionales para el contenedor
- `autoPlay` - Reproducir automáticamente (default: true)
- `loop` - Repetir en bucle (default: true)
- `speed` - Velocidad de reproducción (default: 1)
- `onAnimationFinish` - Callback cuando termina la animación

### 2. LottieLoadingButton - Botón con Animación
```typescript
import LottieLoadingButton from '../components/LottieLoadingButton';

<LottieLoadingButton
  title="Transformar Imagen"
  onPress={handleTransform}
  isLoading={isTransforming}
  colors={['#FFD700', '#FFA500']}
/>
```

## 🎯 Onboarding Mejorado

### Estructura del Onboarding
```typescript
const ONBOARDING_STEPS = [
  {
    titleKey: 'onboarding.steps.upload.title',
    descriptionKey: 'onboarding.steps.upload.description',
    animation: LOTTIE_ANIMATIONS.UPLOAD_IMAGE, // Mona Lisa
    color: ['#FF6B6B', '#FF8E8E'],
  },
  {
    titleKey: 'onboarding.steps.style.title', 
    descriptionKey: 'onboarding.steps.style.description',
    animation: LOTTIE_ANIMATIONS.CHOOSE_ARTIST, // Artista
    color: ['#4ECDC4', '#44A08D'],
  },
  {
    titleKey: 'onboarding.steps.transform.title',
    descriptionKey: 'onboarding.steps.transform.description', 
    animation: LOTTIE_ANIMATIONS.TRANSFORM_ART, // Pintura abstracta
    color: ['#FFD700', '#FFA500'],
  },
];
```

### Estilos CSS Avanzados
```typescript
animationGradient: {
  width: 180,
  height: 180,
  borderRadius: 90,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
  // Sombras para profundidad
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
  elevation: 8,
},
```

## 🔧 Personalización de Estilos CSS

### 1. Contenedor de Animación
```typescript
// Estilos personalizables para diferentes tamaños
const getAnimationStyle = (size: 'small' | 'medium' | 'large') => {
  const sizes = {
    small: { width: 80, height: 80 },
    medium: { width: 120, height: 120 },
    large: { width: 180, height: 180 },
  };
  
  return {
    ...sizes[size],
    borderRadius: sizes[size].width / 2,
    justifyContent: 'center',
    alignItems: 'center',
  };
};
```

### 2. Efectos de Gradiente
```typescript
// Gradientes temáticos por paso del onboarding
const gradientColors = {
  upload: ['#FF6B6B', '#FF8E8E'],    // Rojo coral
  artist: ['#4ECDC4', '#44A08D'],    // Verde agua
  transform: ['#FFD700', '#FFA500'], // Dorado
  loading: ['#667eea', '#764ba2'],   // Púrpura
};
```

### 3. Animaciones de Entrada
```typescript
// Animaciones con React Native Reanimated
<Animated.View 
  entering={FadeInRight.duration(500)}
  exiting={FadeOutLeft.duration(500)}
>
  <LottieIcon source={animation} />
</Animated.View>
```

## 🚀 Casos de Uso Adicionales

### 1. Loading States
```typescript
// En botones de transformación
{isTransforming && (
  <LottieIcon 
    source={LOTTIE_ANIMATIONS.LOADING}
    size={32}
    speed={1.5}
  />
)}
```

### 2. Estado de Éxito
```typescript
// Mostrar cuando la transformación está lista
<LottieIcon 
  source={LOTTIE_ANIMATIONS.SUCCESS}
  size={100}
  loop={false}
  onAnimationFinish={() => setShowSuccess(false)}
/>
```

### 3. Placeholders Animados
```typescript
// En lugar de imágenes estáticas
<View style={styles.placeholder}>
  <LottieIcon 
    source={LOTTIE_ANIMATIONS.UPLOAD_IMAGE}
    size={60}
    speed={0.5}
  />
</View>
```

## ⚡ Optimización de Performance

### 1. Lazy Loading
```typescript
// Cargar animaciones solo cuando se necesiten
const LazyLottieIcon = ({ animationType, ...props }) => {
  const [animation, setAnimation] = useState(null);
  
  useEffect(() => {
    setAnimation(LOTTIE_ANIMATIONS[animationType]);
  }, [animationType]);
  
  return animation ? <LottieIcon source={animation} {...props} /> : null;
};
```

### 2. Control de Memoria
```typescript
// Pausar animaciones cuando no son visibles
const [isVisible, setIsVisible] = useState(true);

<LottieIcon 
  source={animation}
  autoPlay={isVisible}
  loop={isVisible}
/>
```

### 3. Velocidades Optimizadas
```typescript
const ANIMATION_SPEEDS = {
  onboarding: 0.8,  // Más lento para mejor comprensión
  loading: 1.5,     // Más rápido para sensación de actividad
  success: 1.0,     // Velocidad normal para celebración
};
```

## 🎨 Personalización Visual

### Colores Dinámicos
```typescript
// Cambiar colores del gradiente según el tema
const getThemeColors = (theme: 'light' | 'dark') => ({
  light: ['#FFD700', '#FFA500'],
  dark: ['#667eea', '#764ba2'],
});
```

### Tamaños Responsivos
```typescript
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const animationSize = Math.min(width * 0.4, 180);
```

### Efectos de Sombra
```typescript
const shadowStyles = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
};
```

## 📋 Mejores Prácticas

1. **Performance**: Usar `speed` entre 0.5 y 2.0 para mejor experiencia
2. **Accesibilidad**: Proporcionar `accessibilityLabel` para usuarios con discapacidades
3. **Memoria**: Pausar animaciones en pantallas no visibles
4. **Tamaño**: Mantener archivos JSON < 100KB para carga rápida
5. **Fallbacks**: Tener íconos estáticos como respaldo

## 🔄 Agregar Nuevas Animaciones

1. **Descargar de LottieFiles**: Exportar como JSON
2. **Agregar a assets**: Colocar en `assets/animations/`
3. **Actualizar constantes**:
```typescript
// constants/Animations.ts
export const LOTTIE_ANIMATIONS = {
  // ... animaciones existentes
  NEW_ANIMATION: require('../assets/animations/new-animation.json'),
};
```
4. **Usar en componentes**: Importar y usar normalmente

¡Las animaciones Lottie están completamente integradas y listas para crear una experiencia de usuario increíble! 🎉