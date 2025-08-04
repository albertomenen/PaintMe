import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  credits: number;
  imageGenerationsRemaining: number;
  totalTransformations: number;
  favoriteArtist?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transformation {
  id: string;
  userId: string;
  originalImageUrl: string;
  transformedImageUrl?: string;
  artistStyle: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transformations, setTransformations] = useState<Transformation[]>([]);
  const [imageGenerationsRemaining, setImageGenerationsRemaining] = useState(0);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setTransformations([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
  

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      // First, check if user profile exists
      let { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create profile
        const newUser = {
          id: authUser.id,
          email: authUser.email!,
          credits: 1, // Give new users 1 free credit
          total_transformations: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error: insertError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return;
        }

        profile = data;
      } else if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      // Debug: Ver qué datos tenemos de la base de datos
      console.log('🔍 Raw profile data from DB:', {
        id: profile.id,
        email: profile.email,
        credits: profile.credits,
        image_generations_remaining: profile.image_generations_remaining,
        total_transformations: profile.total_transformations
      });

      // Convert snake_case to camelCase for our interface
      const userProfile: User = {
        id: profile.id,
        email: profile.email,
        credits: profile.credits,
        imageGenerationsRemaining: profile.image_generations_remaining ?? 1,
        totalTransformations: profile.total_transformations,
        favoriteArtist: profile.favorite_artist,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };

      console.log('✅ Profile loaded - imageGenerationsRemaining:', userProfile.imageGenerationsRemaining);

      setUser(userProfile);

      // Load user transformations
      await loadTransformations(authUser.id);
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransformations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('transformations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });


      // Convert snake_case to camelCase
      const transformationsList: Transformation[] = data.map(t => ({
        id: t.id,
        userId: t.user_id,
        originalImageUrl: t.original_image_url,
        transformedImageUrl: t.transformed_image_url,
        artistStyle: t.artist_style,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));

      setTransformations(transformationsList);
    } catch (error) {
      
    }
  };

  const updateCredits = async (newCredits: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating credits:', error);
        return;
      }

      setUser(prev => prev ? { ...prev, credits: newCredits } : null);
    } catch (error) {
      console.error('Error updating credits:', error);
    }
  };

  const addImageGenerations = async (amount: number) => {
    if (!user) return;

    const newTotal = user.imageGenerationsRemaining + amount;
    console.log('🔄 Adding generations:', amount, 'New total will be:', newTotal);
    
    // Intentar actualizar en la base de datos PRIMERO
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          image_generations_remaining: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('image_generations_remaining')
        .single();

      if (error) {
        console.error('❌ Database update failed:', error);
        return;
      }

      console.log('✅ Database updated successfully. New value:', data.image_generations_remaining);
      
      // Actualizar estado local solo si la DB se actualizó correctamente
      setUser(prev => prev ? { ...prev, imageGenerationsRemaining: data.image_generations_remaining } : null);
      console.log('✅ Local state updated. Total generations:', data.image_generations_remaining);
      
      // Trigger update for all components
      setUpdateTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('❌ Database error:', error);
    }
  };

  const decrementImageGenerations = async () => {
    if (!user || user.imageGenerationsRemaining <= 0) return;

    const newTotal = user.imageGenerationsRemaining - 1;
    console.log('🔄 Decrementing generations from', user.imageGenerationsRemaining, 'to', newTotal);
    
    // Intentar actualizar en la base de datos PRIMERO
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ 
          image_generations_remaining: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('image_generations_remaining')
        .single();

      if (error) {
        console.error('❌ Database decrement failed:', error);
        return;
      }

      console.log('✅ Database decremented successfully. New value:', data.image_generations_remaining);
      
      // Actualizar estado local solo si la DB se actualizó correctamente
      setUser(prev => prev ? { ...prev, imageGenerationsRemaining: data.image_generations_remaining } : null);
      console.log('✅ Local state decremented. Total generations:', data.image_generations_remaining);
      
      // Trigger update for all components
      setUpdateTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('❌ Database decrement error:', error);
    }
  };

  const addTransformation = async (transformation: Omit<Transformation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return null;

    try {
      const newTransformation = {
        user_id: user.id,
        original_image_url: transformation.originalImageUrl,
        transformed_image_url: transformation.transformedImageUrl,
        artist_style: transformation.artistStyle,
        status: transformation.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('transformations')
        .insert(newTransformation)
        .select()
        .single();

      if (error) {
        console.error('Error adding transformation:', error);
        return null;
      }

      const transformationResult: Transformation = {
        id: data.id,
        userId: data.user_id,
        originalImageUrl: data.original_image_url,
        transformedImageUrl: data.transformed_image_url,
        artistStyle: data.artist_style,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setTransformations(prev => [transformationResult, ...prev]);
      return transformationResult;
    } catch (error) {
      console.error('Error adding transformation:', error);
      return null;
    }
  };

  const updateTransformation = async (id: string, updates: Partial<Transformation>) => {
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.transformedImageUrl !== undefined) {
        dbUpdates.transformed_image_url = updates.transformedImageUrl;
      }
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
      }
      if (updates.originalImageUrl !== undefined) {
        dbUpdates.original_image_url = updates.originalImageUrl;
      }

      const { error } = await supabase
        .from('transformations')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Error updating transformation:', error);
        return;
      }

      setTransformations(prev =>
        prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
      );
    } catch (error) {
      console.error('Error updating transformation:', error);
    }
  };

  const hasCredits = () => {
    return user ? user.credits > 0 : false;
  };

  const canTransform = () => {
    // Users can transform if they have image generations remaining
    return user ? user.imageGenerationsRemaining > 0 : false;
  };

  return {
    user,
    loading,
    transformations,
    updateCredits,
    addImageGenerations,
    decrementImageGenerations,
    addTransformation,
    updateTransformation,
    hasCredits,
    canTransform,
    updateTrigger,
    refreshUser: () => loadUserProfile,
  };
}

// Hook for managing authentication
export function useAuth() {
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      return { 
        success: !error, 
        error: error?.message,
        data 
      };
    } catch (error) {
      return { 
        success: false, 
        error: 'Authentication failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            credits: 1
          }
        }
      });
      
      return { 
        success: !error, 
        error: error?.message,
        data 
      };
    } catch (error) {
      return { 
        success: false, 
        error: 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      return { 
        success: !error, 
        error: error?.message 
      };
    } catch (error) {
      return { 
        success: false, 
        error: 'Sign out failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const getUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return { user, error };
    } catch (error) {
      return { user: null, error };
    }
  };

  return {
    loading,
    signIn,
    signUp,
    signOut,
    getUser,
  };
} 