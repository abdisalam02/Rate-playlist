import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { removeTrackFromUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; trackId: string } }
) {
  try {
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID from session
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get mood ID and track ID from params
    const moodId = params.id;
    const trackId = params.trackId;
    if (!moodId || !trackId) {
      return NextResponse.json({ error: 'Mood ID and Track ID are required' }, { status: 400 });
    }

    // Remove track from user mood
    await removeTrackFromUserMood(userId, moodId, trackId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing track from user mood:', error);
    return NextResponse.json(
      { error: 'Failed to remove track from user mood' },
      { status: 500 }
    );
  }
} 