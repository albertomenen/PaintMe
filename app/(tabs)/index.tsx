import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useRef } from 'react';
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
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ARTIST_STYLES, ArtistStyle, ANIME_STYLES, AnimeStyle } from '../../constants/Config';
import { useUser } from '../../hooks/useUser';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { ImageUtils } from '../../lib/imageUtils';
import { NotificationService } from '../../lib/notifications';
import { ReplicateService } from '../../lib/replicate';
import { Analytics } from '../../lib/analytics';
import LoadingScreen from '../../components/LoadingScreen';
import RevenueCatPaywall from '../../components/RevenueCatPaywall';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.50; // Reducido más para zoom out
const CARD_HEIGHT = height * 0.18; // Reducido más para zoom out
const CARD_SPACING = 10; // Más compacto
const IMAGE_SIZE = Math.min(width - 80, 200); // Mucho más pequeño

export default function TransformScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistStyle | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<AnimeStyle | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [transformationProgress, setTransformationProgress] = useState({
    uploading: false,
    processing: false,
    error: null as string | null,
  });
  const [currentArtistIndex, setCurrentArtistIndex] = useState(0);
  const [currentAnimeIndex, setCurrentAnimeIndex] = useState(0);
  const [lastScrollX, setLastScrollX] = useState(0);

  const artistScrollViewRef = useRef<ScrollView>(null);
  const animeScrollViewRef = useRef<ScrollView>(null);

  const { user, canTransform, addTransformation, updateTransformation, decrementImageGenerations, loading, updateTrigger, refreshUser } = useUser();
  const { settings: notificationSettings } = useNotificationSettings();
  const [transformStartTime, setTransformStartTime] = useState<number | null>(null);
  const [imageAutoSaved, setImageAutoSaved] = useState(false);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showCreditsPaywall, setShowCreditsPaywall] = useState(false);
  const [showSubscriptionPaywall, setShowSubscriptionPaywall] = useState(false);
  const confettiRef = useRef<any>(null);

  React.useEffect(() => {
    console.log('🏠 INDEX - User state changed:', {
      hasUser: !!user,
      userGenerations: user?.imageGenerationsRemaining,
      canTransform: canTransform(),
      loading,
      updateTrigger,
      timestamp: new Date().toISOString()
    });
  }, [user?.imageGenerationsRemaining, user?.id, user?.credits, loading, updateTrigger]);

  // Refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🏠 INDEX - Screen focused, refreshing user data');
      if (user) {
        refreshUser();
      }
    }, [user?.id])
  );

  const handleArtistScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollX / (CARD_WIDTH + CARD_SPACING));

    if (newIndex !== currentArtistIndex && scrollX !== lastScrollX) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentArtistIndex(newIndex);
      setLastScrollX(scrollX);
    }
  };

  const handleAnimeScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollX / (CARD_WIDTH + CARD_SPACING));

    if (newIndex !== currentAnimeIndex && scrollX !== lastScrollX) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentAnimeIndex(newIndex);
      setLastScrollX(scrollX);
    }
  };

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
        setImageAutoSaved(false);

        // Track with isFirstImage parameter
        const isFirstImage = !selectedImage;
        Analytics.trackImageSelected('gallery', isFirstImage);
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
        setImageAutoSaved(false);

        // Track with isFirstImage parameter
        const isFirstImage = !selectedImage;
        Analytics.trackImageSelected('camera', isFirstImage);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const transformImage = async () => {
    if (!selectedImage || (!selectedArtist && !selectedAnime)) {
      Alert.alert('Missing selection', 'Please select both an image and an artist style.');
      return;
    }

    if (!user) {
      Alert.alert('🔐 Sign Up Required', 'You need to create an account to transform images.');
      return;
    }

    // Check if user can transform (premium users have unlimited, non-premium need credits)
    if (!canTransform()) {
      Alert.alert('Sin generaciones', 'Necesitas comprar más generaciones para crear transformaciones.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTransforming(true);
    setTransformedImage(null);
    setImageAutoSaved(false);
    setTransformationProgress({ uploading: true, processing: false, error: null });
    setTransformStartTime(Date.now());

    const styleChoice = selectedArtist || selectedAnime;
    const artistName = selectedArtist ? ARTIST_STYLES[selectedArtist].name : ANIME_STYLES[selectedAnime!].name;

    // Track transformation started with credits remaining
    const creditsRemaining = user?.imageGenerationsRemaining || 0;
    Analytics.trackImageTransformationStarted(artistName, creditsRemaining);

    try {
      const transformation = await addTransformation({
        originalImageUrl: selectedImage,
        artistStyle: styleChoice,
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
        styleChoice!
      );

      setTransformationProgress({ uploading: false, processing: false, error: null });

      if (result.success && result.imageUrl) {
        setTransformedImage(result.imageUrl);
        await updateTransformation(transformation.id, {
          status: 'completed',
          transformedImageUrl: result.imageUrl
        });

        // Only decrement credits for non-premium users
        if (!user.isPremium) {
          await decrementImageGenerations();
          console.log('🏠 INDEX: Credits decremented after transformation');
        } else {
          console.log('🏠 INDEX: Premium user - no credits decremented');
        }

        // Refresh user data to update gallery and credits display
        console.log('🔄 Refreshing user data to sync gallery...');
        refreshUser();

        forceUpdate();

        const processingTime = transformStartTime ? (Date.now() - transformStartTime) / 1000 : 0;
        const newCreditsRemaining = (user?.imageGenerationsRemaining || 0) - 1;
        const isFirstTransformation = (user?.imageGenerationsRemaining || 0) === 1; // Was 1 before decrement

        // Track Masterpiece Created (THE WOW MOMENT)
        Analytics.trackImageTransformationCompleted(
          artistName,
          processingTime,
          isFirstTransformation,
          newCreditsRemaining
        );

        try {
          await ImageUtils.saveToGallery(result.imageUrl);
          console.log('✅ Image automatically saved to gallery');
          setImageAutoSaved(true);
          Analytics.trackImageSaved(artistName);
        } catch (saveError) {
          console.error('❌ Failed to auto-save image:', saveError);
          setImageAutoSaved(false);
        }

        if (notificationSettings.transformationComplete) {
          await NotificationService.sendImageTransformedNotification();
        }

        if (notificationSettings.reminders && user?.imageGenerationsRemaining && user.imageGenerationsRemaining > 0) {
          await NotificationService.sendReminderNotification(24);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Show result modal with confetti
        setShowResultModal(true);
        setTimeout(() => {
          confettiRef.current?.start();
        }, 300);
      } else {
        await updateTransformation(transformation.id, { status: 'failed' });

        Analytics.trackImageTransformationFailed(artistName, result.error || 'Unknown error');

        Alert.alert('Transformation Failed', result.error || 'The AI failed to transform the image.');
        setTransformationProgress({ uploading: false, processing: false, error: 'Transformation Failed' });
      }
    } catch (err: any) {
      setTransformationProgress({ uploading: false, processing: false, error: 'An unexpected error occurred' });
    } finally {
      setIsTransforming(false);
    }
  };

  const getLoadingMessage = () => {
    if (transformationProgress.uploading) {
      return 'Uploading your image...';
    } else if (transformationProgress.processing) {
      return 'Creating your masterpiece...';
    }
    return 'Preparing transformation...';
  };

  const handleSaveImage = async () => {
    if (!transformedImage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await ImageUtils.saveToGallery(transformedImage);
    Analytics.trackImageSaved();
  };

  const renderArtistCard = (artistKey: ArtistStyle, index: number) => {
    const artist = ARTIST_STYLES[artistKey];
    const isSelected = selectedArtist === artistKey;
    const isCenterCard = index === currentArtistIndex;

    return (
      <TouchableOpacity
        key={artistKey}
        style={[
          styles.bigCard,
          isCenterCard && styles.centerCard,
          isSelected && styles.selectedBigCard
        ]}
        onPress={() => {
          const isFirstSelection = !selectedArtist && !selectedAnime;
          setSelectedArtist(artistKey);
          setSelectedAnime(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // CRITICAL: Track style selection with all parameters
          Analytics.trackArtistStyleSelected(
            artist.name,
            'classic', // style_category
            isFirstSelection,
            1 // Will be incremented in Mixpanel
          );
        }}
        activeOpacity={0.9}>
        <LinearGradient
          colors={artist.gradientColors}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <Image source={artist.sampleImage} style={styles.bigCardImage} contentFit="cover" />
          <View style={[styles.cardOverlay, isSelected && styles.selectedOverlay]}>
            <View style={styles.cardContent}>
              <Text style={styles.bigCardTitle}>{artist.name}</Text>
              <Text style={styles.bigCardSubtitle}>{artist.period}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderAnimeCard = (animeKey: AnimeStyle, index: number) => {
    const anime = ANIME_STYLES[animeKey];
    const isSelected = selectedAnime === animeKey;
    const isCenterCard = index === currentAnimeIndex;

    return (
      <TouchableOpacity
        key={animeKey}
        style={[
          styles.bigCard,
          isCenterCard && styles.centerCard,
          isSelected && styles.selectedBigCard
        ]}
        onPress={() => {
          const isFirstSelection = !selectedArtist && !selectedAnime;
          setSelectedAnime(animeKey);
          setSelectedArtist(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // CRITICAL: Track style selection with all parameters
          Analytics.trackArtistStyleSelected(
            anime.name,
            'japanese', // style_category
            isFirstSelection,
            1 // Will be incremented in Mixpanel
          );
        }}
        activeOpacity={0.9}>
        <LinearGradient
          colors={anime.gradientColors}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}>
          <Image source={anime.sampleImage} style={styles.bigCardImage} contentFit="cover" />
          <View style={[styles.cardOverlay, isSelected && styles.selectedOverlay]}>
            <View style={styles.cardContent}>
              <Text style={styles.bigCardTitle}>{anime.name}</Text>
              <Text style={styles.bigCardSubtitle}>{anime.period}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#f5f7fa', '#ffffff']} style={StyleSheet.absoluteFill} />

      {/* Header con icono de settings */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="settings-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Credits Display Button - Prominente */}
      {user && !user.isPremium && (
        <View style={styles.creditsButtonContainer}>
          <TouchableOpacity
            style={styles.creditsButton}
            onPress={() => router.push('/(tabs)/profile')}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.creditsButtonGradient}>
              <Ionicons name="images" size={24} color="#FFF" />
              <View style={styles.creditsButtonTextContainer}>
                <Text style={styles.creditsButtonNumber}>
                  {user?.imageGenerationsRemaining || 0}
                </Text>
                <Text style={styles.creditsButtonLabel}>
                  transformaciones restantes
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Premium Badge - VERY PROMINENT */}
      {user?.isPremium && (
        <View style={styles.premiumBadgeContainer}>
          <TouchableOpacity
            style={styles.premiumBadgeLarge}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.9}>
            <LinearGradient
              colors={['#FFD700', '#FFA500', '#FF6B6B']}
              style={styles.premiumBadgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}>
              <View style={styles.premiumBadgeContent}>
                <View style={styles.premiumIconContainer}>
                  <Ionicons name="star" size={28} color="#FFF" />
                  <View style={styles.premiumPulse} />
                </View>
                <View style={styles.premiumTextContainer}>
                  <Text style={styles.premiumTextLarge}>✨ PREMIUM ACTIVE</Text>
                  <Text style={styles.premiumSubtext}>∞ Unlimited Transformations</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>

        {/* Título principal */}
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>Choose Your Art Style</Text>
        </View>

        {/* Sección de artistas clásicos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Classic Artists</Text>
        </View>

        {/* Carrusel de artistas clásicos */}
        <View style={styles.carouselSection}>
          <ScrollView
            ref={artistScrollViewRef}
            horizontal
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            snapToAlignment="center"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            onScroll={handleArtistScroll}
            scrollEventThrottle={16}>
            {Object.keys(ARTIST_STYLES).map((key, index) =>
              renderArtistCard(key as ArtistStyle, index)
            )}
          </ScrollView>

          {/* Indicador de página */}
          <View style={styles.pageIndicator}>
            {Object.keys(ARTIST_STYLES).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicatorDot,
                  index === currentArtistIndex && styles.pageIndicatorDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Sección de artistas japoneses */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Japanese Artists</Text>
        </View>

        {/* Carrusel de estilos anime */}
        <View style={styles.carouselSection}>
          <ScrollView
            ref={animeScrollViewRef}
            horizontal
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            snapToAlignment="center"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            onScroll={handleAnimeScroll}
            scrollEventThrottle={16}>
            {Object.keys(ANIME_STYLES).map((key, index) =>
              renderAnimeCard(key as AnimeStyle, index)
            )}
          </ScrollView>

          {/* Indicador de página */}
          <View style={styles.pageIndicator}>
            {Object.keys(ANIME_STYLES).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicatorDot,
                  index === currentAnimeIndex && styles.pageIndicatorDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Título de selección de imagen */}
        <View style={styles.selectImageHeader}>
          <Text style={styles.selectImageTitle}>Selecciona una Imagen</Text>
        </View>

        {/* Botones de acción (galería y cámara) */}
        <View style={styles.actionButtons}>
          <View style={styles.actionButtonWrapper}>
            <TouchableOpacity
              style={styles.actionButtonLarge}
              onPress={pickImage}>
              <LinearGradient
                colors={['#2d3436', '#000000']}
                style={styles.actionButtonGradient}>
                <Ionicons name="images" size={28} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.actionButtonLabel}>Galería</Text>
          </View>

          <View style={styles.actionButtonWrapper}>
            <TouchableOpacity
              style={styles.actionButtonLarge}
              onPress={takePhoto}>
              <LinearGradient
                colors={['#6c5ce7', '#a29bfe']}
                style={styles.actionButtonGradient}>
                <Ionicons name="camera" size={28} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.actionButtonLabel}>Cámara</Text>
          </View>
        </View>

        {/* Preview de imagen seleccionada - Más compacto */}
        {selectedImage && (
          <View style={styles.selectedImageContainer}>
            <View style={styles.selectedImageWrapper}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.selectedImagePreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setSelectedImage(null);
                  setTransformedImage(null);
                }}>
                <Ionicons name="close-circle" size={28} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botón Transform - SIEMPRE VISIBLE */}
        <View style={styles.transformButtonContainer}>
          <TouchableOpacity
            style={[
              styles.transformButton,
              (!selectedImage || (!selectedArtist && !selectedAnime)) && styles.transformButtonDisabled
            ]}
            onPress={transformImage}
            disabled={isTransforming || !selectedImage || (!selectedArtist && !selectedAnime)}>
            <LinearGradient
              colors={
                isTransforming
                  ? ['#95a5a6', '#7f8c8d']
                  : (!selectedImage || (!selectedArtist && !selectedAnime))
                  ? ['#bdc3c7', '#95a5a6']
                  : ['#00b894', '#00cec9']
              }
              style={styles.transformButtonGradient}>
              <Text style={styles.transformButtonText}>
                {isTransforming
                  ? 'Transformando...'
                  : !selectedImage
                  ? 'Selecciona una Imagen'
                  : (!selectedArtist && !selectedAnime)
                  ? 'Selecciona un Estilo'
                  : 'Transformar Imagen'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="bookmark" size={24} color="#6c5ce7" />
          <Text style={styles.navItemTextActive}>Create</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/gallery')}>
          <Ionicons name="paw-outline" size={24} color="#999" />
          <Text style={styles.navItemText}>Filters</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(tabs)/gallery')}>
          <Ionicons name="albums-outline" size={24} color="#999" />
          <Text style={styles.navItemText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <LoadingScreen
        visible={isTransforming}
        message={getLoadingMessage()}
      />

      {/* Result Modal with Confetti */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowResultModal(false)}>
        <SafeAreaView style={styles.resultModalContainer}>
          <LinearGradient colors={['#f5f7fa', '#ffffff']} style={StyleSheet.absoluteFill} />

          {/* Confetti */}
          <ConfettiCannon
            ref={confettiRef}
            count={200}
            origin={{ x: width / 2, y: -10 }}
            autoStart={false}
            fadeOut={true}
          />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setShowResultModal(false)}>
            <Ionicons name="close" size={30} color="#333" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.resultModalContent}>
            {/* Success Title */}
            <Text style={styles.resultModalTitle}>🎉 Image Created!</Text>

            {/* Transformed Image */}
            {transformedImage && (
              <View style={styles.resultImageContainer}>
                <Image
                  source={{ uri: transformedImage }}
                  style={styles.resultImage}
                  contentFit="contain"
                />
              </View>
            )}

            {/* Prompt Text */}
            <View style={styles.promptTextContainer}>
              <Text style={styles.promptTextTitle}>
                {user?.isPremium
                  ? '¿Quieres crear más fotos?'
                  : 'Remember, want to create more photos?'}
              </Text>
              {!user?.isPremium && (
                <Text style={styles.promptTextSubtitle}>
                  Compra créditos o suscríbete para transformaciones ilimitadas
                </Text>
              )}
            </View>

            {/* Action Buttons */}
            {!user?.isPremium && (
              <View style={styles.resultActionsContainer}>
                {/* Buy Credits Button */}
                <TouchableOpacity
                  style={styles.resultActionButton}
                  onPress={() => {
                    setShowResultModal(false);
                    setTimeout(() => setShowCreditsPaywall(true), 300);

                    // CRITICAL: Track paywall view with source and context
                    const creditsRemaining = user?.imageGenerationsRemaining || 0;
                    const transformationsCount = user?.totalTransformations || 0;
                    Analytics.trackPaywallViewed(
                      'post_transformation',
                      creditsRemaining,
                      transformationsCount
                    );
                  }}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.resultActionGradient}>
                    <Ionicons name="images" size={24} color="#FFF" />
                    <Text style={styles.resultActionText}>Buy Credits</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Pro Subscription Button */}
                <TouchableOpacity
                  style={styles.resultActionButton}
                  onPress={() => {
                    setShowResultModal(false);
                    setTimeout(() => setShowSubscriptionPaywall(true), 300);

                    // CRITICAL: Track paywall view with source and context
                    const creditsRemaining = user?.imageGenerationsRemaining || 0;
                    const transformationsCount = user?.totalTransformations || 0;
                    Analytics.trackPaywallViewed(
                      'post_transformation',
                      creditsRemaining,
                      transformationsCount
                    );
                  }}>
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.resultActionGradient}>
                    <Ionicons name="star" size={24} color="#FFF" />
                    <Text style={styles.resultActionText}>Pro Subscription</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => setShowResultModal(false)}>
              <Text style={styles.continueButtonText}>
                {user?.isPremium ? 'Crear Otra' : 'Continuar'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Credits Paywall Modal */}
      <Modal
        visible={showCreditsPaywall}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowCreditsPaywall(false)}>
        <RevenueCatPaywall
          offeringId="default"
          onClose={() => setShowCreditsPaywall(false)}
          onPurchaseComplete={() => {
            setShowCreditsPaywall(false);
            forceUpdate();
          }}
        />
      </Modal>

      {/* Subscription Paywall Modal */}
      <Modal
        visible={showSubscriptionPaywall}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowSubscriptionPaywall(false)}>
        <RevenueCatPaywall
          offeringId="Artme Subscription"
          onClose={() => setShowSubscriptionPaywall(false)}
          onPurchaseComplete={() => {
            setShowSubscriptionPaywall(false);
            forceUpdate();
          }}
        />
      </Modal>

      {/* Floating Upgrade to Pro Button - Only show for non-premium users */}
      {user && !user.isPremium && (
        <TouchableOpacity
          style={styles.floatingProButton}
          onPress={() => setShowSubscriptionPaywall(true)}
          activeOpacity={0.9}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.floatingProGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}>
            <Ionicons name="star" size={20} color="#FFF" />
            <Text style={styles.floatingProText}>Upgrade to Pro</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContainer: {
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  creditsButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  creditsButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  creditsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  creditsButtonTextContainer: {
    flex: 1,
  },
  creditsButtonNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    lineHeight: 26,
  },
  creditsButtonLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  premiumBadgeContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  premiumBadgeLarge: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  premiumBadgeGradient: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  premiumBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  premiumIconContainer: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.5,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTextLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  premiumSubtext: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.95,
    fontWeight: '600',
  },
  titleContainer: {
    paddingHorizontal: 24,
    paddingVertical: 4,
    alignItems: 'center',
    marginBottom: 4,
  },
  creditsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  carouselSection: {
    marginBottom: 8,
  },
  carouselContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    gap: CARD_SPACING,
  },
  bigCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    transform: [{ scale: 0.9 }],
    opacity: 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  centerCard: {
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  selectedBigCard: {
    borderWidth: 5,
    borderColor: '#6c5ce7',
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  cardGradient: {
    flex: 1,
    padding: 4,
  },
  bigCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cardContent: {
    gap: 4,
  },
  bigCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  bigCardSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  selectedOverlay: {
    backgroundColor: 'rgba(108, 92, 231, 0.7)',
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'left',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  pageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
  },
  pageIndicatorDotActive: {
    width: 24,
    height: 8,
    backgroundColor: '#6c5ce7',
  },
  selectImageHeader: {
    paddingHorizontal: 24,
    paddingVertical: 6,
    marginTop: 8,
  },
  selectImageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 40,
    marginTop: 8,
    marginBottom: 8,
  },
  actionButtonWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  actionButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedImageContainer: {
    paddingHorizontal: 40,
    marginTop: 6,
    marginBottom: 4,
  },
  selectedImageWrapper: {
    position: 'relative',
    width: '100%',
    height: IMAGE_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  selectedImagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  transformButtonContainer: {
    paddingHorizontal: 40,
    marginTop: 8,
    marginBottom: 8,
  },
  transformButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00b894',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  transformButtonDisabled: {
    shadowColor: '#95a5a6',
    shadowOpacity: 0.2,
    opacity: 0.7,
  },
  transformButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 10,
  },
  transformButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navItemText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  navItemTextActive: {
    fontSize: 12,
    color: '#6c5ce7',
    fontWeight: 'bold',
  },
  resultModalContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  resultModalContent: {
    flexGrow: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  resultModalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  resultImageContainer: {
    width: width - 40,
    height: height * 0.4,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: '#FFF',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  promptTextContainer: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  promptTextTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  promptTextSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  resultActionsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  resultActionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resultActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  resultActionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderWidth: 2,
    borderColor: '#6c5ce7',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c5ce7',
    textAlign: 'center',
  },
  floatingProButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  floatingProGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  floatingProText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
