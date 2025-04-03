import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export interface ActiveUser {
  id: string;
  display_name: string;
  profile_image: string | null;
  activity_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    
    console.log('Users API called with session:', session ? 'authenticated' : 'not authenticated');
    console.log('Current user ID:', currentUserId || 'not authenticated');
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Parse the URL to get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const includeCurrentUser = searchParams.get('includeCurrentUser') === 'true';
    
    console.log(`Query params: limit=${limit}, includeCurrentUser=${includeCurrentUser}`);
    
    // First, check if we have any users at all
    const { count: totalUserCount, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total user count in database: ${totalUserCount || 0}`);
    
    if (countError) {
      console.error('Error counting users:', countError);
    }
    
    // Debugging: Get all users to see what's in the database
    console.log('DEBUG: Performing raw query to list all users in database:');
    const { data: allUsersDebug, error: debugError } = await supabase
      .from('users')
      .select('id, spotify_id, display_name')
      .limit(10);
    
    if (debugError) {
      console.error('Debug query error:', debugError);
    } else {
      console.log('Users in database:', JSON.stringify(allUsersDebug, null, 2));
    }
    
    // Get all users from the database
    let query = supabase
      .from('users')
      .select('id, display_name, profile_image, spotify_id');
    
    // Exclude the current user if requested and if we have their ID
    if (currentUserId && !includeCurrentUser) {
      console.log('Excluding current user (spotify_id) from results:', currentUserId);
      query = query.neq('spotify_id', currentUserId);
    } else {
      console.log('Including all users in results');
    }
    
    const { data: allUsers, error: allUsersError } = await query.limit(limit);
    
    console.log(`Fetched ${allUsers?.length || 0} users from database`);
    
    if (allUsersError) {
      console.error('Error fetching users:', allUsersError);
      return NextResponse.json({ 
        users: [],
        error: 'Failed to fetch users from database'
      });
    }
    
    // Debug output for the users we found
    if (allUsers && allUsers.length > 0) {
      console.log('User IDs fetched:', allUsers.map(u => ({ 
        id: u.id, 
        spotify_id: u.spotify_id,
        display_name: u.display_name
      })));
    }
    
    // Combine users with activity counts (if available)
    let usersWithActivityCounts: ActiveUser[] = [];
    
    // First check if user_activities table exists
    const { count: activitiesTableCount, error: activitiesTableError } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true });
    
    const hasActivitiesTable = activitiesTableCount !== null && !activitiesTableError;
    
    if (allUsers && allUsers.length > 0) {
      if (hasActivitiesTable) {
        console.log('Getting activity counts for users');
        
        // Get activity records
        const { data: activities } = await supabase
          .from('user_activities')
          .select('user_id');
        
        // Count activities per user
        const userActivityCounts: Record<string, number> = {};
        activities?.forEach(activity => {
          if (activity.user_id) {
            userActivityCounts[activity.user_id] = (userActivityCounts[activity.user_id] || 0) + 1;
          }
        });
        
        // Map users to their activity counts
        usersWithActivityCounts = allUsers.map(user => ({
          id: user.spotify_id || user.id, // Use Spotify ID if available, otherwise use DB ID
          display_name: user.display_name || 'User',
          profile_image: user.profile_image || null,
          activity_count: userActivityCounts[user.id] || 0
        }));
      } else {
        // If no activities table, just return users with 0 activity count
        usersWithActivityCounts = allUsers.map(user => ({
          id: user.spotify_id || user.id,
          display_name: user.display_name || 'User',
          profile_image: user.profile_image || null,
          activity_count: 0
        }));
      }
    }
    
    console.log(`Returning ${usersWithActivityCounts.length} processed users`);
    return NextResponse.json({ users: usersWithActivityCounts });
    
  } catch (error) {
    console.error('Unexpected error in users API:', error);
    
    // In case of error, return empty array
    return NextResponse.json({ 
      users: [],
      error: 'Internal server error'
    });
  }
} 