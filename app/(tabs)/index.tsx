import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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

import { ARTIST_STYLES, ArtistStyle } from '../../constants/Config';
import { useUser } from '../../hooks/useUser';
import { ImageUtils } from '../../lib/imageUtils';
import { ReplicateService } from '../../lib/replicate';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const IMAGE_SIZE = Math.min(width - 48, 300);

export default function TransformScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistStyle | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [transformationProgress, setTransformationProgress] = useState({
    uploading: false,
    processing: false,
    error: null as string | null,
  });

  const { user, canTransform, addTransformation, updateTransformation, decrementImageGenerations, loading, updateTrigger } = useUser();

  // State to force re-render when user data changes
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Monitor user changes and force update
  React.useEffect(() => {
    console.log('🔄 Index - User state changed:', {
      hasUser: !!user,
      userGenerations: user?.imageGenerationsRemaining,
      canTransform: canTransform(),
      loading
    });
    
    // Force re-render when user data changes
    forceUpdate();
  }, [user?.imageGenerationsRemaining, user?.id, loading, updateTrigger]);

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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const validation = ImageUtils.validateImage(uri);
        if (!validation.valid) {
          Alert.alert('Invalid Image', validation.error || 'Please select a valid image.');
          return;
        }
        setSelectedImage(uri);
        setTransformedImage(null);
      }
    } catch (error) {
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
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const validation = ImageUtils.validateImage(uri);
        if (!validation.valid) {
          Alert.alert('Invalid Image', validation.error || 'Please select a valid image.');
          return;
        }
        setSelectedImage(uri);
        setTransformedImage(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const transformImage = async () => {
    if (!selectedImage || !selectedArtist) {
      Alert.alert('Missing selection', 'Please select both an image and an artist style.');
      return;
    }

    if (!user) {
      Alert.alert('🔐 Sign Up Required', 'You need to create an account to transform images.');
      return;
    }

    if (!user || user.imageGenerationsRemaining <= 0) {
      Alert.alert('Sin generaciones', 'Necesitas comprar más generaciones para crear transformaciones.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTransforming(true);
    setTransformedImage(null);
    setTransformationProgress({ uploading: true, processing: false, error: null });

    try {
      const transformation = await addTransformation({
        originalImageUrl: selectedImage,
        artistStyle: selectedArtist,
        status: 'pending'
      });

      if (!transformation) {
        Alert.alert('Error', 'Failed to create transformation');
        setIsTransforming(false);
        return;
      }

      const uploadResult = await ImageUtils.uploadImage(selectedImage);

      if (!uploadResult.success) {
        await updateTransformation(transformation.id, { status: 'failed' });
        Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload image');
        setTransformationProgress({ uploading: false, processing: false, error: 'Upload Failed' });
        setIsTransforming(false);
        return;
      }

      setTransformationProgress({ uploading: false, processing: true, error: null });

      await updateTransformation(transformation.id, { 
        status: 'processing',
        originalImageUrl: uploadResult.url!
      });

      const result = await ReplicateService.transformImage(
        uploadResult.url!,
        selectedArtist
      );

      setTransformationProgress({ uploading: false, processing: false, error: null });

      if (result.success && result.imageUrl) {
        setTransformedImage(result.imageUrl);
        await updateTransformation(transformation.id, {
          status: 'completed',
          transformedImageUrl: result.imageUrl
        });
        
        // Decrementar generaciones después de transformación exitosa
        await decrementImageGenerations();
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await updateTransformation(transformation.id, { status: 'failed' });
        Alert.alert('Transformation Failed', result.error || 'The AI failed to transform the image.');
        setTransformationProgress({ uploading: false, processing: false, error: 'Transformation Failed' });
      }
    } catch (err: any) {
      setTransformationProgress({ uploading: false, processing: false, error: 'An unexpected error occurred' });
    } finally {
      setIsTransforming(false);
    }
  };

  const renderTransformationStatus = () => {
    if (!isTransforming) return null;

    let statusText = '';
    if (transformationProgress.uploading) {
      statusText = 'Uploading your image...';
    } else if (transformationProgress.processing) {
      statusText = 'The AI is creating your masterpiece...';
    }

    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator size="small" color="#FFF" />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    );
  };

  const handleSaveImage = async () => {
    if (!transformedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ImageUtils.saveToGallery(transformedImage);
  };

  const getTransformButtonText = () => {
    if (isTransforming) return 'Creating Art...';
    if (!user) return '🔐 Sign Up to Transform';
    if (loading) return 'Loading...';
    if (!canTransform()) return '✨ Get More Credits';
    return 'Transform Image';
  };

  const renderArtistCard = (artistKey: ArtistStyle) => {
    const artist = ARTIST_STYLES[artistKey];
    const isSelected = selectedArtist === artistKey;

    return (
      <TouchableOpacity
        key={artistKey}
        style={[styles.artistCard, isSelected && styles.selectedArtistCard]}
        onPress={() => {
          setSelectedArtist(artistKey);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}>
        <Image source={artist.sampleImage} style={styles.artistImage} />
        <View style={styles.artistInfo}>
          <Text style={styles.artistName}>{artist.name}</Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderImageContainer = () => {
    const imageToDisplay = transformedImage || selectedImage;

    return (
      <View style={styles.imageContainer}>
        {imageToDisplay ? (
          <Image source={{ uri: imageToDisplay }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={60} color="rgba(255, 255, 255, 0.5)" />
            <Text style={styles.placeholderText}>Select an image to transform</Text>
          </View>
        )}
        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <Ionicons name="images-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        {transformedImage && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveImage}>
            <Ionicons name="download-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Paint Me</Text>
          <Text style={styles.subtitle}>Transform your photos into timeless art</Text>
        </View>

        {renderImageContainer()}

        {renderTransformationStatus()}

        <View style={styles.artistSelector}>
          <Text style={styles.sectionTitle}>Choose Your Master&apos;s Style</Text>
          <View style={styles.artistGrid}>
            {Object.keys(ARTIST_STYLES).map(key => renderArtistCard(key as ArtistStyle))}
          </View>
        </View>

        <View style={styles.ctaContainer}>
          {user && user.imageGenerationsRemaining > 0 ? (
            // Si el usuario tiene créditos, muestra el botón para generar
            <TouchableOpacity
              style={[styles.transformButton, (!selectedImage || !selectedArtist || isTransforming) && styles.disabledButton]}
              onPress={transformImage}
              disabled={!selectedImage || !selectedArtist || isTransforming}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.buttonGradient}>
                {isTransforming && <ActivityIndicator size="small" color="#000" style={{ marginRight: 10 }} />}
                <Text style={styles.buttonText}>
                  {isTransforming ? 'Creando Arte...' : `Generar Imagen (${user?.imageGenerationsRemaining || 0} restantes)`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            // Si el usuario NO tiene créditos, muestra el botón para comprar
            <TouchableOpacity
              style={styles.transformButton}
              onPress={() => router.push('/(tabs)/profile')}>
              <LinearGradient colors={['#8e9eab', '#eef2f3']} style={styles.buttonGradient}>
                <Text style={[styles.buttonText, { color: '#333' }]}>✨ Comprar más créditos</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  imageContainer: {
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeholder: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 10,
  },
  imageActions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    right: 10,
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 20,
  },
  saveButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 20,
  },
  artistSelector: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  artistCard: {
    width: (CARD_WIDTH - 16) / 2,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedArtistCard: {
    borderColor: '#FFD700',
  },
  artistImage: {
    width: '100%',
    height: 120,
  },
  artistInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  artistName: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  transformButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  statusText: {
    color: '#FFF',
    marginLeft: 10,
  },
});
