import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRecentlyPlayedTracks } from '@/lib/spotify';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.error('No session or access token found in /api/user/recently-played');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    
    console.log(`Fetching user's recently played tracks with parameters:`, {
      limit,
      tokenExists: !!session.accessToken
    });
    
    const recentlyPlayed = await getRecentlyPlayedTracks(session.accessToken as string, limit);
    return NextResponse.json(recentlyPlayed);
  } catch (error: any) {
    console.error(`Error in /api/user/recently-played:`, error.message);
    return NextResponse.json({ error: 'Failed to fetch recently played tracks' }, { status: 500 });
  }
} 