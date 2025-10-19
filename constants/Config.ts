export const Config = {
  REPLICATE_API_TOKEN: process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN ,
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
    sampleImage: require('../assets/images/Caravaggio2.png'),
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
    sampleImage: require('../assets/images/Vangohg2.png'), 
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
    sampleImage: require('../assets/images/monet2.png'),
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
    sampleImage: require('../assets/images/sorolla2.png'), // Necesitarás añadir esta imagen
    primaryColor: '#FFE4B5',
    secondaryColor: '#87CEFA',
    gradientColors: ['#FFE4B5', '#F0E68C', '#87CEFA']
  }
} as const;

export const ANIME_STYLES = {
  berserk: {
    name: 'Kentaro Miura',
    fullName: 'Kentaro Miura Style',
    period: '1989-2021',
    description: 'Dark fantasy manga with incredibly detailed artwork and gothic atmosphere',
    characteristics: 'Intricate cross-hatching, dark themes, detailed armor and weapons',
    prompt: 'Transform this image into the distinctive art style of Berserk by Kentaro Miura. Use extremely detailed cross-hatching and fine line work to create deep shadows and texture. Emphasize a dark, gothic atmosphere with dramatic contrasts between light and shadow. The style should be highly detailed and realistic with a gritty, mature aesthetic. Include intricate details in clothing, armor, or weapons if present, with heavy use of black ink and detailed shading techniques characteristic of dark fantasy manga.',
    sampleImage: require('../assets/images/berserk.png'),
    primaryColor: '#2C2C2C',
    secondaryColor: '#8B0000',
    gradientColors: ['#000000', '#2C2C2C', '#8B0000']
  },
  dragonball: {
    name: 'Toriyama',
    fullName: 'Akira Toriyama Style',
    period: '1984-1995',
    description: 'Clean, dynamic manga style with distinctive character designs and energy effects',
    characteristics: 'Clean lines, spiky hair, dynamic poses, energy auras',
    prompt: 'Convert this image to the iconic Dragon Ball art style by Akira Toriyama. Use clean, bold lines with minimal shading and bright, vibrant colors. Emphasize dynamic poses and expressions with characteristic spiky hair styles and large, expressive eyes. Add energy auras or ki effects around characters if applicable. The style should be bright, energetic, and optimistic with simple but effective shading using cell-shading techniques typical of classic anime/manga.',
    sampleImage: require('../assets/images/dragonballstyle.png'),
    primaryColor: '#FF8C00',
    secondaryColor: '#1E90FF',
    gradientColors: ['#FF8C00', '#FFD700', '#1E90FF']
  },
  naruto: {
    name: 'Masashi',
    fullName: 'Masashi Kishimoto Style',
    period: '1999-2014',
    description: 'Ninja-themed manga with distinctive character designs and jutsu effects',
    characteristics: 'Angular features, ninja aesthetics, chakra effects, detailed hand signs',
    prompt: 'Recreate this image in the Naruto art style by Masashi Kishimoto. Use angular, sharp character features with distinctive spiky hair and ninja-inspired clothing. Incorporate chakra effects, swirling energy, or mystical elements around the subjects. The style should have moderate shading with emphasis on action lines and dynamic movement. Use earth tones mixed with bright accent colors, particularly orange and blue, with clean line art and anime-style proportions.',
    sampleImage: require('../assets/images/naruto.png'),
    primaryColor: '#FF4500',
    secondaryColor: '#4169E1',
    gradientColors: ['#FF4500', '#FFA500', '#4169E1']
  },
  jojo: {
    name: 'Hiroiko ',
    fullName: 'Hirohiko Araki Style',
    period: '1987-present',
    description: 'Flamboyant, muscular art style with dramatic poses and vibrant colors',
    characteristics: 'Exaggerated muscles, dramatic poses, vibrant colors, fashion-forward designs',
    prompt: 'Transform this image into the flamboyant JoJo\'s Bizarre Adventure style by Hirohiko Araki. Emphasize dramatic, theatrical poses with exaggerated muscular definition and striking fashion-forward clothing designs. Use vibrant, unconventional color schemes with bold contrasts - think hot pinks, electric blues, and neon greens. Add dynamic action lines and dramatic lighting effects. The style should be highly stylized with sharp, angular features and an overall sense of glamour and drama characteristic of high fashion photography mixed with manga aesthetics.',
    sampleImage: require('../assets/images/jojo.png'),
    primaryColor: '#FF1493',
    secondaryColor: '#00CED1',
    gradientColors: ['#FF1493', '#9932CC', '#00CED1']
  },
  anime: {
    name: 'Anime',
    fullName: 'Modern Anime Style',
    period: 'Contemporary',
    description: 'Modern webtoon and vibrant anime style with professional quality',
    characteristics: 'Clean line art, smooth gradients, expressive features, cinematic lighting',
    prompt: 'Transform the person in the input image into a high-quality, professional anime character. **Style:** Modern webtoon and vibrant anime style. The artwork should be a digital painting with clean, crisp line art, smooth gradients, and expressive features. The lighting should be professional and cinematic, creating a sense of depth. **Subject:** Faithfully capture the subject\'s key features, facial structure, hair color, and expression from the original photo, but reinterpret them in the specified anime style. **Quality:** Masterpiece, best quality, extremely detailed, high resolution. **Avoid:** Do not create a realistic or photorealistic image. Avoid 3D rendering, blurry or painterly styles, distorted anatomy, and watermarks.',
    sampleImage: require('../assets/images/anime.png'),
    primaryColor: '#FF69B4',
    secondaryColor: '#00CED1',
    gradientColors: ['#FF69B4', '#9932CC', '#00CED1']
  }
} as const;

export type ArtistStyle = keyof typeof ARTIST_STYLES;
export type AnimeStyle = keyof typeof ANIME_STYLES; 