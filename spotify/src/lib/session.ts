import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import { supabase } from './supabase';

/**
 * Get the current user session
 * This is a helper function that centralizes session management
 * and works with our specific authentication setup
 */
export async function getSession() {
  try {
    // Get Next-Auth session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('No authenticated user session found');
      return null;
    }
    
    // Log session details for debugging
    console.log('Session user:', {
      email: session.user.email,
      id: session.user.id
    });
    
    // Return the session directly - we'll look up users by email in API routes as needed
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Look up a user in the database by email
 * This function doesn't create a user if one doesn't exist
 */
export async function getUserByEmail(email: string) {
  try {
    if (!email) {
      console.error('No email provided to getUserByEmail');
      return null;
    }
    
    console.log('Looking up user by email:', email);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, display_name')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error looking up user by email:', error);
      return null;
    }
    
    if (!data) {
      console.log('No user found with email:', email);
      return null;
    }
    
    console.log('Found user:', data);
    return data;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
}

/**
 * Gets the user ID from the current session
 * @returns User ID if found, null otherwise
 */
export async function getUserId(): Promise<string | null> {
  try {
    console.log('Session: Getting server session');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.error('Session: No valid session found');
      return null;
    }
    
    console.log(`Session: Found session for user ${session.user.email}`);
    
    // First try: Get user from database by email
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .limit(1);
      
    if (error) {
      console.error('Session: Error fetching user from database:', error);
    }
    
    if (users && users.length > 0) {
      console.log(`Session: Found user ID ${users[0].id} for ${session.user.email}`);
      return users[0].id;
    }
    
    // Second try: If user not found by email, try by auth ID if available
    if (session.user.id) {
      console.log(`Session: Trying to find user by auth ID ${session.user.id}`);
      
      const { data: usersByAuthId, error: authIdError } = await supabase
        .from('users')
        .select('id')
        .eq('spotify_id', session.user.id)
        .limit(1);
        
      if (authIdError) {
        console.error('Session: Error fetching user by auth ID:', authIdError);
      }
      
      if (usersByAuthId && usersByAuthId.length > 0) {
        console.log(`Session: Found user ID ${usersByAuthId[0].id} by auth ID`);
        return usersByAuthId[0].id;
      }
      
      // If still not found, create a new user entry
      console.log(`Session: User not found in database, creating new user for ${session.user.email}`);
      
      try {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              email: session.user.email,
              spotify_id: session.user.id,
              display_name: session.user.name || session.user.email?.split('@')[0] || 'User',
              profile_image: session.user.image || null,
              last_login: new Date()
            }
          ])
          .select('id')
          .single();
          
        if (createError) {
          console.error('Session: Error creating new user:', createError);
          return null;
        }
        
        console.log(`Session: Created new user with ID ${newUser.id}`);
        return newUser.id;
      } catch (createError) {
        console.error('Session: Error creating new user:', createError);
      }
    }
    
    console.error(`Session: User with email ${session.user.email} not found in database and couldn't be created`);
    return null;
  } catch (error) {
    console.error('Session: Unexpected error getting user ID:', error);
    return null;
  }
}

/**
 * Check if the user is authenticated
 * @returns Boolean indicating if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session?.user;
} 