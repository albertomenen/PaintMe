export const Config = {
  REPLICATE_API_TOKEN: process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || 'r8_LcGPhYyycC6TH0ZEs0TUp4NAvfGepH51olaSW',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ,
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ,
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY 
};

// Debug logging (remove in production)
if (__DEV__) {
  console.log('🔧 Config Debug:', {
    SUPABASE_URL: Config.SUPABASE_URL,
    SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY ? `${Config.SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET',
    REPLICATE_TOKEN: Config.REPLICATE_API_TOKEN ? `${Config.REPLICATE_API_TOKEN.substring(0, 10)}...` : 'NOT SET',
    STRIPE_PUBLISHABLE_KEY: Config.STRIPE_PUBLISHABLE_KEY ? `${Config.STRIPE_PUBLISHABLE_KEY.substring(0, 10)}...` : 'NOT SET',
  });
}

export const ARTIST_STYLES = {
  caravaggio: {
    name: 'Caravaggio',
    fullName: 'Michelangelo Merisi da Caravaggio',
    period: '1571-1610',
    description: 'Master of dramatic chiaroscuro lighting and intense emotional realism',
    characteristics: 'Dramatic lighting, deep shadows, emotional intensity',
    prompt: 'Reimagine this photo as an oil painting by Caravaggio, applying intense tenebrism with a dramatic, directional light source that sculpts figures emerging from a deep darkness. Emphasize a raw, visceral realism in the details and textures. Use an earthy color palette, with rich shadows in blacks and browns, and touches of intense reds and ochres in the illuminated areas, capturing a profound emotional tension and a moment frozen in time, in the Italian Baroque style.',
    sampleImage: require('../assets/images/Caravaggio.png'),
    primaryColor: '#8B4513',
    secondaryColor: '#DAA520',
    gradientColors: ['#8B4513', '#CD853F', '#DAA520']
  },
  velazquez: {
    name: 'Velázquez',
    fullName: 'Diego Rodríguez de Silva y Velázquez',
    period: '1599-1660',
    description: 'Spanish master of royal portraiture and sophisticated realism',
    characteristics: 'Sophisticated technique, subtle lighting, masterful realism',
    prompt: 'Transform this photograph into a masterpiece by Diego Velázquez, employing a sophisticated realism and a loose, precise brushstroke that masterfully defines forms. Apply a natural and diffused light to create a subtle atmosphere and a sense of depth through aerial perspective. Use a sober and elegant color palette, dominated by earth tones, blacks, whites, and silvery grays, giving the scene the dignity and naturalism characteristic of the Spanish Golden Age.',
    sampleImage: require('../assets/images/Velazquez.png'),
    primaryColor: '#2F4F4F',
    secondaryColor: '#B8860B',
    gradientColors: ['#2F4F4F', '#708090', '#B8860B']
  },
  goya: {
    name: 'Goya',
    fullName: 'Francisco José de Goya y Lucientes',
    period: '1746-1828',
    description: 'Spanish romantic painter known for expressive brushwork and social commentary',
    characteristics: 'Expressive brushwork, dynamic composition, emotional depth',
    prompt: 'Convert this image into a painting by Francisco de Goya, highlighting a romantic style with an energetic and expressive brushstroke. Create a dramatic, often somber, atmosphere that emphasizes the emotional depth of the scene. Employ a color palette that can range from vibrant tones to earthy and deep blacks, depending on the emotional mood. The composition should be bold and the technique should feel free and painterly, reflecting the complexity of the human soul in the style of Spanish Romanticism.',
    sampleImage: require('../assets/images/Goya.png'),
    primaryColor: '#654321',
    secondaryColor: '#D2691E',
    gradientColors: ['#654321', '#8B4513', '#D2691E']
  },
  vangogh: {
    name: 'Van Gogh',
    fullName: 'Vincent Willem van Gogh',
    period: '1853-1890',
    description: 'Dutch post-impressionist known for vibrant colors and expressive brushstrokes',
    characteristics: 'Swirling brushstrokes, vibrant colors, emotional intensity',
    prompt: 'Interpret this photo in the post-impressionist style of Vincent van Gogh. Use swirling, short, and visible brushstrokes, applying the paint with a thick impasto technique to create a palpable texture. Employ a vibrant and bold color palette, such as intense yellows, deep blues, and emerald greens, to express a strong emotional charge. Give the scene a dynamic movement and a vibrant energy that captures the essence of his unique aesthetic.',
    sampleImage: require('../assets/images/VanGogh.png'), // Necesitarás añadir esta imagen
    primaryColor: '#4169E1',
    secondaryColor: '#FFD700',
    gradientColors: ['#4169E1', '#1E90FF', '#FFD700']
  },
  monet: {
    name: 'Monet',
    fullName: 'Oscar-Claude Monet',
    period: '1840-1926',
    description: 'French impressionist master of light, color, and atmospheric effects',
    characteristics: 'Impressionist technique, light effects, soft brushwork',
    prompt: 'Transform this photo into an impressionist painting by Claude Monet. Focus on capturing the fleeting effects of natural light with short, loose, and visible brushstrokes. Use a luminous and vibrant color palette, applying pure colors side-by-side to simulate the reflection of light. Soften the contours and create an ethereal atmosphere, as if the scene were viewed outdoors (\'en plein air\'), paying special attention to reflections in the water if any are present.',
    sampleImage: require('../assets/images/monet.png'), // Necesitarás añadir esta imagen
    primaryColor: '#87CEEB',
    secondaryColor: '#98FB98',
    gradientColors: ['#87CEEB', '#B0E0E6', '#98FB98']
  },
  sorolla: {
    name: 'Sorolla',
    fullName: 'Joaquín Sorolla y Bastida',
    period: '1863-1923',
    description: 'Spanish master of light and Mediterranean luminosity',
    characteristics: 'Brilliant light, Mediterranean colors, luminous technique',
    prompt: 'Convert this photograph into a painting by Joaquín Sorolla, flooding the scene with the bright, vibrant light of the Mediterranean sun. Use a loose and energetic brushstroke to capture the immediacy of the moment. Employ a luminous color palette dominated by dazzling whites, intense blues of the sea and sky, and warm sandy tones. The composition should reflect the joy and vitality of an outdoor scene, with special attention to sun reflections and movement.',
    sampleImage: require('../assets/images/sorolla.png'), // Necesitarás añadir esta imagen
    primaryColor: '#FFE4B5',
    secondaryColor: '#87CEFA',
    gradientColors: ['#FFE4B5', '#F0E68C', '#87CEFA']
  }
} as const;

export type ArtistStyle = keyof typeof ARTIST_STYLES; 