import { createClient } from '@supabase/supabase-js';

// Check for required env variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

// For server-side operations, use service role key if available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing API key: Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);
console.log('Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false // Since we're using NextAuth for auth, don't persist Supabase session
  }
});

// For backward compatibility with existing code
export default supabase;

// User management
export async function createOrUpdateUser(userData: any) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      spotify_id: userData.id,
      email: userData.email,
      display_name: userData.display_name,
      profile_image: userData.images?.[0]?.url || null,
      last_login: new Date(),
    }, {
      onConflict: 'spotify_id',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function getUserBySpotifyId(spotifyId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('spotify_id', spotifyId)
    .single();

  if (error) throw error;
  return data;
}

// Favorites
export async function addFavorite(userId: string, itemId: string, itemType: string) {
  const { data, error } = await supabase
    .from('favorites')
    .upsert({
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
      added_at: new Date(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavorite(userId: string, itemId: string, itemType: string) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .match({
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
    });

  if (error) throw error;
  return true;
}

export async function getFavorites(userId: string, itemType?: string) {
  let query = supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId);

  if (itemType) {
    query = query.eq('item_type', itemType);
  }

  const { data, error } = await query.order('added_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function checkIsFavorite(userId: string, itemId: string, itemType: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .match({
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
    })
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return !!data;
}

// Ratings
export async function addOrUpdateRating(userId: string, itemId: string, itemType: string, rating: number, review?: string, context?: string) {
  const { data, error } = await supabase
    .from('ratings')
    .upsert({
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
      rating,
      review,
      context,
      updated_at: new Date(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRatingsByUser(userId: string, itemType?: string) {
  let query = supabase
    .from('ratings')
    .select('*')
    .eq('user_id', userId);

  if (itemType) {
    query = query.eq('item_type', itemType);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRatingForItem(userId: string, itemId: string, itemType: string) {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .match({
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
    })
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error
  return data;
}

// Moods
export async function initializeUserMoods(userId: string) {
  const { data, error } = await supabase.rpc('initialize_user_moods', {
    user_id: userId
  });

  if (error) throw error;
  return data;
}

export async function updateMoodTrack(userId: string, moodId: string, trackData: {
  track_id: string;
  track_name: string;
  artist_name: string;
  track_image?: string;
}) {
  const { data, error } = await supabase.rpc('update_mood_track', {
    p_user_id: userId,
    p_mood_id: moodId,
    p_track_id: trackData.track_id,
    p_track_name: trackData.track_name,
    p_artist_name: trackData.artist_name,
    p_track_image: trackData.track_image
  });

  if (error) throw error;
  return data;
}

export async function getUserMoods(userId: string) {
  console.log(`Supabase: Fetching user moods for user ${userId}`);
  
  try {
    if (!userId) {
      console.error('Supabase: getUserMoods called without userId');
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabase
      .from('user_moods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Supabase: Error fetching user moods:', error);
      throw error;
    }
    
    console.log(`Supabase: Successfully fetched ${data?.length || 0} user moods`);
    return data || [];
  } catch (error) {
    console.error('Supabase: Exception fetching user moods:', error);
    throw error;
  }
}

export async function getStapleMoods() {
  console.log('Supabase: Fetching staple moods');
  
  try {
    const { data, error } = await supabase
      .from('staple_moods')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Supabase: Error fetching staple moods:', error);
      throw error;
    }
    
    console.log(`Supabase: Successfully fetched ${data?.length || 0} staple moods`);
    return data || [];
  } catch (error) {
    console.error('Supabase: Exception fetching staple moods:', error);
    throw error;
  }
}

export async function getStapleMoodTracks() {
  console.log('Supabase: Fetching staple mood tracks');
  
  try {
    const { data, error } = await supabase
      .from('mood_tracks')
      .select(`
        id,
        user_id,
        track_id,
        track_name,
        artist_name,
        track_image,
        added_at,
        staple_mood_id,
        staple_moods (mood_name)
      `)
      .not('staple_mood_id', 'is', null)
      .order('added_at', { ascending: false });
      
    if (error) {
      console.error('Supabase: Error fetching staple mood tracks:', error);
      throw error;
    }
    
    // Format the data to flatten the structure
    const formattedData = data?.map(track => ({
      ...track,
      mood_name: track.staple_moods?.mood_name
    })) || [];
    
    console.log(`Supabase: Successfully fetched ${formattedData.length} staple mood tracks`);
    return formattedData;
  } catch (error) {
    console.error('Supabase: Exception fetching staple mood tracks:', error);
    throw error;
  }
}

export async function addTrackToStapleMood(userId: string, moodId: string, trackData: any) {
  console.log(`Supabase: Adding track ${trackData.track_id} to staple mood ${moodId} for user ${userId}`);
  
  try {
    // Check required parameters
    if (!userId) {
      console.error('Supabase: addTrackToStapleMood called without userId');
      throw new Error('User ID is required');
    }
    
    if (!moodId) {
      console.error('Supabase: addTrackToStapleMood called without moodId');
      throw new Error('Mood ID is required');
    }
    
    if (!trackData || !trackData.track_id) {
      console.error('Supabase: addTrackToStapleMood called without valid trackData');
      throw new Error('Valid track data is required');
    }
    
    // Check for existing track in this mood
    console.log('Supabase: Checking if track already exists in mood');
    try {
      const { data: existingTrack, error: lookupError } = await supabase
        .from('mood_tracks')
        .select('id')
        .eq('staple_mood_id', moodId)
        .eq('track_id', trackData.track_id)
        .maybeSingle();
        
      if (lookupError) {
        console.warn('Supabase: Error checking for existing track:', lookupError);
      } else if (existingTrack) {
        console.log('Supabase: Track already exists in this mood, skipping insert');
        return existingTrack;
      }
    } catch (e) {
      console.warn('Supabase: Exception checking for existing track:', e);
    }
    
    // Log the insert operation
    console.log('Supabase: Inserting track into mood_tracks table with data:', {
      user_id: userId,
      staple_mood_id: moodId,
      track_id: trackData.track_id,
      track_name: trackData.track_name,
      artist_name: trackData.artist_name,
      track_image: trackData.track_image
    });
    
    // Insert the track
    const { data, error } = await supabase
      .from('mood_tracks')
      .insert([
        { 
          user_id: userId,
          staple_mood_id: moodId,
          track_id: trackData.track_id,
          track_name: trackData.track_name || 'Unknown Track',
          artist_name: trackData.artist_name || 'Unknown Artist',
          track_image: trackData.track_image || null
        }
      ])
      .select()
      .single();
      
    if (error) {
      console.error('Supabase: Error adding track to staple mood:', error);
      
      // Check for specific error types
      if (error.code === '23505') { // Unique constraint violation
        console.log('Supabase: Unique constraint violation - track already exists in this mood');
        
        // Try to fetch the existing record
        const { data: existingTrack } = await supabase
          .from('mood_tracks')
          .select('*')
          .eq('staple_mood_id', moodId)
          .eq('track_id', trackData.track_id)
          .single();
          
        if (existingTrack) {
          console.log('Supabase: Returning existing track record');
          return existingTrack;
        }
      }
      
      throw error;
    }
    
    console.log(`Supabase: Successfully added track to staple mood:`, data);
    return data;
  } catch (error) {
    console.error('Supabase: Exception adding track to staple mood:', error);
    throw error;
  }
}

export async function removeTrackFromStapleMood(userId: string, stapleMoodId: string) {
  const { error } = await supabase
    .from('mood_tracks')
    .delete()
    .eq('user_id', userId)
    .eq('staple_mood_id', stapleMoodId);
  
  if (error) {
    console.error('Error removing track from staple mood:', error);
    throw new Error('Failed to remove track from staple mood');
  }
  
  return true;
}

export async function addMoodTrack(userId: string, moodId: string, trackData: {
  track_id: string;
  track_name: string;
  artist_name: string;
  track_image?: string;
  position?: number;
}) {
  const { data, error } = await supabase
    .from('user_mood_tracks')
    .insert({
      user_id: userId,
      mood_id: moodId,
      track_id: trackData.track_id,
      track_name: trackData.track_name,
      artist_name: trackData.artist_name,
      track_image: trackData.track_image,
      position: trackData.position || 1
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMoodTracks(userId: string, moodId: string) {
  const { data, error } = await supabase
    .from('user_mood_tracks')
    .select('*')
    .eq('user_id', userId)
    .eq('mood_id', moodId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data;
}

export async function removeMoodTrack(userId: string, moodId: string, trackId: string) {
  const { error } = await supabase
    .from('user_mood_tracks')
    .delete()
    .match({
      user_id: userId,
      mood_id: moodId,
      track_id: trackId
    });

  if (error) throw error;
  return true;
}

export async function updateMoodTrackPosition(userId: string, moodId: string, trackId: string, newPosition: number) {
  const { data, error } = await supabase
    .from('user_mood_tracks')
    .update({ position: newPosition })
    .match({
      user_id: userId,
      mood_id: moodId,
      track_id: trackId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMood(userId: string, moodId: string) {
  const { error } = await supabase
    .from('user_moods')
    .delete()
    .match({ id: moodId, user_id: userId });

  if (error) throw error;
  return true;
}

export async function createUserMood(userId: string, moodName: string, description?: string) {
  console.log(`Supabase: Creating user mood "${moodName}" for user ${userId}`);
  
  try {
    if (!userId) {
      console.error('Supabase: createUserMood called without userId');
      throw new Error('User ID is required');
    }
    
    if (!moodName) {
      console.error('Supabase: createUserMood called without moodName');
      throw new Error('Mood name is required');
    }
    
    const { data, error } = await supabase
      .from('user_moods')
      .insert([
        { 
          user_id: userId, 
          mood_name: moodName,
          description: description || `My ${moodName} mood`
        }
      ])
      .select()
      .single();
      
    if (error) {
      console.error('Supabase: Error creating user mood:', error);
      throw error;
    }
    
    console.log(`Supabase: Successfully created user mood:`, data);
    return data;
  } catch (error) {
    console.error('Supabase: Exception creating user mood:', error);
    throw error;
  }
}

export async function updateUserMood(userId: string, moodId: string, moodData: any) {
  const { data, error } = await supabase
    .from('user_moods')
    .update({
      mood_name: moodData.mood_name,
      description: moodData.description
    })
    .eq('id', moodId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user mood:', error);
    throw new Error('Failed to update user mood');
  }
  
  return data;
}

export async function deleteUserMood(userId: string, moodId: string) {
  const { error } = await supabase
    .from('user_moods')
    .delete()
    .eq('id', moodId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting user mood:', error);
    throw new Error('Failed to delete user mood');
  }
  
  return true;
}

export async function getUserMoodTracks(moodId: string) {
  console.log(`Supabase: Fetching tracks for user mood ${moodId}`);
  
  try {
    if (!moodId) {
      console.error('Supabase: getUserMoodTracks called without moodId');
      throw new Error('Mood ID is required');
    }
    
    const { data, error } = await supabase
      .from('mood_tracks')
      .select(`
        id,
        user_id,
        track_id,
        track_name,
        artist_name,
        track_image,
        added_at,
        user_mood_id
      `)
      .eq('user_mood_id', moodId)
      .order('added_at', { ascending: false });
      
    if (error) {
      console.error('Supabase: Error fetching user mood tracks:', error);
      throw error;
    }
    
    console.log(`Supabase: Successfully fetched ${data?.length || 0} tracks for user mood ${moodId}`);
    return data || [];
  } catch (error) {
    console.error('Supabase: Exception fetching user mood tracks:', error);
    throw error;
  }
}

export async function getUserMoodByName(userId: string, moodName: string) {
  console.log('Fetching user mood by name:', { userId, moodName });
  
  const { data, error } = await supabase
    .from('user_moods')
    .select('*')
    .eq('user_id', userId)
    .eq('mood_name', moodName)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Ignore "not found" error
    console.error('Error fetching user mood by name:', error);
    throw new Error('Failed to fetch user mood by name');
  }
  
  return data;
}

export async function addTrackToUserMood(userId: string, moodId: string, trackData: any) {
  console.log(`Supabase: Adding track ${trackData.track_id} to user mood ${moodId}`);
  
  try {
    if (!userId) {
      console.error('Supabase: addTrackToUserMood called without userId');
      throw new Error('User ID is required');
    }
    
    if (!moodId) {
      console.error('Supabase: addTrackToUserMood called without moodId');
      throw new Error('Mood ID is required');
    }
    
    if (!trackData || !trackData.track_id) {
      console.error('Supabase: addTrackToUserMood called without valid trackData');
      throw new Error('Valid track data is required');
    }
    
    const { data, error } = await supabase
      .from('mood_tracks')
      .insert([
        { 
          user_id: userId,
          user_mood_id: moodId,
          track_id: trackData.track_id,
          track_name: trackData.track_name || 'Unknown Track',
          artist_name: trackData.artist_name || 'Unknown Artist',
          track_image: trackData.track_image || null
        }
      ])
      .select()
      .single();
      
    if (error) {
      console.error('Supabase: Error adding track to user mood:', error);
      throw error;
    }
    
    console.log(`Supabase: Successfully added track to user mood:`, data);
    return data;
  } catch (error) {
    console.error('Supabase: Exception adding track to user mood:', error);
    throw error;
  }
}

export async function removeTrackFromUserMood(userId: string, moodId: string, trackId: string) {
  const { error } = await supabase
    .from('mood_tracks')
    .delete()
    .eq('user_id', userId)
    .eq('user_mood_id', moodId)
    .eq('track_id', trackId);
  
  if (error) {
    console.error('Error removing track from user mood:', error);
    throw new Error('Failed to remove track from user mood');
  }
  
  return true;
} 