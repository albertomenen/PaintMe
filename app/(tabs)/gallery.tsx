import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { ARTIST_STYLES, ANIME_STYLES } from '../../constants/Config';
import { useUser } from '../../hooks/useUser';
import { ImageUtils } from '../../lib/imageUtils';
import { Analytics } from '../../lib/analytics';

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 2;



export default function GalleryScreen() {
  const { user, transformations, loading } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | keyof typeof ARTIST_STYLES | keyof typeof ANIME_STYLES>('all');
  const [selectedCategory, setSelectedCategory] = useState<'artists' | 'anime'>('artists');

  // Track gallery view
  React.useEffect(() => {
    Analytics.trackGalleryViewed();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // In a real app, fetch fresh data from Supabase
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleSaveImage = async (imageUrl: string) => {
    await ImageUtils.saveToGallery(imageUrl);
    Analytics.trackImageSaved();
  };

  const filteredTransformations = transformations.filter(t => 
    selectedFilter === 'all' || t.artistStyle === selectedFilter
  );


  const renderTransformationCard = (transformation: any) => {
    const artist = ARTIST_STYLES[transformation.artistStyle as keyof typeof ARTIST_STYLES] ||
                  ANIME_STYLES[transformation.artistStyle as keyof typeof ANIME_STYLES];

    if (!transformation.transformedImageUrl) return null;
    
    return (
      <TouchableOpacity 
        key={transformation.id} 
        style={styles.imageCard}
        onLongPress={() => handleSaveImage(transformation.transformedImageUrl)}
      >
        <Image 
          source={{ uri: transformation.transformedImageUrl }} 
          style={styles.galleryImage}
          placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.imageOverlay}
        >
          <View style={styles.imageInfo}>
            <ThemedText style={styles.artistTag}>
              {artist.name}
            </ThemedText>
            <ThemedText style={styles.dateText}>
              {new Date(transformation.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>
          <TouchableOpacity 
            style={styles.downloadIcon}
            onPress={() => handleSaveImage(transformation.transformedImageUrl)}
          >
            <Ionicons name="download" size={16} color="white" />
          </TouchableOpacity>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <ThemedText style={styles.title}>My Gallery</ThemedText>
        <ThemedText style={styles.subtitle}>
          Your artistic transformations
        </ThemedText>
      </LinearGradient>

      <ThemedView style={styles.content}>
        {/* Category Selector */}
        <View style={styles.categoryContainer}>
          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'artists' && styles.categoryButtonActive]}
            onPress={() => { setSelectedCategory('artists'); setSelectedFilter('all'); }}
          >
            <LinearGradient
              colors={selectedCategory === 'artists' ? ['#667eea', '#764ba2'] : ['#f8f9fa', '#e9ecef']}
              style={styles.categoryGradient}
            >
              <ThemedText style={[styles.categoryText, selectedCategory === 'artists' && styles.categoryTextActive]}>🎨 Classic Artists</ThemedText>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryButton, selectedCategory === 'anime' && styles.categoryButtonActive]}
            onPress={() => { setSelectedCategory('anime'); setSelectedFilter('all'); }}
          >
            <LinearGradient
              colors={selectedCategory === 'anime' ? ['#ff6b6b', '#ee5a52'] : ['#f8f9fa', '#e9ecef']}
              style={styles.categoryGradient}
            >
              <ThemedText style={[styles.categoryText, selectedCategory === 'anime' && styles.categoryTextActive]}>⚡ Anime Styles</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Style Carousel */}
        <View style={styles.stylesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stylesCarousel}>
            <TouchableOpacity
              style={[styles.styleCard, selectedFilter === 'all' && styles.styleCardActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <LinearGradient
                colors={selectedFilter === 'all' ? ['#667eea', '#764ba2'] : ['#ffffff', '#f8f9fa']}
                style={styles.styleCardGradient}
              >
                <ThemedText style={styles.styleEmoji}>🌟</ThemedText>
                <ThemedText style={[styles.styleName, selectedFilter === 'all' && styles.styleNameActive]}>All</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            {selectedCategory === 'artists' ?
              Object.entries(ARTIST_STYLES).map(([key, style]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.styleCard, selectedFilter === key && styles.styleCardActive]}
                  onPress={() => setSelectedFilter(key as keyof typeof ARTIST_STYLES)}
                >
                  <LinearGradient
                    colors={selectedFilter === key ? style.gradientColors : ['#ffffff', '#f8f9fa']}
                    style={styles.styleCardGradient}
                  >
                    <View style={styles.styleImageContainer}>
                      <Image source={style.sampleImage} style={styles.styleImage} />
                    </View>
                    <ThemedText style={[styles.styleName, selectedFilter === key && styles.styleNameActive]}>{style.name}</ThemedText>
                    <ThemedText style={[styles.stylePeriod, selectedFilter === key && styles.stylePeriodActive]}>{style.period}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              )) :
              Object.entries(ANIME_STYLES).map(([key, style]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.styleCard, selectedFilter === key && styles.styleCardActive]}
                  onPress={() => setSelectedFilter(key as keyof typeof ANIME_STYLES)}
                >
                  <LinearGradient
                    colors={selectedFilter === key ? style.gradientColors : ['#ffffff', '#f8f9fa']}
                    style={styles.styleCardGradient}
                  >
                    <View style={styles.styleImageContainer}>
                      <Image source={style.sampleImage} style={styles.styleImage} />
                    </View>
                    <ThemedText style={[styles.styleName, selectedFilter === key && styles.styleNameActive]}>{style.name}</ThemedText>
                    <ThemedText style={[styles.stylePeriod, selectedFilter === key && styles.stylePeriodActive]}>{style.period}</ThemedText>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            }
          </ScrollView>
        </View>

        {/* Stats */}
        {user && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{transformations.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Masterpieces</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {new Set(transformations.map(t => t.artistStyle)).size}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Artists</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {user.credits}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Credits</ThemedText>
            </View>
          </View>
        )}

        {/* Gallery Grid */}
        {filteredTransformations.length > 0 ? (
          <View style={styles.gallery}>
            <View style={styles.galleryGrid}>
              {filteredTransformations.map(renderTransformationCard)}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={80} color="#ccc" />
            <ThemedText style={styles.emptyTitle}>No masterpieces yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Go to the Transform tab to create your first artwork!
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  filterGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 6,
    fontSize: 16,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 20,
  },
  gallery: {
    flex: 1,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
  },
  imageCard: {
    width: imageSize,
    height: imageSize,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  imageInfo: {
    gap: 4,
  },
  artistTag: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
  },
  downloadIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#666',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    lineHeight: 20,
  },
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  categoryButton: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
  },
  categoryButtonActive: {
    transform: [{ scale: 1.02 }],
  },
  categoryGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
  },
  stylesContainer: {
    marginBottom: 20,
  },
  stylesCarousel: {
    paddingRight: 20,
  },
  styleCard: {
    width: 120,
    height: 160,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  styleCardActive: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  styleCardGradient: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  styleImage: {
    width: '100%',
    height: '100%',
  },
  styleEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  styleName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 2,
  },
  styleNameActive: {
    color: 'white',
  },
  stylePeriod: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    opacity: 0.8,
  },
  stylePeriodActive: {
    color: 'rgba(255,255,255,0.9)',
  },
}); 