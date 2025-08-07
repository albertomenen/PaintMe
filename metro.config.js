// Importa la función para obtener la configuración por defecto de Expo/Metro.
const { getDefaultConfig } = require('@expo/metro-config');

// Obtiene la configuración base.
const config = getDefaultConfig(__dirname);

// Exporta la configuración para que Metro pueda usarla.
module.exports = config;