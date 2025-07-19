export const Config = {
  REPLICATE_API_TOKEN: process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN || 'r8_LcGPhYyycC6TH0ZEs0TUp4NAvfGepH51olaSW',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vvzxthzeuqhwasortjhc.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2enh0aHpldXFod2Fzb3J0amhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MzMwMzQsImV4cCI6MjA2ODQwOTAzNH0.hf6FtjbPKoKh7cffZpB04yg3q-LKgUgF-HDcnGXesyk',
  STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'your_stripe_publishable_key_here',
};

// Debug logging (remove in production)
if (__DEV__) {
  console.log('🔧 Config Debug:', {
    SUPABASE_URL: Config.SUPABASE_URL,
    SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY ? `${Config.SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET',
    REPLICATE_TOKEN: Config.REPLICATE_API_TOKEN ? `${Config.REPLICATE_API_TOKEN.substring(0, 10)}...` : 'NOT SET',
  });
}

export const ARTIST_STYLES = {
  caravaggio: {
    name: 'Caravaggio',
    fullName: 'Michelangelo Merisi da Caravaggio',
    period: '1571-1610',
    description: 'Master of dramatic chiaroscuro lighting and intense emotional realism',
    characteristics: 'Dramatic lighting, deep shadows, emotional intensity',
    prompt: 'Transform this into a Caravaggio painting with dramatic chiaroscuro lighting, strong contrast between light and dark, deep shadows, warm golden light, baroque style, oil painting technique, rich earth tones, and intense emotional expression',
    sampleImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Caravaggio_-_Bacco_adolescente_-_Google_Art_Project.jpg/800px-Caravaggio_-_Bacco_adolescente_-_Google_Art_Project.jpg',
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
    prompt: 'Transform this into a Velázquez painting with royal court style, sophisticated realism, subtle atmospheric perspective, soft diffused lighting, muted color palette, Spanish Golden Age technique, fine brushwork, and elegant composition',
    sampleImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Diego_Vel%C3%A1zquez_Autorretrato_45_x_38_cm_-_Colecci%C3%B3n_Real_Academia_de_Bellas_Artes_de_San_Carlos_-_Museo_de_Bellas_Artes_de_Valencia.jpg/800px-Diego_Vel%C3%A1zquez_Autorretrato_45_x_38_cm_-_Colecci%C3%B3n_Real_Academia_de_Bellas_Artes_de_San_Carlos_-_Museo_de_Bellas_Artes_de_Valencia.jpg',
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
    prompt: 'Transform this into a Goya painting with expressive brushwork, romantic style, dark atmospheric mood, dramatic emotions, loose painterly technique, rich textures, bold composition, and Spanish romantic period aesthetics',
    sampleImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Goya_Autoretrato_%281815%29.jpg/800px-Goya_Autoretrato_%281815%29.jpg',
    primaryColor: '#654321',
    secondaryColor: '#D2691E',
    gradientColors: ['#654321', '#8B4513', '#D2691E']
  }
} as const;

export type ArtistStyle = keyof typeof ARTIST_STYLES; 