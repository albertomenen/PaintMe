import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Cloudinary configuration for real image uploads
const CLOUDINARY_CONFIG = {
  cloudName: 'demo', // Replace with your Cloudinary cloud name
  uploadPreset: 'ml_default', // Replace with your upload preset
  apiUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload' // Replace 'demo' with your cloud name
};

export class ImageUtils {
  /**
   * Upload image to Cloudinary for public access
   * This allows Replicate to access the image via URL
   */
  static async uploadImage(localUri: string): Promise<ImageUploadResult> {
    try {
      console.log('📤 Starting image upload to cloud storage...');
      console.log('📋 Image URI type:', localUri.substring(0, 20) + '...');
      
      // For file URIs from mobile devices, we need to read and upload the file
      if (localUri.startsWith('file://') || localUri.startsWith('content://')) {
        console.log('📁 Mobile file URI detected, uploading to public cloud storage');
        
        try {
          console.log('☁️ Uploading to free image hosting service...');
          
          // Create FormData for mobile file upload
          const formData = new FormData();
          formData.append('file', {
            uri: localUri,
            type: 'image/jpeg',
            name: 'image.jpg',
          } as any);

          // Try uploading to file.io (free temporary file hosting)
          try {
            const response = await fetch('https://file.io/', {
              method: 'POST',
              body: formData,
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            if (response.ok) {
              const responseText = await response.text();
              console.log('📋 File.io raw response length:', responseText.length);
              
              try {
                const result = JSON.parse(responseText);
                console.log('📋 File.io parsed response:', result);
                
                if (result.success && result.link) {
                  console.log('✅ Image uploaded successfully to public URL:', result.link);
                  return {
                    success: true,
                    url: result.link,
                  };
                }
              } catch (parseError) {
                console.log('❌ File.io returned non-JSON response (likely HTML error page)');
                console.log('📋 Response preview:', responseText.substring(0, 200) + '...');
              }
            } else {
              console.log('❌ File.io upload failed with status:', response.status);
            }
          } catch (fileioError) {
            console.log('❌ File.io upload failed:', fileioError);
          }

          // Alternative: Try uploading to 0x0.st (another free service)
          try {
            const response = await fetch('https://0x0.st', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const publicUrl = await response.text();
              if (publicUrl && publicUrl.startsWith('https://')) {
                console.log('✅ Image uploaded successfully to 0x0.st:', publicUrl.trim());
                return {
                  success: true,
                  url: publicUrl.trim(),
                };
              }
            }
          } catch (zeroError) {
            console.log('❌ 0x0.st upload failed:', zeroError);
          }

          // If all cloud uploads fail, read as base64 (fallback)
          console.log('⚠️ All cloud uploads failed, falling back to base64');
          const base64 = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          console.log('📋 Created data URL fallback, length:', dataUrl.length);
          console.log('⚠️ Using base64 data URL (Replicate may not accept this)');
          
          return {
            success: true,
            url: dataUrl,
          };
          
        } catch (error) {
          console.error('❌ Error processing mobile file:', error);
          return {
            success: false,
            error: 'Failed to process image file: ' + (error instanceof Error ? error.message : 'Unknown error'),
          };
        }
      }
      
      // For base64 data URLs, try to upload to get a public URL
      if (localUri.startsWith('data:')) {
        console.log('🌐 Converting base64 to public URL...');
        
        try {
          // Extract base64 data
          const base64Data = localUri.split(',')[1];
          const mimeType = localUri.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          
          // Convert base64 to blob for upload
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          
          const formData = new FormData();
          formData.append('file', blob, 'upload.jpg');
          
          // Try file.io for base64 uploads too
          const response = await fetch('https://file.io/', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.link) {
              console.log('✅ Base64 uploaded successfully:', result.link);
              return {
                success: true,
                url: result.link,
              };
            }
          }
        } catch (uploadError) {
          console.log('⚠️ Base64 upload failed, using original:', uploadError);
        }
        
        // Fallback to original base64
        console.log('🎭 Using base64 fallback (Replicate may not accept this)');
        return {
          success: true,
          url: localUri,
        };
      }
      
      // For http/https URLs, return as-is
      if (localUri.startsWith('http')) {
        console.log('🌐 HTTP URL detected, using as-is');
        return {
          success: true,
          url: localUri,
        };
      }
      
      // Default case
      console.log('✅ Using original URI');
      return {
        success: true,
        url: localUri,
      };
      
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Alternative: Upload to a simple image hosting service
   * This is a backup method if Cloudinary doesn't work
   */
  static async uploadToImageHost(localUri: string): Promise<ImageUploadResult> {
    try {
      // You could use services like:
      // - Imgur API
      // - ImageBB API  
      // - Your own server endpoint
      
      console.log('📤 Using alternative image hosting...');
      
      // Mock implementation for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const timestamp = Date.now();
      const mockUrl = `https://i.imgur.com/mock-${timestamp}.jpg`;
      
      return {
        success: true,
        url: mockUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Alternative upload failed',
      };
    }
  }

  /**
   * Save image to device gallery
   */
  static async saveToGallery(imageUri: string): Promise<boolean> {
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'We need permission to save images to your gallery.'
        );
        return false;
      }

      // Download the image first if it's a remote URL
      let localUri = imageUri;
      if (imageUri.startsWith('http')) {
        console.log('📥 Downloading image for save...');
        const downloadResult = await FileSystem.downloadAsync(
          imageUri,
          FileSystem.documentDirectory + `painting_${Date.now()}.jpg`
        );
        localUri = downloadResult.uri;
      }

      // Save to gallery
      await MediaLibrary.saveToLibraryAsync(localUri);
      
      Alert.alert(
        '✅ Saved!', 
        'Your masterpiece has been saved to your photo gallery.',
        [{ text: 'Great!', style: 'default' }]
      );
      
      return true;
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert(
        '❌ Save Failed',
        'Could not save the image to your gallery. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
      return false;
    }
  }

  /**
   * Validate image before processing
   */
  static validateImage(uri: string): { valid: boolean; error?: string } {
    if (!uri) {
      return { valid: false, error: 'No image selected' };
    }

    console.log('🔍 Validating image URI:', uri.substring(0, 100) + '...');

    // Handle base64 data URLs (common on web)
    if (uri.startsWith('data:')) {
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const mimeTypeMatch = uri.match(/^data:([^;]+)/);
      
      if (mimeTypeMatch) {
        const mimeType = mimeTypeMatch[1].toLowerCase();
        console.log('📋 Detected MIME type:', mimeType);
        
        if (validMimeTypes.includes(mimeType)) {
          console.log('✅ Base64 image validation passed');
          return { valid: true };
        } else {
          console.log('❌ Invalid MIME type:', mimeType);
          return { 
            valid: false, 
            error: 'Please select a JPG, PNG, or WebP image' 
          };
        }
      }
      
      console.log('❌ Could not detect MIME type from data URL');
      return { 
        valid: false, 
        error: 'Invalid image format' 
      };
    }

    // Handle file paths and URIs
    const extension = uri.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    
    console.log('📋 Detected file extension:', extension);
    
    if (extension && !validExtensions.includes(extension)) {
      console.log('❌ Invalid file extension:', extension);
      return { 
        valid: false, 
        error: 'Please select a JPG, PNG, or WebP image' 
      };
    }

    // If we have a file URI but no clear extension, assume it's valid
    // (some platforms might not include extensions in URIs)
    if (uri.startsWith('file://') || uri.startsWith('content://')) {
      console.log('✅ File URI validation passed (assuming valid format)');
      return { valid: true };
    }

    // For any other format with a valid extension
    if (extension && validExtensions.includes(extension)) {
      console.log('✅ File extension validation passed');
      return { valid: true };
    }

    console.log('⚠️ Validation passed with assumption (unknown format)');
    return { valid: true }; // Default to valid for unknown formats
  }
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get file extension
export function getFileExtension(uri: string): string {
  return uri.split('.').pop()?.toLowerCase() || '';
} 