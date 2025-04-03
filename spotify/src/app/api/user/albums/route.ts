import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserSavedAlbums } from '@/lib/spotify';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.error('No session or access token found in /api/user/albums');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log(`Fetching user's saved albums with parameters:`, {
      limit,
      offset,
      tokenExists: !!session.accessToken
    });
    
    const albums = await getUserSavedAlbums(session.accessToken as string, limit, offset);
    return NextResponse.json(albums);
  } catch (error: any) {
    console.error(`Error in /api/user/albums:`, error.message);
    return NextResponse.json({ error: 'Failed to fetch saved albums' }, { status: 500 });
  }
} 