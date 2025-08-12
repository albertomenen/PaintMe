// Importa la función para obtener la configuración por defecto de Expo/Metro.
const { getDefaultConfig } = require('@expo/metro-config');

// Obtiene la configuración base.
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('svg');
config.resolver.sourceExts.push('sql', 'mjs', 'cjs');

config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;


// Exporta la configuración para que Metro pueda usarla.
module.exports = config;