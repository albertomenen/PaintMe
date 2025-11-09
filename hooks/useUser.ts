import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  credits: number;
  imageGenerationsRemaining: number;
  totalTransformations: number;
  favoriteArtist?: string;
  isPremium: boolean;
  subscriptionType?: string | null;
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
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        loadUserProfile(session.user).finally(() => {
          if (isMounted) setIsInitialized(true);
        });
      } else {
        setLoading(false);
        setIsInitialized(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Skip initial SIGNED_IN event if we already initialized
        if (event === 'SIGNED_IN' && !isInitialized) {
          console.log('⏭️ Skipping duplicate SIGNED_IN event - already initialized');
          return;
        }

        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setTransformations([]);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);
  

  const loadUserProfile = async (authUser: SupabaseUser) => {
    console.log('🔄 Loading user profile for:', authUser.id);

    try {
      setLoading(true);

      // First, check if user profile exists
      let { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create profile
        console.log('🆕 Creating new user profile...');
        const newUser = {
          id: authUser.id,
          email: authUser.email!,
          credits: 1, // Give new users 1 free credit
          image_generations_remaining: 1,
          total_transformations: 0,
          is_premium: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data, error: insertError } = await supabase
          .from('users')
          .insert(newUser)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating user profile:', insertError);
          setLoading(false);
          return;
        }

        profile = data;
        console.log('✅ New user profile created');
      } else if (error) {
        console.error('❌ Error loading user profile:', error);
        setLoading(false);
        return;
      }

      // Debug: Ver qué datos tenemos de la base de datos
      console.log('🔍 Raw profile data from DB:', {
        id: profile.id,
        email: profile.email,
        credits: profile.credits,
        image_generations_remaining: profile.image_generations_remaining,
        total_transformations: profile.total_transformations,
        is_premium: profile.is_premium
      });

      // Convert snake_case to camelCase for our interface
      const userProfile: User = {
        id: profile.id,
        email: profile.email,
        credits: profile.credits,
        imageGenerationsRemaining: profile.image_generations_remaining ?? 1,
        totalTransformations: profile.total_transformations,
        favoriteArtist: profile.favorite_artist,
        isPremium: profile.is_premium ?? false,
        subscriptionType: profile.subscription_type,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };

      console.log('✅ Profile loaded:', {
        imageGenerationsRemaining: userProfile.imageGenerationsRemaining,
        isPremium: userProfile.isPremium,
        subscriptionType: userProfile.subscriptionType
      });

      setUser(userProfile);

      // Load user transformations
      await loadTransformations(authUser.id);

      console.log('✅ User profile fully loaded');
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
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
      const transformationsList: Transformation[] = (data || []).map(t => ({
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
      
      // Force immediate global state update
      setTimeout(() => {
        setUpdateTrigger(prev => prev + 1);
      }, 100);
      
    } catch (error) {
      console.error('❌ Database error:', error);
    }
  };

  const decrementImageGenerations = async () => {
    if (!user) return;

    // Premium users don't consume credits
    if (user.isPremium) {
      console.log('✨ Premium user - skipping credit decrement');
      return;
    }

    if (user.imageGenerationsRemaining <= 0) return;

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
      
      // Force immediate global state update
      setTimeout(() => {
        setUpdateTrigger(prev => prev + 1);
      }, 100);
      
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
    if (!user) return false;

    // Premium users have unlimited transformations
    if (user.isPremium) {
      console.log('✅ User is premium - unlimited transformations');
      return true;
    }

    // Non-premium users need credits
    const hasCredits = user.imageGenerationsRemaining > 0;
    console.log('🔍 Non-premium user - has credits:', hasCredits);
    return hasCredits;
  };

  const updatePremiumStatus = async (isPremium: boolean, subscriptionType?: string) => {
    if (!user) return;

    console.log('🔄 Updating premium status:', isPremium, subscriptionType);

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          is_premium: isPremium,
          subscription_type: subscriptionType || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select('is_premium, subscription_type')
        .single();

      if (error) {
        console.error('❌ Failed to update premium status:', error);
        return;
      }

      console.log('✅ Premium status updated in database:', data);

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        isPremium: data.is_premium ?? false,
        subscriptionType: data.subscription_type
      } : null);

      // Trigger update for all components
      setUpdateTrigger(prev => prev + 1);

      console.log('✅ Local premium state updated');

    } catch (error) {
      console.error('❌ Error updating premium status:', error);
    }
  };

  const forceUpdate = () => {
    setUpdateTrigger(prev => prev + 1);
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
    updatePremiumStatus,
    forceUpdate,
    refreshUser: async () => {
      console.log('🔄 Manually refreshing user data...');

      // Always try to get the auth user, even if local state doesn't have it
      const { data: { user: authUser }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('❌ Error getting auth user:', error);
        return;
      }

      if (authUser) {
        await loadUserProfile(authUser);
        console.log('✅ User data refreshed');
      } else {
        console.warn('⚠️ No authenticated user found');
      }
    },
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