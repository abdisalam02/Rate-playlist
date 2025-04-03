import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getUserPlaylists } from '@/lib/spotify';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.error('No session or access token found in /api/profile/playlists');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    console.log('Fetching user playlists with token', {
      tokenExists: !!session.accessToken,
      userId: session.user?.id || 'missing',
      limit,
      offset
    });
    
    // Fetch user playlists from Spotify
    const playlistsData = await getUserPlaylists(session.accessToken as string, limit, offset);
    
    return NextResponse.json(playlistsData);
  } catch (error: any) {
    console.error('Error fetching user playlists:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
} 