import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { ARTIST_STYLES, ArtistStyle } from '@/constants/Config';
import { useUser } from '@/hooks/useUser';
import { ImageUtils } from '@/lib/imageUtils';
import { ReplicateService } from '@/lib/replicate';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const IMAGE_SIZE = Math.min(width - 48, 300);

export default function TransformScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistStyle | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { user, canTransform, hasCredits, updateCredits, addTransformation, updateTransformation, loading } = useUser();

  // Debug user state
  console.log('🔍 Transform Screen Debug:', {
    userExists: !!user,
    userEmail: user?.email,
    loading: loading,
    canTransform: canTransform(),
    hasCredits: hasCredits(),
  });

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'We need camera roll permissions to select photos.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      console.log('📸 Opening image library...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Fixed: Use array format as per Expo docs
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('📋 Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('✅ Image selected:', uri);
        
        const validation = ImageUtils.validateImage(uri);
        if (!validation.valid) {
          console.error('❌ Image validation failed:', validation.error);
          Alert.alert('Invalid Image', validation.error || 'Please select a valid image.');
          return;
        }

        console.log('✅ Image validation passed, setting selected image');
        setSelectedImage(uri);
        setTransformedImage(null);
      } else {
        console.log('🚫 Image selection cancelled or no image selected');
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const takePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'We need camera permissions to take photos.'
      );
      return;
    }

    try {
      console.log('📷 Opening camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('📋 Camera result:', result);

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('✅ Photo taken:', uri);
        
        const validation = ImageUtils.validateImage(uri);
        if (!validation.valid) {
          console.error('❌ Photo validation failed:', validation.error);
          Alert.alert('Invalid Image', validation.error || 'Please select a valid image.');
          return;
        }

        console.log('✅ Photo validation passed, setting selected image');
        setSelectedImage(uri);
        setTransformedImage(null);
      } else {
        console.log('🚫 Photo cancelled or not taken');
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const transformImage = async () => {
    if (!selectedImage || !selectedArtist) {
      Alert.alert('Missing selection', 'Please select both an image and an artist style.');
      return;
    }

    // Check if user is authenticated first
    if (!user) {
      Alert.alert(
        '🔐 Sign Up Required',
        'You need to create an account to transform images. Sign up now to get 1 free transformation!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => {
            // Navigate to auth screen
            Alert.alert('Authentication', 'Please go to the Profile tab to sign up or log in!');
          }}
        ]
      );
      return;
    }

    if (!canTransform()) {
      Alert.alert(
        'No Credits Available',
        'You need to purchase credits to create more transformations.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => {
            Alert.alert('Purchase Credits', 'Go to the Profile tab to purchase credits!');
          }}
        ]
      );
      return;
    }

    console.log('🚀 Starting transformation process...');
    console.log('📸 Selected image:', selectedImage);
    console.log('🎨 Selected artist:', selectedArtist);
    console.log('👤 User authenticated:', !!user);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTransforming(true);
    setUploadingImage(true);
    setTransformedImage(null); // Clear any previous result

    // Show immediate feedback
    setTimeout(() => {
      Alert.alert(
        '🚀 Starting Transformation',
        'Your image is being processed. This will take a few moments...',
        [{ text: 'Got it!', style: 'default' }]
      );
    }, 100);

    try {
      console.log('📝 Creating transformation record...');
      const transformation = await addTransformation({
        originalImageUrl: selectedImage,
        artistStyle: selectedArtist,
        status: 'pending'
      });

      if (!transformation) {
        Alert.alert('Error', 'Failed to create transformation');
        return;
      }

      console.log('✅ Transformation record created:', transformation.id);

      console.log('📤 Uploading image...');
      const uploadResult = await ImageUtils.uploadImage(selectedImage);
      setUploadingImage(false);

      if (!uploadResult.success) {
        console.error('❌ Upload failed:', uploadResult.error);
        await updateTransformation(transformation.id, { status: 'failed' });
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload image');
        return;
      }

      console.log('✅ Image uploaded successfully:', uploadResult.url);

      await updateTransformation(transformation.id, { 
        status: 'processing',
        originalImageUrl: uploadResult.url!
      });

      console.log('🎨 Starting AI transformation...');
      const result = await ReplicateService.transformImage({
        inputImageUrl: uploadResult.url!,
        artistStyle: selectedArtist,
      });

      console.log('🎭 Transformation result:', result);

      if (result.success && result.imageUrl) {
        console.log('✅ Transformation successful! Setting result image:', result.imageUrl);
        setTransformedImage(result.imageUrl);
        
        await updateTransformation(transformation.id, {
          status: 'completed',
          transformedImageUrl: result.imageUrl
        });

        if (user && user.totalTransformations > 0) {
          await updateCredits(user.credits - 1);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Show prominent success message
        setTimeout(() => {
          const isRealTransformation = result.predictionId && !result.predictionId.startsWith('mock-');
          const message = isRealTransformation 
            ? `Your ${selectedArtist && ARTIST_STYLES[selectedArtist].name} style transformation is complete! This is a real AI transformation by Replicate.`
            : `Your image is ready! Note: This shows your original image as the real AI transformation needs a mobile device or proper image hosting. The AI will transform your actual photo on mobile.`;
            
          Alert.alert(
            isRealTransformation ? '🎨 AI Masterpiece Created!' : '📱 Ready for Real AI!', 
            message,
            [{ text: isRealTransformation ? 'Amazing!' : 'Got it!', style: 'default' }]
          );
        }, 500);
      } else {
        console.error('❌ Transformation failed:', result.error);
        await updateTransformation(transformation.id, { status: 'failed' });
        
        // Provide specific error messages based on the type of failure
        let errorTitle = '❌ Transformation Failed';
        let errorMessage = result.error || 'Something went wrong during the transformation.';
        
        if (result.error?.includes('still processing')) {
          errorTitle = '⏳ Processing';
          errorMessage = 'Your transformation is still being processed. Please wait a moment and try again.';
        } else if (result.error?.includes('Data URL')) {
          errorTitle = '📱 Mobile Limitation';
          errorMessage = 'The AI needs a publicly accessible image URL. This works better with a development build or web upload.';
        } else if (result.error?.includes('CORS')) {
          errorTitle = '🌐 Browser Limitation';
          errorMessage = 'The real AI transformation works on mobile devices. You\'re seeing your original image as a fallback.';
        }
        
        Alert.alert(
          errorTitle, 
          errorMessage,
          [{ text: 'Try Again', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('❌ Unexpected error during transformation:', error);
      Alert.alert(
        '⚠️ Unexpected Error', 
        'Something unexpected happened during the transformation. Please check your internet connection and try again.',
        [{ text: 'Got it', style: 'default' }]
      );
    } finally {
      console.log('🏁 Transformation process complete, cleaning up...');
      setIsTransforming(false);
      setUploadingImage(false);
    }
  };

  const handleSaveImage = async () => {
    if (transformedImage) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await ImageUtils.saveToGallery(transformedImage);
    }
  };

  const getTransformButtonText = () => {
    if (uploadingImage) return 'Uploading...';
    if (isTransforming) return 'Creating Art...';
    if (!user) return '🔐 Sign Up to Transform';
    if (user.totalTransformations === 0) return '✨ Try Free Transform';
    if (hasCredits()) return `Transform (${user.credits} left)`;
    return 'Purchase Credits';
  };

  const canProceed = selectedImage && selectedArtist && !isTransforming && user && canTransform();

  const renderArtistCard = (artistKey: ArtistStyle) => {
    const artist = ARTIST_STYLES[artistKey];
    const isSelected = selectedArtist === artistKey;

    return (
      <TouchableOpacity
        key={artistKey}
        style={[styles.artistCard, isSelected && styles.selectedArtistCard]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedArtist(artistKey);
        }}
        disabled={isTransforming}
        activeOpacity={0.9}
      >
        <View style={styles.artistImageContainer}>
          <Image 
            source={{ uri: artist.sampleImage }}
            style={styles.artistImage}
            transition={200}
          />
          <LinearGradient
            colors={isSelected 
              ? ['rgba(255,215,0,0.3)', 'rgba(255,215,0,0.7)']
              : ['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.artistImageOverlay}
          />
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
            </View>
          )}
        </View>
        
        <LinearGradient
          colors={isSelected ? artist.gradientColors : ['#f8f9fa', '#e9ecef']}
          style={styles.artistInfo}
        >
          <Text style={[styles.artistName, isSelected && styles.selectedText]}>
            {artist.name}
          </Text>
          <Text style={[styles.artistPeriod, isSelected && styles.selectedSubtext]}>
            {artist.period}
          </Text>
          <Text style={[styles.artistDescription, isSelected && styles.selectedSubtext]}>
            {artist.description}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.background}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.headerIcon}
            >
              <Ionicons name="brush" size={28} color="white" />
            </LinearGradient>
            <Text style={styles.title}>PaintMe</Text>
            <Text style={styles.subtitle}>Transform into Art</Text>
            
            {user && (
              <View style={styles.creditsDisplay}>
                <Ionicons name="flash" size={16} color="#FFD700" />
                <Text style={styles.creditsText}>
                  {user.totalTransformations === 0 
                    ? 'Free trial available!' 
                    : `${user.credits} credits`
                  }
                </Text>
              </View>
            )}
          </View>

          {/* Image Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Photo</Text>
            
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.selectedImage}
                  onLoad={() => {
                    console.log('✅ Selected image loaded successfully:', selectedImage);
                  }}
                  onError={(error) => {
                    console.error('❌ Selected image failed to load:', error);
                    console.error('❌ Image URI:', selectedImage);
                  }}
                  onLoadStart={() => {
                    console.log('⏳ Starting to load selected image:', selectedImage);
                  }}
                />
                <BlurView intensity={20} style={styles.changeButton}>
                  <TouchableOpacity onPress={pickImage} disabled={isTransforming}>
                    <Ionicons name="pencil" size={20} color="white" />
                  </TouchableOpacity>
                </BlurView>
              </View>
            ) : (
              <View style={styles.imageOptionsContainer}>
                <TouchableOpacity 
                  style={styles.imageOption} 
                  onPress={pickImage}
                  disabled={isTransforming}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.imageOptionGradient}
                  >
                    <Ionicons name="images" size={32} color="white" />
                    <Text style={styles.imageOptionText}>Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.imageOption} 
                  onPress={takePhoto}
                  disabled={isTransforming}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#6a11cb', '#2575fc']}
                    style={styles.imageOptionGradient}
                  >
                    <Ionicons name="camera" size={32} color="white" />
                    <Text style={styles.imageOptionText}>Camera</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Artist Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Master Artist</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the style that speaks to your soul
            </Text>
            
            <View style={styles.artistsContainer}>
              {(Object.keys(ARTIST_STYLES) as ArtistStyle[]).map(renderArtistCard)}
            </View>
          </View>

          {/* Transform Button */}
          <TouchableOpacity
            style={[styles.transformButton, !canProceed && styles.transformButtonDisabled]}
            onPress={transformImage}
            disabled={!canProceed}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={canProceed 
                ? ['#FF6B6B', '#4ECDC4', '#45B7D1']
                : ['#ccc', '#999']
              }
              style={styles.transformGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {(isTransforming || uploadingImage) && (
                <ActivityIndicator 
                  size="small" 
                  color="white" 
                  style={styles.buttonSpinner} 
                />
              )}
              <Text style={styles.transformButtonText}>
                {getTransformButtonText()}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Result */}
          {transformedImage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Masterpiece</Text>
              
              <View style={styles.resultContainer}>
                <Image 
                  source={{ uri: transformedImage }} 
                  style={styles.resultImage}
                  transition={500}
                  onLoad={() => {
                    console.log('✅ Result image loaded successfully:', transformedImage);
                  }}
                  onError={(error) => {
                    console.error('❌ Result image failed to load:', error);
                    console.error('❌ Result image URI:', transformedImage);
                  }}
                  onLoadStart={() => {
                    console.log('⏳ Starting to load result image:', transformedImage);
                  }}
                />
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveImage}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#28a745', '#20c997']}
                    style={styles.saveGradient}
                  >
                    <Ionicons name="download" size={20} color="white" />
                    <Text style={styles.saveText}>Save to Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Debug Info - Only in development */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>🐛 Debug Info</Text>
              <Text style={styles.debugText}>
                Mode: {ReplicateService.isMockMode() ? '🎭 MOCK (Demo Images)' : '🚀 REAL API'}
              </Text>
              <Text style={styles.debugText}>
                Selected Image: {selectedImage ? '✅' : '❌'} 
                {selectedImage && ` (${selectedImage.length} chars)`}
              </Text>
              <Text style={styles.debugText}>Selected Artist: {selectedArtist || 'None'}</Text>
              <Text style={styles.debugText}>Is Transforming: {isTransforming ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugText}>Uploading: {uploadingImage ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugText}>
                Has Result: {transformedImage ? '✅' : '❌'}
                {transformedImage && ` (${transformedImage.length} chars)`}
              </Text>
              {selectedImage && (
                <Text style={styles.debugText}>
                  Input: {selectedImage.substring(0, 60)}...
                </Text>
              )}
              {transformedImage && (
                <Text style={styles.debugText}>
                  Output: {transformedImage.substring(0, 60)}...
                </Text>
              )}
              
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => {
                  // Test image loading manually
                  console.log('🔍 Manual Debug Check:');
                  console.log('Selected Image URI:', selectedImage);
                  console.log('Transformed Image URI:', transformedImage);
                  
                  Alert.alert(
                    'Debug Info',
                    `Selected: ${selectedImage ? 'Yes' : 'No'}\nTransformed: ${transformedImage ? 'Yes' : 'No'}\nMode: ${ReplicateService.isMockMode() ? 'Mock' : 'Real'}\n\nCheck console for full URIs`,
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.debugButtonText}>🔍 Debug Check</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={() => {
                  Alert.alert(
                    'Switch to Real API?',
                    'To use the real Replicate API:\n\n1. Set USE_MOCK_MODE = false in lib/replicate.ts\n2. Run on mobile device (avoids CORS)\n3. Set up Cloudinary for image uploads\n\nThe real API will transform your photos into actual classical paintings!',
                    [
                      { text: 'Got it!', style: 'default' },
                      { text: 'Learn More', style: 'default', onPress: () => {
                        console.log('📚 Real API Setup Instructions:');
                        console.log('1. Sign up for Cloudinary (free tier available)');
                        console.log('2. Update CLOUDINARY_CONFIG in lib/imageUtils.ts');
                        console.log('3. Set USE_MOCK_MODE = false in lib/replicate.ts');
                        console.log('4. Test on mobile device (not web browser)');
                      }}
                    ]
                  );
                }}
              >
                <Text style={styles.debugButtonText}>
                  {ReplicateService.isMockMode() ? '🔄 Enable Real API' : '✅ Real API Active'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        
        {/* Process Status - Full screen overlay */}
        {isTransforming && (
          <View style={styles.loadingOverlay}>
            <BlurView intensity={20} style={styles.loadingBlur}>
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingTitle}>
                  {uploadingImage ? '📤 Uploading...' : '🎨 Creating Art...'}
                </Text>
                <Text style={styles.loadingSubtitle}>
                  {uploadingImage 
                    ? 'Uploading your image to the cloud'
                    : `Transforming your photo into a ${selectedArtist && ARTIST_STYLES[selectedArtist].name} masterpiece`
                  }
                </Text>
                <View style={styles.loadingProgress}>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.progressFill}
                    />
                  </View>
                </View>
              </View>
            </BlurView>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  creditsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  creditsText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
  },
  selectedImageContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  selectedImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
  },
  changeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  imageOption: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageOptionGradient: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOptionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  artistsContainer: {
    gap: 16,
  },
  artistCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedArtistCard: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    transform: [{ scale: 1.02 }],
  },
  artistImageContainer: {
    height: 120,
    position: 'relative',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  artistInfo: {
    padding: 16,
  },
  artistName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  artistPeriod: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  artistDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  selectedText: {
    color: 'white',
  },
  selectedSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  transformButton: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  transformButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  transformGradient: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    marginRight: 12,
  },
  transformButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCard: {
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  saveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    width: width * 0.8,
    height: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
    marginBottom: 5,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 15,
  },
  loadingProgress: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'transparent',
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  debugContainer: {
    marginTop: 20,
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  debugButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
