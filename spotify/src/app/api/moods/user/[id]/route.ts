import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateUserMood, deleteUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get mood ID from params
    const moodId = params.id;
    if (!moodId) {
      return NextResponse.json({ error: 'Mood ID is required' }, { status: 400 });
    }

    // Get mood data from request body
    const moodData = await request.json();
    if (!moodData || !moodData.mood_name) {
      return NextResponse.json({ error: 'Mood name is required' }, { status: 400 });
    }

    // Update user mood
    const updatedMood = await updateUserMood(userId, moodId, moodData);
    
    return NextResponse.json(updatedMood);
  } catch (error) {
    console.error('Error updating user mood:', error);
    return NextResponse.json(
      { error: 'Failed to update user mood' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get mood ID from params
    const moodId = params.id;
    if (!moodId) {
      return NextResponse.json({ error: 'Mood ID is required' }, { status: 400 });
    }

    // Delete user mood
    await deleteUserMood(userId, moodId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user mood:', error);
    return NextResponse.json(
      { error: 'Failed to delete user mood' },
      { status: 500 }
    );
  }
} 