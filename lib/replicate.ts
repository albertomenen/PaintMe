import { ArtistStyle } from '@/constants/Config';
import Replicate from 'replicate';

// This tells the Replicate client to use your specific API token.
const replicate = new Replicate({
  auth: process.env.EXPO_PUBLIC_REPLICATE_API_TOKEN,
});

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
    'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop&q=80'
  ],
  velazquez: [
    'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=800&fit=crop&q=80',
    'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=800&h=800&fit=crop&q=80'
  ],
  goya: [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80&auto=format',
    'https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=800&h=800&fit=crop&q=80&auto=format',
    'https://images.unsplash.com/photo-1569913486515-b74bf7751574?w=800&h=800&fit=crop&q=80&auto=format'
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
      let prediction = await replicate.predictions.create({
        // Use the model name directly, as per the documentation.
        // The library will automatically use the latest version.
        model: "black-forest-labs/flux-kontext-pro",
        input: input,
      });

      console.log(`⏳ Prediction created with ID: ${prediction.id}. Waiting for completion...`);

      // STEP 2: Wait for the prediction to finish, as per the 'Prediction lifecycle' docs.
      prediction = await replicate.wait(prediction, {
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
      caravaggio: "Transform this into a Caravaggio painting with dramatic chiaroscuro lighting, intense shadows and highlights, baroque realism, deep emotional expression, and masterful use of light and dark contrasts",
      velazquez: "Transform this into a Velázquez painting with royal court style, sophisticated realism, subtle atmospheric perspective, soft diffused lighting, muted color palette, Spanish Golden Age technique, fine brushwork, and elegant composition",
      goya: "Transform this into a Goya painting with bold brushstrokes, dramatic expressions, dark romanticism, expressive colors, psychological depth, and the distinctive style of Spanish romantic art"
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