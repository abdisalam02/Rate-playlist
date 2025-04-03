import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCurrentUserProfile } from '@/lib/spotify';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      console.error('No session or access token found in /api/user/profile');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Fetching user profile with token', {
      tokenExists: !!session.accessToken,
      userId: session.user?.id || 'missing'
    });
    
    const spotifyProfile = await getCurrentUserProfile(session.accessToken as string);
    return NextResponse.json(spotifyProfile);
  } catch (error: any) {
    console.error('Error in /api/user/profile:', error.message);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
} 