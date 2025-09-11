# 🎨 PaintMe - AI Art Transformation App

Transform your photos into classical masterpieces in the style of legendary artists like Caravaggio, Velázquez, and Goya using AI.

## ✨ Features

- **🎭 Artist Styles**: Transform images in the style of famous classical painters
- **📱 Mobile-First Design**: Beautiful, responsive design optimized for iOS
- **🔐 Authentication**: Secure user registration and login with Supabase
- **💰 Credit System**: Freemium model with 1 free transformation, then pay-per-use
- **🖼️ Gallery**: View and manage your artistic transformations
- **💾 Save & Share**: Download transformed images to your device
- **⚡ Real-time Processing**: Live status updates during image transformation

## 🎨 Available Artist Styles

### Caravaggio (1571-1610)
- **Style**: Dramatic chiaroscuro lighting and intense emotional realism
- **Characteristics**: Deep shadows, dramatic lighting, emotional intensity

### Velázquez (1599-1660)
- **Style**: Spanish master of royal portraiture and sophisticated realism
- **Characteristics**: Subtle lighting, masterful technique, sophisticated composition

### Goya (1746-1828)
- **Style**: Expressive brushwork and social commentary
- **Characteristics**: Dynamic composition, bold strokes, emotional depth

## 🚀 Tech Stack

- **Frontend**: React Native with Expo
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **AI Processing**: Replicate API (Flux Kontext Pro)
- **Payments**: Stripe (configured for future implementation)
- **Storage**: Supabase Storage (for production)
- **UI/UX**: React Native with custom gradients, blur effects, and haptic feedback

## 📱 Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for development)
- Supabase account
- Replicate account

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/paintme.git
   cd paintme
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase Database**
   
   Go to your [Supabase Dashboard](https://supabase.com/dashboard) and run these SQL commands:

   ```sql
   -- Create users table
   CREATE TABLE public.users (
     id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
     email TEXT NOT NULL,
     credits INTEGER DEFAULT 1,
     total_transformations INTEGER DEFAULT 0,
     favorite_artist TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create transformations table
   CREATE TABLE public.transformations (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
     original_image_url TEXT NOT NULL,
     transformed_image_url TEXT,
     artist_style TEXT NOT NULL,
     status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable Row Level Security
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.transformations ENABLE ROW LEVEL SECURITY;

   -- Create policies for users table
   CREATE POLICY "Users can view own profile" ON public.users
     FOR SELECT USING (auth.uid() = id);

   CREATE POLICY "Users can update own profile" ON public.users
     FOR UPDATE USING (auth.uid() = id);

   CREATE POLICY "Users can insert own profile" ON public.users
     FOR INSERT WITH CHECK (auth.uid() = id);

   -- Create policies for transformations table
   CREATE POLICY "Users can view own transformations" ON public.transformations
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own transformations" ON public.transformations
     FOR INSERT WITH CHECK (auth.uid() = user_id);

   CREATE POLICY "Users can update own transformations" ON public.transformations
     FOR UPDATE USING (auth.uid() = user_id);

   -- Create function to automatically create user profile
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, credits, total_transformations)
     VALUES (NEW.id, NEW.email, 1, 0);
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Create trigger for new user creation
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

4. **Configure Environment Variables**
   
   Update `constants/Config.ts` with your actual API keys:
   ```typescript
   export const Config = {
     REPLICATE_API_TOKEN: 'your_replicate_token_here',
     SUPABASE_URL: 'https://vvzxthzeuqhwasortjhc.supabase.co',
     SUPABASE_ANON_KEY: 'your_supabase_anon_key_here',
     STRIPE_PUBLISHABLE_KEY: 'your_stripe_key_here', // For future payments
   };
   ```

5. **Get API Keys**

   **Replicate API:**
   - Sign up at [Replicate](https://replicate.com)
   - Go to Account Settings → API Tokens
   - Create a new token and copy it

   **Supabase:**
   - Project URL and Anon Key are in your project settings
   - Already configured with your provided credentials

6. **Start the development server**
   ```bash
   npm start
   ```

7. **Run on iOS Simulator**
   - Press `i` in the Expo CLI
   - Or scan the QR code with Expo Go app

## 📁 Project Structure

```
PaintMe/
├── app/                          # App screens (Expo Router)
│   ├── (auth)/                  # Authentication screens
│   │   ├── login.tsx           # Login screen
│   │   ├── signup.tsx          # Signup screen
│   │   └── _layout.tsx         # Auth layout
│   ├── (tabs)/                 # Main app tabs
│   │   ├── index.tsx           # Transform screen
│   │   ├── gallery.tsx         # Gallery screen
│   │   ├── profile.tsx         # Profile screen
│   │   └── _layout.tsx         # Tabs layout
│   └── _layout.tsx             # Root layout
├── components/                  # Reusable components
├── constants/                   # App constants and config
│   └── Config.ts               # API keys and artist styles
├── hooks/                      # Custom React hooks
│   └── useUser.ts             # User and auth management
├── lib/                        # Utility libraries
│   ├── supabase.ts            # Supabase client
│   ├── replicate.ts           # Replicate API service
│   └── imageUtils.ts          # Image handling utilities
└── assets/                     # Images and fonts
```

## 🎮 Usage

1. **Sign Up/Login**: Create an account or sign in with existing credentials
2. **Upload Photo**: Choose from gallery or take a new photo
3. **Select Artist**: Pick from Caravaggio, Velázquez, or Goya
4. **Transform**: Watch as AI creates your masterpiece
5. **Save & Share**: Download your transformed artwork

## 💰 Monetization

- **Free Trial**: 1 free transformation for new users
- **Pay-per-Transform**: Purchase credits for additional transformations
- **Credit Packages**:
  - 5 transformations - $5.99
  - 15 transformations - $14.99 (Popular)
  - 30 transformations - $19.99

## 🔒 Security Features

- **Row Level Security**: Database-level security with Supabase RLS
- **User Authentication**: Secure JWT-based authentication
- **Input Validation**: Client and server-side validation
- **API Rate Limiting**: Prevent abuse of transformation API

## 🚀 Future Enhancements

- [ ] **More Artists**: Add Renaissance, Impressionist, and Modern artists
- [ ] **Batch Processing**: Transform multiple images at once
- [ ] **Social Features**: Share and like transformations
- [ ] **Custom Styles**: Train custom artist styles
- [ ] **Android Support**: Expand to Android platform
- [ ] **Subscription Model**: Monthly unlimited plans
- [ ] **Print Service**: Order physical prints of transformations

## 📊 Performance Optimizations

- **Image Compression**: Automatic image optimization before upload
- **Caching**: Intelligent caching of transformed images
- **Progressive Loading**: Smooth loading states and transitions
- **Memory Management**: Efficient image memory handling
- **Offline Support**: Cache transformations for offline viewing

## 🐛 Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure RLS policies are correctly set up in Supabase
   - Check that user authentication is working

2. **Image upload fails**
   - Verify Replicate API token is correct
   - Check image file size and format

3. **Transformation stuck**
   - Check Replicate API status
   - Verify internet connection

### Debug Mode

Enable detailed logging by adding to your config:
```typescript
export const DEBUG = __DEV__;
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Artist References**: Classical paintings from Wikimedia Commons
- **AI Model**: Flux Kontext Pro by Black Forest Labs via Replicate
- **Design Inspiration**: Classical art museums and galleries
- **Icons**: Ionicons by Ionic Framework

## 📞 Support

For support, email [support@paintme.app](mailto:support@paintme.app) or create an issue in this repository.

---

**Made with ❤️ by the PaintMe Team**

Transform your memories into timeless art! 🎨✨
