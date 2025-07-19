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

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ARTIST_STYLES } from '@/constants/Config';
import { useUser } from '@/hooks/useUser';
import { ImageUtils } from '@/lib/imageUtils';

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 2;

// Mock data - in a real app, this would come from Supabase
const mockTransformations = [
  {
    id: '1',
    originalImageUrl: 'https://example.com/original1.jpg',
    transformedImageUrl: 'https://replicate.delivery/pbxt/example1.jpg',
    artistStyle: 'caravaggio',
    createdAt: '2024-01-15T10:00:00Z',
    status: 'completed'
  },
  {
    id: '2',
    originalImageUrl: 'https://example.com/original2.jpg',
    transformedImageUrl: 'https://replicate.delivery/pbxt/example2.jpg',
    artistStyle: 'velazquez',
    createdAt: '2024-01-14T15:30:00Z',
    status: 'completed'
  },
  {
    id: '3',
    originalImageUrl: 'https://example.com/original3.jpg',
    transformedImageUrl: 'https://replicate.delivery/pbxt/example3.jpg',
    artistStyle: 'goya',
    createdAt: '2024-01-13T09:15:00Z',
    status: 'completed'
  },
];

export default function GalleryScreen() {
  const { user, transformations, loading } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'caravaggio' | 'velazquez' | 'goya'>('all');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // In a real app, fetch fresh data from Supabase
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleSaveImage = async (imageUrl: string) => {
    await ImageUtils.saveToGallery(imageUrl);
  };

  const filteredTransformations = transformations.filter(t => 
    selectedFilter === 'all' || t.artistStyle === selectedFilter
  );

  const renderFilterButton = (filter: typeof selectedFilter, label: string, icon?: string) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <LinearGradient
        colors={selectedFilter === filter ? ['#667eea', '#764ba2'] : ['#f8f9fa', '#e9ecef']}
        style={styles.filterGradient}
      >
        {icon && <ThemedText style={styles.filterIcon}>{icon}</ThemedText>}
        <ThemedText style={[
          styles.filterText,
          selectedFilter === filter && styles.filterTextActive
        ]}>
          {label}
        </ThemedText>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderTransformationCard = (transformation: any) => {
    const artist = ARTIST_STYLES[transformation.artistStyle as keyof typeof ARTIST_STYLES];
    
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
              {artist.icon} {artist.name}
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
        {/* Filter Buttons */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {renderFilterButton('all', 'All Styles')}
              {renderFilterButton('caravaggio', 'Caravaggio', '🎭')}
              {renderFilterButton('velazquez', 'Velázquez', '👑')}
              {renderFilterButton('goya', 'Goya', '🖼️')}
            </View>
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
}); 