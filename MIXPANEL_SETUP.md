# Mixpanel Analytics Setup - PaintMe App

Esta documentación explica cómo configurar y usar Mixpanel analytics en PaintMe para obtener insights detallados sobre el comportamiento de los usuarios.

## 🔧 Configuración Inicial

### 1. Variable de Entorno
Necesitas agregar tu token de Mixpanel en las variables de entorno:

```bash
# .env.local o en tu configuración de Expo
EXPO_PUBLIC_MIXPANEL_TOKEN=tu_token_de_mixpanel_aqui
```

### 2. Obtener Token de Mixpanel
1. Ve a [mixpanel.com](https://mixpanel.com) y crea una cuenta
2. Crea un nuevo proyecto para PaintMe
3. Ve a Settings → Project Settings
4. Copia tu **Project Token**
5. Pégalo en tu archivo de configuración

## 📊 Eventos Implementados

### 🚀 Eventos de App Lifecycle
- **`App Opened`** - Cuando el usuario abre la app
- **`App Closed`** - Cuando el usuario cierra la app

### 🔐 Eventos de Autenticación
- **`User Sign Up`** - Nuevo registro con método (email/apple/google)
- **`User Sign In`** - Login exitoso con método
- **`User Sign Out`** - Cierre de sesión

### 📱 Eventos de Onboarding
- **`Onboarding Started`** - Usuario inicia el onboarding
- **`Onboarding Step Viewed`** - Vista de cada paso (1, 2, 3)
  - Properties: `step_number`, `step_name`
- **`Onboarding Completed`** - Usuario completa los 3 pasos
- **`Onboarding Skipped`** - Usuario salta el onboarding
  - Properties: `at_step`

### 🖼️ Eventos de Transformación de Imágenes
- **`Image Selected`** - Usuario selecciona imagen
  - Properties: `source` (camera/gallery)
- **`Artist Style Selected`** - Usuario elige estilo de artista
  - Properties: `artist_name`
- **`Image Transformation Started`** - Inicia procesamiento
  - Properties: `artist_style`
- **`Image Transformation Completed`** - Transformación exitosa
  - Properties: `artist_style`, `processing_time_seconds`
- **`Image Transformation Failed`** - Error en transformación
  - Properties: `artist_style`, `error_message`
- **`Image Saved`** - Usuario guarda imagen en galería
- **`Image Shared`** - Usuario comparte imagen
  - Properties: `platform`

### 💰 Eventos de Monetización
- **`Purchase Started`** - Usuario inicia compra
  - Properties: `package_id`, `price`
- **`Purchase Completed`** - Compra exitosa con tracking de revenue
  - Properties: `package_id`, `price`, `credits_received`
- **`Purchase Failed`** - Error en compra
  - Properties: `package_id`, `error_message`
- **`Credits Used`** - Usuario usa crédito para transformación
  - Properties: `remaining_credits`

### ⚙️ Eventos de Configuración
- **`Notification Settings Changed`** - Cambio en notificaciones
  - Properties: `setting_name`, `enabled`
- **`Language Changed`** - Cambio de idioma
  - Properties: `from_language`, `to_language`

### 🏠 Eventos de Navegación
- **`Gallery Viewed`** - Usuario ve la galería
- **`Profile Viewed`** - Usuario ve su perfil
- **`Help Contacted`** - Usuario contacta soporte
  - Properties: `method` (email/other)

## 🎯 Propiedades de Usuario

### Identificación
```typescript
// Se ejecuta automáticamente al hacer login
Analytics.identifyUser(userId, email);
```

### Propiedades del Perfil
- **`$email`** - Email del usuario
- **`$name`** - Nombre derivado del email
- **`credits`** - Créditos disponibles
- **`total_transformations`** - Total de transformaciones
- **`favorite_artist`** - Artista favorito
- **`subscription_status`** - Estado de suscripción
- **`first_transformation_date`** - Fecha primera transformación

## 🔧 Uso del Servicio Analytics

### Importar el Servicio
```typescript
import { Analytics } from '../lib/analytics';
```

### Eventos Básicos
```typescript
// Evento simple
await Analytics.trackEvent('Custom Event Name');

// Evento con propiedades
await Analytics.trackEvent('Button Clicked', {
  button_name: 'transform',
  screen: 'main',
  user_credits: 5
});
```

### Eventos Específicos
```typescript
// Transformación de imagen
await Analytics.trackImageTransformationStarted('Caravaggio');

// Compra
await Analytics.trackPurchaseCompleted('credits_10', 9.99, 10);

// Configuración
await Analytics.trackNotificationSettingsChanged('reminders', true);
```

### Propiedades de Usuario
```typescript
// Actualizar propiedades del perfil
await Analytics.setUserProperties({
  total_transformations: 15,
  favorite_artist: 'Van Gogh',
  subscription_tier: 'premium'
});
```

## 📈 Dashboards Recomendados

### 1. User Acquisition Funnel
- App Opened → User Sign Up → Onboarding Completed → First Transformation

### 2. Transformation Funnel
- Image Selected → Artist Selected → Transformation Started → Transformation Completed

### 3. Monetization
- Credits Used → Purchase Started → Purchase Completed
- Revenue tracking por paquete de créditos

### 4. Engagement
- Daily/Weekly Active Users
- Session duration
- Gallery views per session

### 5. Onboarding Optimization
- Completion rate por step
- Skip rate y drop-off points
- Time spent per step

## 🚨 Consideraciones de Privacidad

### GDPR/Privacy Compliance
```typescript
// Opt out de tracking (cuando el usuario no consiente)
await Analytics.optOut();

// Opt in cuando acepta
await Analytics.optIn();

// Reset de datos (en logout)
await Analytics.reset();
```

### Datos Sensibles
- ❌ NO trackear información personal identificable
- ❌ NO trackear URLs de imágenes originales
- ✅ SÍ trackear eventos de comportamiento
- ✅ SÍ trackear métricas de rendimiento

## 🔍 Debug y Testing

### Desarrollo
```typescript
// Verificar en consola
console.log('📊 Event tracked:', eventName, properties);
```

### Mixpanel Live View
1. Ve a tu proyecto en Mixpanel
2. Click en "Live View"
3. Ejecuta acciones en tu app de development
4. Verifica que los eventos aparezcan en tiempo real

## 📱 Eventos por Pantalla

### Main Screen (Transform)
- Image Selected (camera/gallery)
- Artist Style Selected
- Image Transformation Started/Completed/Failed
- Image Saved

### Profile Screen  
- Profile Viewed
- Purchase Started/Completed/Failed
- Notification Settings Changed
- Language Changed
- Help Contacted

### Gallery Screen
- Gallery Viewed
- Image Saved (from gallery)

### Onboarding
- Onboarding Started/Step Viewed/Completed/Skipped

## 🎮 Eventos Custom Adicionales

```typescript
// Ejemplos de eventos adicionales que puedes agregar
Analytics.trackEvent('Feature Discovery', {
  feature_name: 'artist_comparison',
  discovery_method: 'exploration'
});

Analytics.trackEvent('User Feedback', {
  rating: 5,
  feedback_type: 'app_review'
});

Analytics.trackEvent('Performance Issue', {
  issue_type: 'slow_transformation',
  processing_time: 45.2
});
```

¡Con esta configuración tendrás analytics completos para optimizar la experiencia del usuario y el crecimiento de tu app! 📊✨