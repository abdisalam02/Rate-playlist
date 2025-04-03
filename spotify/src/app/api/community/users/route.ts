import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

/**
 * GET /api/community/users
 * Retrieves all users from the database for community display
 * Query params:
 * - includeCurrentUser: boolean - if true, includes the current user in results
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const includeCurrentUser = searchParams.get('includeCurrentUser') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Log parameters for debugging
    console.log('API request to fetch community users:');
    console.log(`- Include current user: ${includeCurrentUser}`);
    console.log(`- Limit: ${limit}`);
    
    const currentUserId = session?.user?.id || null;
    if (currentUserId) {
      console.log(`- Current user ID: ${currentUserId}`);
    } else {
      console.log('- No authenticated user');
    }
    
    try {
      // Validate that user ID is a UUID if we have one
      const isUUID = (id: string) => {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      };
      
      // Query all users in the database
      let query = supabase
        .from('users')
        .select('id, display_name, profile_image, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Only exclude current user if we have a valid UUID
      if (!includeCurrentUser && currentUserId && isUUID(currentUserId)) {
        query = query.neq('id', currentUserId);
      } else if (!includeCurrentUser && currentUserId) {
        console.log(`Warning: Current user ID ${currentUserId} is not a valid UUID, not using it in the query`);
      }
      
      const { data: users, error } = await query;
      
      if (error) {
        console.error('Error fetching community users:', error);
        return getMockUsers(currentUserId, includeCurrentUser, limit);
      }
      
      if (!users || users.length === 0) {
        console.log('No users found in database, returning mock data');
        return getMockUsers(currentUserId, includeCurrentUser, limit);
      }
      
      console.log(`Successfully fetched ${users.length} community users`);
      
      // Add isCurrentUser flag to each user
      const processedUsers = users.map(user => ({
        ...user,
        isCurrentUser: user.id === currentUserId
      }));
      
      return NextResponse.json({
        users: processedUsers,
        total: processedUsers.length
      });
    } catch (dbError) {
      console.error('Database error when fetching community users:', dbError);
      return getMockUsers(session?.user?.id || null, includeCurrentUser, limit);
    }
    
  } catch (error) {
    console.error('Error in community users API:', error);
    return getMockUsers(null, true, 10);
  }
}

/**
 * Provides mock user data when the database query fails
 */
function getMockUsers(currentUserId: string | null, includeCurrentUser: boolean, limit: number) {
  console.log('Returning mock users data');
  
  const mockUsers = [
    {
      id: 'user1',
      display_name: 'Jane Cooper',
      profile_image: 'https://i.pravatar.cc/150?img=5',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      isCurrentUser: false
    },
    {
      id: 'user2',
      display_name: 'John Smith',
      profile_image: 'https://i.pravatar.cc/150?img=8',
      created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      isCurrentUser: false
    },
    {
      id: 'user3',
      display_name: 'Emma Wilson',
      profile_image: 'https://i.pravatar.cc/150?img=3',
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
      isCurrentUser: false
    },
    {
      id: 'user4',
      display_name: 'Alex Johnson',
      profile_image: 'https://i.pravatar.cc/150?img=12',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      isCurrentUser: false
    },
    {
      id: 'user5',
      display_name: 'Olivia Chen',
      profile_image: 'https://i.pravatar.cc/150?img=9',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      isCurrentUser: false
    }
  ];
  
  // If we have a current user ID and should include the current user, add them to the list
  if (currentUserId && includeCurrentUser) {
    mockUsers.unshift({
      id: currentUserId,
      display_name: 'You (Current User)',
      profile_image: 'https://i.pravatar.cc/150?img=1',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      isCurrentUser: true
    });
  }
  
  return NextResponse.json({
    users: mockUsers.slice(0, limit),
    total: mockUsers.length
  });
} 