import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabaseAdmin from '@/lib/supabase-admin'; // Corrected: Default import

// DELETE /api/ratings/item/[ratingId]
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { ratingId: string } }
) {
  console.log('[DELETE RATING] Request received for ID:', params.ratingId);

  const supabase = supabaseAdmin; // Corrected: Use the imported default client
  const session = await getServerSession(authOptions);

  // 1. Authentication Check
  if (!session?.user?.id) {
    console.log('[DELETE RATING] Error: User not authenticated');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('[DELETE RATING] Full Session User Object:', session.user); // Log the user object

  const ratingId = params.ratingId; // Correctly access ratingId from params
  const userId = session.user.id;

  // 2. Validate Input
  if (!ratingId) {
    console.log('[DELETE RATING] Error: Rating ID is missing');
    return NextResponse.json({ error: 'Rating ID is required' }, { status: 400 });
  }

  console.log(`[DELETE RATING] Attempting delete for rating ID: ${ratingId} by user ID: ${userId}`);

  try {
    // 3. Check Ownership
    const { data: rating, error: fetchError } = await supabase
      .from('ratings')
      .select('*')
      .eq('id', ratingId)
      .single();

    if (fetchError) {
      console.error('[DELETE RATING] Error fetching rating for ownership check:', fetchError);
      // Handle specific UUID format error
      if (fetchError.code === '22P02') { 
        return NextResponse.json({ error: `Invalid rating ID format: ${ratingId}. Expected UUID.` }, { status: 400 });
      }
      throw new Error('Error checking rating ownership');
    }

    if (!rating) {
      console.log(`[DELETE RATING] Rating not found for ID: ${ratingId}`);
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    if (rating.user_id !== userId) {
      console.warn(`[DELETE RATING] Forbidden: User ${userId} attempted to delete rating ${ratingId} owned by ${rating.user_id}`);
      return NextResponse.json({ error: 'Forbidden: You do not own this rating' }, { status: 403 });
    }

    // 4. Delete Rating
    const { error: deleteError } = await supabase
      .from('ratings')
      .delete()
      .eq('id', ratingId);

    if (deleteError) {
      console.error(`[DELETE RATING] Error deleting rating ID ${ratingId}:`, deleteError);
      throw new Error('Failed to delete rating from database');
    }

    console.log(`[DELETE RATING] Successfully deleted rating ID: ${ratingId} for user ID: ${userId}`);
    return NextResponse.json({ message: 'Rating deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error(`[DELETE RATING] Internal Server Error for rating ID ${ratingId}:`, error);
    return NextResponse.json({ error: (error as Error).message || 'Internal Server Error while trying to delete rating' }, { status: 500 });
  }
}
