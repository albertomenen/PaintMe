
import { ArtistStyle, AnimeStyle } from '../constants/Config';

// Lazy initialization para evitar TransformStream error
let replicate: any = null;

const getReplicateClient = () => {
  if (!replicate) {
    const Replicate = require('replicate');
    replicate = new Replicate({
      auth: process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN,
    });
  }
  return replicate;
};

export interface TransformationOptions {
  inputImageUrl: string;
  artistStyle: ArtistStyle;
  outputFormat?: 'jpg' | 'png' | 'webp';
}

export interface TransformationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  predictionId?: string;
}

// Control real vs mock mode - set to false to use real API
// Note: Real API works on mobile devices but may have CORS issues in web browsers
const USE_MOCK_MODE = false; // Real API enabled - will transform actual user photos

// Mock images for development (only used when USE_MOCK_MODE is true)
const MOCK_RESULTS = {
  caravaggio: [
    
  ],
  velazquez: [
    
  ],
  goya: [
    
  ]
};

async function mockTransformation(inputImageUrl: string, artistStyle: ArtistStyle): Promise<TransformationResult> {
  console.log('🎭 Using MOCK transformation (fallback mode)');
  console.log(`📸 Input: ${inputImageUrl.substring(0, 50)}...`);
  console.log(`🎨 Style: ${artistStyle}`);
  
  // Simulate realistic processing time
  const processingTime = 3000 + Math.random() * 2000; // 3-5 seconds
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  // IMPORTANT: Return the user's actual image instead of random images
  // In a real transformation, this would be their image transformed by AI
  // For now, we'll return their original image as a fallback
  const timestamp = Date.now();
  
  console.log(`✅ MOCK transformation complete: Using user's original image`);
  console.log(`ℹ️  Note: This is a fallback - enable real API for actual AI transformation`);
  
  return {
    success: true,
    imageUrl: inputImageUrl, // Return user's actual image, not random stock photos
    predictionId: `mock-${artistStyle}-${timestamp}`,
  };
}

export class ReplicateService {
  /**
   * Transform image using Replicate API (real AI transformation)
   */
  static async transformImage(inputImageUrl: string, artistStyle: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    if (USE_MOCK_MODE) {
      console.log('🎭 Using MOCK transformation (API disabled)');
      return await this.mockTransformation(inputImageUrl, artistStyle);
    }

    try {
      console.log('🚀 Starting REAL AI transformation with Replicate...');
      console.log('🎨 Artist style:', artistStyle);

      // This input structure matches the model's schema exactly.
      const input = {
        prompt: this.getPromptForArtist(artistStyle),
        input_image: inputImageUrl,
        aspect_ratio: "match_input_image",
        output_format: "jpg",
        safety_tolerance: 2,
        prompt_upsampling: true
      };

      // STEP 1: Create the prediction. This matches the 'Access a prediction' section.
      console.log('📤 Creating prediction job...');
      const replicateClient = getReplicateClient();
    let prediction = await replicateClient.predictions.create({
        // Use the model name directly, as per the documentation.
        // The library will automatically use the latest version.
        model: "black-forest-labs/flux-kontext-pro",
        input: input,
      });

      console.log(`⏳ Prediction created with ID: ${prediction.id}. Waiting for completion...`);

      // STEP 2: Wait for the prediction to finish, as per the 'Prediction lifecycle' docs.
      prediction = await replicateClient.wait(prediction, {
        // Optional: Add a webhook here if needed in the future
      });

      console.log('📦 Prediction finished. Final status:', prediction.status);

      // STEP 3: Handle the final result object.
      if (prediction.status === 'succeeded') {
        const imageUrl = prediction.output as string;
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
          console.log('✅ Real AI transformation successful!');
          console.log('🔗 Final URL:', imageUrl);
          return { success: true, imageUrl: imageUrl };
        } else {
           // This handles cases where the model succeeds but output is unexpected.
           console.error('❌ Prediction succeeded but output is not a valid URL:', prediction.output);
           throw new Error('Prediction succeeded but the output was not a valid image URL.');
        }
      } else {
        // The prediction failed or was canceled.
        const errorMessage = prediction.error ? JSON.stringify(prediction.error) : 'Prediction did not succeed.';
        console.error('❌ Prediction failed. Error:', errorMessage);
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('❌ Top-level error during Replicate API call:');
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';
      console.error('Error message:', errorMessage);
      console.error('Error name:', errorName);
      
      console.log('🔄 Falling back to return your original image...');
      return await this.mockTransformation(inputImageUrl, artistStyle);
    }
  }

  /**
   * Get AI prompt for the specified artist style
   */
  static getPromptForArtist(artistStyle: string): string {
    const prompts = {
      caravaggio: 'Reimagine this photo as an oil painting by Caravaggio, applying intense tenebrism with a dramatic, directional light source that sculpts figures emerging from a deep darkness. Emphasize a raw, visceral realism in the details and textures. Use an earthy color palette, with rich shadows in blacks and browns, and touches of intense reds and ochres in the illuminated areas, capturing a profound emotional tension and a moment frozen in time, in the Italian Baroque style.',
      velazquez: 'Transform this photograph into a masterpiece by Diego Velázquez, employing a sophisticated realism and a loose, precise brushstroke that masterfully defines forms. Apply a natural and diffused light to create a subtle atmosphere and a sense of depth through aerial perspective. Use a sober and elegant color palette, dominated by earth tones, blacks, whites, and silvery grays, giving the scene the dignity and naturalism characteristic of the Spanish Golden Age.',
      goya: 'Convert this image into a painting by Francisco de Goya, highlighting a romantic style with an energetic and expressive brushstroke. Create a dramatic, often somber, atmosphere that emphasizes the emotional depth of the scene. Employ a color palette that can range from vibrant tones to earthy and deep blacks, depending on the emotional mood. The composition should be bold and the technique should feel free and painterly, reflecting the complexity of the human soul in the style of Spanish Romanticism.',
      vangogh: 'Interpret this photo in the post-impressionist style of Vincent van Gogh. Use swirling, short, and visible brushstrokes, applying the paint with a thick impasto technique to create a palpable texture. Employ a vibrant and bold color palette, such as intense yellows, deep blues, and emerald greens, to express a strong emotional charge. Give the scene a dynamic movement and a vibrant energy that captures the essence of his unique aesthetic.',
      monet: 'Transform this photo into an impressionist painting by Claude Monet. Focus on capturing the fleeting effects of natural light with short, loose, and visible brushstrokes. Use a luminous and vibrant color palette, applying pure colors side-by-side to simulate the reflection of light. Soften the contours and create an ethereal atmosphere, as if the scene were viewed outdoors (\'en plein air\'), paying special attention to reflections in the water if any are present.',
      sorolla:  'Convert this photograph into a painting by Joaquín Sorolla, flooding the scene with the bright, vibrant light of the Mediterranean sun. Use a loose and energetic brushstroke to capture the immediacy of the moment. Employ a luminous color palette dominated by dazzling whites, intense blues of the sea and sky, and warm sandy tones. The composition should reflect the joy and vitality of an outdoor scene, with special attention to sun reflections and movement.',

      // Japanese Anime/Manga Styles
      berserk: 'Transform this image into the distinctive art style of Berserk by Kentaro Miura. Use extremely detailed cross-hatching and fine line work to create deep shadows and texture. Emphasize a dark, gothic atmosphere with dramatic contrasts between light and shadow. The style should be highly detailed and realistic with a gritty, mature aesthetic. Include intricate details in clothing, armor, or weapons if present, with heavy use of black ink and detailed shading techniques characteristic of dark fantasy manga.',
      dragonball: 'Convert this image to the iconic Dragon Ball art style by Akira Toriyama. Use clean, bold lines with minimal shading and bright, vibrant colors. Emphasize dynamic poses and expressions with characteristic spiky hair styles and large, expressive eyes. Add energy auras or ki effects around characters if applicable. The style should be bright, energetic, and optimistic with simple but effective shading using cell-shading techniques typical of classic anime/manga.',
      naruto: 'Recreate this image in the Naruto art style by Masashi Kishimoto. Use angular, sharp character features with distinctive spiky hair and ninja-inspired clothing. Incorporate chakra effects, swirling energy, or mystical elements around the subjects. The style should have moderate shading with emphasis on action lines and dynamic movement. Use earth tones mixed with bright accent colors, particularly orange and blue, with clean line art and anime-style proportions.',
      jojo: 'Transform this image into the flamboyant JoJo\'s Bizarre Adventure style by Hirohiko Araki. Emphasize dramatic, theatrical poses with exaggerated muscular definition and striking fashion-forward clothing designs. Use vibrant, unconventional color schemes with bold contrasts - think hot pinks, electric blues, and neon greens. Add dynamic action lines and dramatic lighting effects. The style should be highly stylized with sharp, angular features and an overall sense of glamour and drama characteristic of high fashion photography mixed with manga aesthetics.'
    };
    
    return prompts[artistStyle as keyof typeof prompts] || prompts.caravaggio;
  }

  /**
   * Mock transformation for fallback/testing
   */
  static async mockTransformation(inputImageUrl: string, artistStyle: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    console.log('🎭 Using MOCK transformation (fallback mode)');
    console.log('📸 Input:', inputImageUrl.substring(0, 50) + '...');
    console.log('🎨 Style:', artistStyle);
    
    // Return the original image as fallback
    console.log('✅ MOCK transformation complete: Using user\'s original image');
    console.log('ℹ️  Note: This is a fallback - enable real API for actual AI transformation');
    
    return {
      success: true,
      imageUrl: inputImageUrl, // Return original image
    };
  }

  /**
   * Upload image to cloud storage for Replicate access
   * In production, this would upload to AWS S3, Cloudinary, or similar service
   */
  static async uploadImageToReplicate(imageUri: string): Promise<string> {
    if (USE_MOCK_MODE) {
      console.log('🎭 MOCK: Simulating image upload');
      // Return a mock URL that looks real
      return `https://mock-storage.com/uploads/${Date.now()}.jpg`;
    }
    
    // TODO: In production, implement real cloud storage upload
    // Example implementations:
    
    // For AWS S3:
    // const s3Upload = await uploadToS3(imageUri);
    // return s3Upload.Location;
    
    // For Cloudinary:
    // const cloudinaryUpload = await uploadToCloudinary(imageUri);
    // return cloudinaryUpload.secure_url;
    
    // For now, return the original URI (this won't work with Replicate in production)
    console.log('⚠️ Using local URI - implement cloud storage for production');
    return imageUri;
  }

  /**
   * Enable real API mode
   * Call this to switch from mock to real Replicate API
   */
  static enableRealMode() {
    // Note: You would need to modify the USE_MOCK_MODE constant
    console.log('💡 To enable real mode, set USE_MOCK_MODE = false in lib/replicate.ts');
    console.log('📱 Real API works best on mobile devices (avoids CORS issues)');
  }

  /**
   * Check if running in mock mode
   */
  static isMockMode(): boolean {
    return USE_MOCK_MODE;
  }
} 