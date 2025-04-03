import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getUserTopItems } from '@/lib/spotify';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'artists' | 'tracks' || 'tracks';
    const timeRange = searchParams.get('time_range') as 'short_term' | 'medium_term' | 'long_term' || 'medium_term';
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const topItems = await getUserTopItems(
      session.accessToken as string,
      type,
      timeRange,
      limit
    );
    
    return NextResponse.json(topItems);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch top items' }, { status: 500 });
  }
} 