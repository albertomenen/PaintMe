# Internacionalización (i18n) - PaintMe App

Este documento explica cómo funciona el sistema de internacionalización en PaintMe, que permite que la app se muestre en español o inglés automáticamente según la configuración del dispositivo del usuario.

## 🌍 Cómo funciona

### Detección automática del idioma
- La app detecta automáticamente el idioma del dispositivo usando `expo-localization`
- Si el dispositivo está en español (`es`), muestra todo en español
- Si el dispositivo está en inglés (`en`) o cualquier otro idioma, muestra todo en inglés
- El idioma se detecta desde la configuración del App Store/Play Store donde descargó la app

### Idiomas soportados
- **Español (es)** 🇪🇸 - Idioma principal para usuarios hispanohablantes
- **Inglés (en)** 🇺🇸 - Idioma por defecto y para usuarios internacionales

## 📁 Estructura de archivos

```
locales/
├── es.json         # Traducciones en español
├── en.json         # Traducciones en inglés
└── (futuros idiomas)

hooks/
├── useI18n.ts      # Hook principal para internacionalización

components/
├── LanguageSelector.tsx    # Selector manual de idioma (opcional)
├── Onboarding.tsx         # Onboarding con traducciones
└── NotificationSettings.tsx # Configuración de notificaciones con traducciones
```

## 🔧 Implementación

### Hook useI18n
```typescript
import { useI18n } from '../hooks/useI18n';

function MyComponent() {
  const { t, locale, isSpanish } = useI18n();
  
  return (
    <Text>{t('onboarding.steps.upload.title')}</Text>
  );
}
```

### Funciones disponibles
- `t(key, options?)` - Traduce una clave
- `changeLocale(locale)` - Cambia idioma manualmente
- `getCurrentLocale()` - Obtiene idioma actual
- `isSpanish()` - Verifica si está en español
- `isEnglish()` - Verifica si está en inglés

## 📝 Estructura de traducciones

### Onboarding (Bienvenida)
```json
{
  "onboarding": {
    "skip": "Saltar / Skip",
    "next": "Siguiente / Next", 
    "start": "Comenzar / Get Started",
    "steps": {
      "upload": {
        "title": "Convierte tus fotos en Arte! / Transform your Photos into Art!",
        "description": "Descripción del paso..."
      }
    }
  }
}
```

### Notificaciones
```json
{
  "notifications": {
    "title": "Notificaciones / Notifications",
    "messages": {
      "imageReady": {
        "title": "🎨 ¡Tu obra maestra está lista! / Your masterpiece is ready!",
        "body": "Mensaje de notificación..."
      }
    }
  }
}
```

## 🚀 Componentes implementados

### ✅ Onboarding
- **Paso 1**: Sube tu Imagen / Upload Your Image
- **Paso 2**: Elige tu Estilo / Choose Your Style  
- **Paso 3**: Transforma y Disfruta / Transform and Enjoy

### ✅ Notificaciones push
- Título y contenido en el idioma del dispositivo
- Notificación de imagen lista
- Recordatorios para crear más arte
- Notificaciones de prueba

### ✅ Configuración de notificaciones
- Pantalla de configuración completamente traducida
- Descripciones de cada tipo de notificación
- Información de ayuda y privacidad

## 🧪 Testing del sistema

### Cambiar idioma manualmente
1. Ve a **Perfil → Settings → Language / Idioma**
2. Selecciona español o inglés
3. La app cambiará inmediatamente

### Verificar detección automática
1. Cambia idioma del iPhone: **Configuración → General → Idioma y Región**
2. Cierra y abre la app
3. Debería mostrar el idioma correcto automáticamente

## 📱 Experiencia del usuario

### Usuario con iPhone en Español
- Descarga la app desde App Store en español
- Ve onboarding en español
- Recibe notificaciones en español
- Interfaz completamente en español

### Usuario con iPhone en Inglés
- Downloads app from English App Store
- Sees onboarding in English
- Receives notifications in English  
- Complete interface in English

## 🔄 Agregar nuevos idiomas

Para agregar un nuevo idioma (ej: francés):

1. **Crear archivo de traducción**
```bash
touch locales/fr.json
```

2. **Agregar traducciones**
```json
{
  "onboarding": {
    "skip": "Passer",
    "next": "Suivant",
    // ...
  }
}
```

3. **Actualizar hook useI18n**
```typescript
import fr from '../locales/fr.json';

const i18n = new I18n({
  en,
  es, 
  fr,  // ← Agregar aquí
});
```

4. **Agregar a selector de idioma**
```typescript
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }, // ← Agregar aquí
];
```

## 🎯 Beneficios

- **Experiencia nativa**: Cada usuario ve la app en su idioma
- **Automático**: No requiere configuración manual
- **Completo**: Onboarding, notificaciones y configuración incluidos
- **Escalable**: Fácil agregar más idiomas
- **Testing**: Selector manual para pruebas

## 🔍 Archivos modificados

- `package.json` - Dependencias i18n
- `hooks/useI18n.ts` - Hook principal
- `locales/` - Archivos de traducción
- `components/Onboarding.tsx` - Onboarding traducido
- `lib/notifications.ts` - Notificaciones traducidas
- `components/NotificationSettings.tsx` - Configuración traducida
- `components/LanguageSelector.tsx` - Selector de idioma
- `app/(tabs)/profile.tsx` - Integración del selector

¡El sistema está completo y listo para producción! 🎉