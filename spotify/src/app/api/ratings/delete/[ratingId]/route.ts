import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

export async function DELETE(request: NextRequest, { params }: { params: { ratingId: string } }) {
  try {
    const ratingId = params.ratingId;
    console.log(`Attempting to delete rating with ID: ${ratingId}`);

    if (!ratingId) {
      return NextResponse.json({ error: 'Rating ID is required' }, { status: 400 });
    }

    // 1. Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('Authentication required for deleting rating');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const sessionUserId = session.user.id; // Spotify ID

    // 2. Get internal user ID from session Spotify ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id') // Select the internal UUID
      .eq('spotify_id', sessionUserId)
      .single();

    if (userError || !userData) {
      console.error(`User not found for Spotify ID ${sessionUserId}:`, userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const internalUserId = userData.id; // Internal UUID
    console.log(`Internal user ID for delete request: ${internalUserId}`);

    // 3. Fetch the rating to verify ownership
    const { data: ratingData, error: fetchError } = await supabase
      .from('ratings')
      .select('id, user_id') // Select only needed fields
      .eq('id', ratingId)
      .single();

    if (fetchError) {
      console.error(`Error fetching rating ${ratingId} for deletion:`, fetchError);
      if (fetchError.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch rating' }, { status: 500 });
    }

    if (!ratingData) {
       return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    console.log(`Rating ${ratingId} belongs to user ${ratingData.user_id}`);

    // 4. Check ownership
    if (ratingData.user_id !== internalUserId) {
      console.warn(`User ${internalUserId} attempted to delete rating ${ratingId} owned by ${ratingData.user_id}`);
      return NextResponse.json({ error: 'You are not authorized to delete this rating' }, { status: 403 }); // Forbidden
    }

    // 5. Delete the rating
    // NOTE: This assumes ON DELETE CASCADE is set for review_replies.rating_id 
    // OR that orphaned replies are acceptable.
    // If not, you need to delete replies manually first.
    const { error: deleteError } = await supabase
      .from('ratings')
      .delete()
      .eq('id', ratingId);

    if (deleteError) {
      console.error(`Error deleting rating ${ratingId}:`, deleteError);
      // Handle foreign key constraints if replies aren't set to cascade delete
       if (deleteError.code === '23503') { 
           return NextResponse.json({ error: 'Cannot delete rating because it has replies. Please delete replies first.' }, { status: 409 }); // Conflict
       }
      return NextResponse.json({ error: 'Failed to delete rating' }, { status: 500 });
    }

    console.log(`Rating ${ratingId} deleted successfully by user ${internalUserId}`);
    
    // 6. Return success response
    return NextResponse.json({ success: true, message: 'Rating deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/ratings/delete/[ratingId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 