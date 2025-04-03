import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getCurrentUserProfile } from '@/lib/spotify';
import { createOrUpdateUser } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const spotifyProfile = await getCurrentUserProfile(session.accessToken as string);
    
    // Store/update user in database
    await createOrUpdateUser(spotifyProfile);
    
    return NextResponse.json(spotifyProfile);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
} 