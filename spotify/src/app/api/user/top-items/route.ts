import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserTopItems } from '@/lib/spotify';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.error('No session or access token found in /api/user/top-items');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as 'artists' | 'tracks';
    const timeRange = searchParams.get('time_range') as 'short_term' | 'medium_term' | 'long_term' || 'medium_term';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!type || (type !== 'artists' && type !== 'tracks')) {
      return NextResponse.json({ error: 'Invalid type parameter. Must be "artists" or "tracks"' }, { status: 400 });
    }
    
    console.log(`Fetching user's top ${type} with parameters:`, {
      timeRange,
      limit,
      tokenExists: !!session.accessToken
    });
    
    const topItems = await getUserTopItems(session.accessToken as string, type, timeRange, limit);
    return NextResponse.json(topItems);
  } catch (error: any) {
    console.error(`Error in /api/user/top-items:`, error.message);
    return NextResponse.json({ error: 'Failed to fetch top items' }, { status: 500 });
  }
} 