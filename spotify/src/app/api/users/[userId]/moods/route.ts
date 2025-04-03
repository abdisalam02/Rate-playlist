import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

// Cache control directives
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

/**
 * GET /api/users/[userId]/moods
 * Get moods for a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId?: string } }
) {
  try {
    // Get userId safely from destructured params
    let userId = params?.userId;
    
    // First, check if the user exists
    if (!userId) {
      // Fallback to looking up by Spotify ID
      console.log(`User ID ${userId} not found by direct ID lookup, trying spotify_id...`);
      const { data: spotifyUser, error: spotifyUserError } = await supabase
        .from('users')
        .select('id')
        .eq('spotify_id', userId) // Assuming the passed param might be spotify_id
        .single();
      
      if (spotifyUserError || !spotifyUser) {
        console.error('User not found by ID or spotify_id:', spotifyUserError);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Update userId to the actual database ID if found via spotify_id
      console.log(`Found user via spotify_id. Using database ID: ${spotifyUser.id}`);
      userId = spotifyUser.id; // This is now allowed because userId is 'let'
    }
    
    // Try to use rpc function if available
    let moodsData;
    try {
      const { data, error } = await supabase.rpc('get_user_moods', {
        user_id: userId
      });
      
      if (!error) {
        moodsData = data;
      } else {
        console.error('RPC function error:', error);
        throw error; // Go to fallback
      }
    } catch (rpcError) {
      // Fallback: Directly query the moods table
      console.log('Falling back to direct query for moods');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('user_moods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (fallbackError) {
        console.error('Error fetching user moods:', fallbackError);
        return NextResponse.json({ error: 'Failed to fetch user moods' }, { status: 500 });
      }
      
      moodsData = fallbackData || [];
    }
    
    // If no moods are found, return an empty array
    if (!moodsData || moodsData.length === 0) {
      console.log(`No custom moods found for user ${userId}. Returning empty array.`);
      return NextResponse.json({ 
        moods: [], // Return empty array
        message: 'No user moods found.' 
      });
    }
    
    return NextResponse.json({ moods: moodsData });
  } catch (error) {
    console.error('Error in GET /api/users/[userId]/moods:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      moods: [] // Return empty array for better error handling in frontend
    }, { status: 500 });
  }
} 