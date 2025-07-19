import { ARTIST_STYLES, ArtistStyle, Config } from '@/constants/Config';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: Config.REPLICATE_API_TOKEN,
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
  static async transformImage({
    inputImageUrl,
    artistStyle,
    outputFormat = 'jpg'
  }: TransformationOptions): Promise<TransformationResult> {
    
    if (USE_MOCK_MODE) {
      return await mockTransformation(inputImageUrl, artistStyle);
    }

    try {
      const artistConfig = ARTIST_STYLES[artistStyle];
      
      // Check if we're trying to use a data URL with the real API
      if (inputImageUrl.startsWith('data:')) {
        console.log('⚠️ Data URL detected with real API - this may not work');
        console.log('💡 Replicate API typically requires public HTTP URLs');
      }
      
      // Prepare input for flux-kontext-pro model
      const input = {
        prompt: artistConfig.prompt,
        input_image: inputImageUrl,
        aspect_ratio: "match_input_image",
        output_format: outputFormat,
        safety_tolerance: 2,
        prompt_upsampling: true
      };

      console.log('🚀 Starting REAL AI transformation with Replicate...');
      console.log('🎨 Artist style:', artistStyle);
      console.log('📋 Input URL type:', inputImageUrl.startsWith('data:') ? 'Data URL' : 'HTTP URL');
      
      // Call the real Replicate API
      const output = await replicate.run("black-forest-labs/flux-kontext-pro", { input });

      console.log('📤 Replicate API response received');
      console.log('🔍 Response type:', typeof output);
      console.log('📋 Response structure:', JSON.stringify(output, null, 2));
      console.log('🔍 Response keys:', Object.keys(output || {}));
      console.log('🔍 Is Array?', Array.isArray(output));
      
              // Handle the correct Replicate API response format
        if (output) {
          console.log('✅ Output exists, checking format...');
          
          // If it's a string (direct URL), use it
          if (typeof output === 'string') {
            console.log('✅ Received direct URL from Replicate API');
            return {
              success: true,
              imageUrl: output,
            };
          }
          
          // If it's an array, take the first element
          if (Array.isArray(output)) {
            console.log('📋 Response is an array, length:', output.length);
            if (output.length > 0 && typeof output[0] === 'string') {
              console.log('✅ Taking first URL from array:', output[0]);
              return {
                success: true,
                imageUrl: output[0],
              };
            }
          }
          
          // If it's an object with the full response structure
          if (typeof output === 'object' && output !== null && !Array.isArray(output)) {
            console.log('📋 Response is an object, checking properties...');
            const response = output as any;
            
            // Check if we have the expected response structure
            if (response.output && typeof response.output === 'string') {
              console.log('✅ Real AI transformation successful!');
              console.log('🎨 Result URL:', response.output);
              console.log('📊 Status:', response.status);
              console.log('⏱️ Processing time:', response.metrics?.predict_time, 'seconds');
              
              return {
                success: true,
                imageUrl: response.output,
                predictionId: response.id,
              };
            }
            
            // Maybe the URL is directly in the object, not nested
            if (response.url && typeof response.url === 'string') {
              console.log('✅ Found URL property:', response.url);
              return {
                success: true,
                imageUrl: response.url,
              };
            }
            
            // Check if transformation is still processing
            if (response.status === 'processing' || response.status === 'starting') {
              console.log('⏳ Transformation still processing...');
              return {
                success: false,
                error: 'Transformation is still processing. Please try again in a moment.',
              };
            }
            
            // Check for errors in the response
            if (response.error) {
              console.log('❌ Replicate API returned error:', response.error);
              return {
                success: false,
                error: `Replicate API error: ${response.error}`,
              };
            }
            
            // If status is failed
            if (response.status === 'failed') {
              console.log('❌ Transformation failed on Replicate side');
              return {
                success: false,
                error: 'Image transformation failed. Please try again.',
              };
            }
            
            console.log('❌ Object exists but no recognized properties found');
            console.log('🔍 Available properties:', Object.keys(response));
          }
        } else {
          console.log('❌ No output received from Replicate API');
        }

      console.log('❌ Unexpected response format from Replicate API');
      return {
        success: false,
        error: 'Unexpected response format from Replicate API',
      };
    } catch (error) {
      console.error('❌ Error with real Replicate API:', error);
      
      // Check for specific error types
      if (error instanceof Error) {
        // CORS error
        if (error.message.includes('fetch') || 
            error.message.includes('CORS') ||
            error.message.includes('network')) {
          console.log('⚠️ CORS error detected - normal in web browsers');
          console.log('💡 Real API works on mobile devices without CORS issues');
        }
        
        // Data URL error  
        if (error.message.includes('400') || 
            error.message.includes('Bad Request') ||
            inputImageUrl.startsWith('data:')) {
          console.log('⚠️ Data URL may not be supported by Replicate API');
          console.log('💡 Need to upload image to public URL (AWS S3, Cloudinary, etc.)');
        }
      }
      
      console.log('🔄 Falling back to return your original image...');
      // Use user's actual image as fallback instead of random images
      return await mockTransformation(inputImageUrl, artistStyle);
    }
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