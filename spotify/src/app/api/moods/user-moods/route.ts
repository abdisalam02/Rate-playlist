import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMoods, createUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { checkDbConnection, checkTableExists } from '@/lib/db-status';
import { supabase } from '@/lib/supabase';

/**
 * Helper function to create standardized API responses
 */
function createApiResponse(success: boolean, data: any = null, message: string = '') {
  return NextResponse.json({
    success,
    timestamp: new Date().toISOString(),
    data,
    message
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * GET handler for /api/moods/user-moods
 * Returns all user moods for the authenticated user
 */
export async function GET(request: Request) {
  console.log(`GET /api/moods/user-moods - Fetching user moods`);
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // Ensure fallback for empty session.user
    if (session && !session.user) {
      // @ts-ignore: Force create user object if missing
      session.user = { email: null };
    }
    
    // For debugging
    console.log('Session in user-moods API:', session ? 'Exists' : 'Null', 
      session?.user ? `User email: ${session.user.email}` : 'No user in session');
    
    // In development mode, allow operation without strict authentication
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Modified condition to check if session exists even without email
    if (!session) {
      console.error('No session found for user moods request');
      // In development, provide empty moods instead of authorization error
      if (isDevelopment) {
        console.log('Development mode: returning empty user moods list');
        return createApiResponse(true, []);
      }
      return createApiResponse(false, null, 'Unauthorized');
    }
    
    // Get user ID
    let userId = await getUserId();
    console.log('Retrieved user ID for GET moods:', userId);
    
    // If no user ID and we're in development, use a placeholder
    if (!userId && isDevelopment) {
      // Use a valid UUID format for development user
      const devUserId = '00000000-0000-4000-a000-000000000001';
      userId = devUserId;
      console.log('Using development placeholder user ID:', userId);
      
      // Try to create the dev user in the database if it doesn't exist
      try {
        // Check if user exists first
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', devUserId)
          .maybeSingle();
          
        if (!existingUser) {
          console.log('Development user not found, creating one...');
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: devUserId,
              email: 'dev@example.com',
              spotify_id: 'spotify-dev-user',
              display_name: 'Development User',
              last_login: new Date()
            });
            
          if (createError) {
            console.warn('Failed to create development user:', createError);
          } else {
            console.log('Created development user in database');
          }
        } else {
          console.log('Development user already exists in database');
        }
      } catch (error) {
        console.warn('Error checking/creating development user:', error);
      }
      
      // Debug: List all moods in the database regardless of user
      try {
        const { data: allMoods, error: allMoodsError } = await supabase
          .from('user_moods')
          .select('*');
          
        if (allMoodsError) {
          console.error('Error listing all moods:', allMoodsError);
        } else {
          console.log(`Found ${allMoods.length} total moods in database:`);
          allMoods.forEach(mood => {
            console.log(`- Mood ID: ${mood.id}, Name: ${mood.mood_name}, User ID: ${mood.user_id}`);
          });
          
          // Return all moods for development testing if needed
          if (isDevelopment && allMoods.length > 0) {
            console.log('Development mode: returning all moods for testing');
            return createApiResponse(true, allMoods);
          }
        }
      } catch (error) {
        console.warn('Error listing all moods:', error);
      }
      
      // Check if dev user has any moods
      try {
        const { data: devMoods } = await supabase
          .from('user_moods')
          .select('*')
          .eq('user_id', userId);
          
        if (devMoods && devMoods.length > 0) {
          console.log(`Found ${devMoods.length} moods for development user`);
          return createApiResponse(true, devMoods);
        }
      } catch (error) {
        console.error('Error checking dev user moods:', error);
      }
      
      // Return empty array if no dev moods found
      console.log('No moods found for development user');
      return createApiResponse(true, []);
    }
    
    if (!userId) {
      console.error('User ID not found and could not be retrieved');
      // In development, return empty array for user testing
      if (isDevelopment) {
        console.log('Development mode: returning empty user moods list');
        return createApiResponse(true, []);
      }
      return createApiResponse(false, null, 'User not found');
    }
    
    // Get user moods
    const userMoods = await getUserMoods(userId);
    console.log(`Retrieved ${userMoods.length} user moods for user ${userId}`);
    
    return createApiResponse(true, userMoods);
  } catch (error) {
    console.error('Error fetching user moods:', error);
    // In development, provide empty array on error
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: returning empty user moods list after error');
      return createApiResponse(true, []);
    }
    return createApiResponse(false, null, 
      `Error fetching user moods: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * POST handler for /api/moods/user-moods
 * Creates a new user mood for the authenticated user
 */
export async function POST(request: Request) {
  console.log(`POST /api/moods/user-moods - Creating new user mood`);
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // For debugging
    console.log('Session in user-moods POST API:', session ? 'Exists' : 'Null', 
      session?.user ? `User email: ${session.user.email}` : 'No user in session');
    
    // Ensure fallback for empty session.user
    if (session && !session.user) {
      // @ts-ignore: Force create user object if missing
      session.user = { email: null };
      console.log('Created fallback user object in session');
    }
    
    // In development mode, allow operation without strict authentication
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!session) {
      console.error('No session found for creating user mood');
      return createApiResponse(false, null, 'Unauthorized');
    }
    
    // Get user ID
    let userId = await getUserId();
    console.log('Retrieved user ID:', userId);
    
    // If no user ID found but we have session data, create a user record
    if (!userId && session.user) {
      console.log('No user ID found but session exists, creating user record in database');
      
      try {
        // Generate a placeholder email if none exists
        const email = session.user.email || `user-${Date.now()}@example.com`;
        const name = session.user.name || email.split('@')[0] || 'User';
        
        // Create user in the database
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            email: email,
            spotify_id: session.user.id || `spotify-${Date.now()}`,
            display_name: name,
            profile_image: session.user.image || null,
            last_login: new Date()
          })
          .select('id')
          .single();
          
        if (error) {
          console.error('Error creating user in database:', error);
          if (isDevelopment) {
            // In development, create a temporary user ID with a valid UUID format
            userId = '00000000-0000-4000-a000-000000000001';
            console.log('Using temporary dev user ID:', userId);
          } else {
            return createApiResponse(false, null, 'Failed to create user record');
          }
        } else {
          userId = newUser.id;
          console.log(`Created new user record with ID: ${userId}`);
        }
      } catch (error) {
        console.error('Error creating user:', error);
        if (isDevelopment) {
          // In development, create a temporary user ID with a valid UUID format
          userId = '00000000-0000-4000-a000-000000000001';
          console.log('Using temporary dev user ID after error:', userId);
        } else {
          return createApiResponse(false, null, 'Error creating user');
        }
      }
    }
    
    // If we still don't have a user ID and we're in development, use a placeholder
    if (!userId && isDevelopment) {
      // Use a valid UUID format for development user
      const devUserId = '00000000-0000-4000-a000-000000000001';
      userId = devUserId;
      console.log('Using development placeholder user ID:', userId);
      
      // Try to create the dev user in the database if it doesn't exist
      try {
        // Check if user exists first
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', devUserId)
          .maybeSingle();
          
        if (!existingUser) {
          console.log('Development user not found, creating one...');
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: devUserId,
              email: 'dev@example.com',
              spotify_id: 'spotify-dev-user',
              display_name: 'Development User',
              last_login: new Date()
            });
            
          if (createError) {
            console.warn('Failed to create development user:', createError);
          } else {
            console.log('Created development user in database');
          }
        } else {
          console.log('Development user already exists in database');
        }
      } catch (error) {
        console.warn('Error checking/creating development user:', error);
      }
    }
    
    // If we still don't have a user ID, return an error
    if (!userId) {
      console.error('User ID not found and could not be created');
      return createApiResponse(false, null, 'User not found');
    }
    
    // Get mood data from request body
    const moodData = await request.json();
    console.log('Mood data:', moodData);
    
    if (!moodData.mood_name) {
      console.error('Missing required mood name');
      return createApiResponse(false, null, 'Missing required mood name');
    }
    
    // Create user mood
    const result = await createUserMood(
      userId, 
      moodData.mood_name, 
      moodData.description || `My ${moodData.mood_name} mood`
    );
    console.log('User mood created with data:', {
      userId,
      name: moodData.mood_name,
      description: moodData.description || `My ${moodData.mood_name} mood`,
      result
    });
    
    return createApiResponse(true, result, 'Mood created successfully');
  } catch (error) {
    console.error('Error creating user mood:', error);
    return createApiResponse(false, null, 
      `Error creating user mood: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 