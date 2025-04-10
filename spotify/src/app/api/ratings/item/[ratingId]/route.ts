import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct

export async function DELETE(request: NextRequest, { params }: { params: { ratingId: string } }) {
  const session = await getServerSession(authOptions);

  // --- NEW LOGGING --- 
  console.log("[DELETE RATING] Full Session User Object:", session?.user);
  // --- END NEW LOGGING --- 

  // 1. Check Authentication
  if (!session?.user?.id) {
    console.error('[DELETE RATING] Unauthorized: No session or user ID found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ratingId = params.ratingId;
  const userId = session.user.id;

  // 2. Validate Input
  if (!ratingId) {
    console.error('[DELETE RATING] Bad Request: Rating ID is required');
    return NextResponse.json({ error: 'Rating ID is required' }, { status: 400 });
  }

  console.log(`[DELETE RATING] Attempting delete for rating ID: ${ratingId} by user ID: ${userId}`);

  try {
    // 3. Verify Ownership before deleting
    const { data: ratingData, error: fetchError } = await supabase
      .from('ratings')
      .select('user_id')
      .eq('id', ratingId)
      .single(); // Use single() as ID should be unique

    // Handle potential errors during fetch
    if (fetchError) {
      // Specifically check if the rating wasn't found
      if (fetchError.code === 'PGRST116') { // PostgREST code for "Resource Not Found"
        console.warn(`[DELETE RATING] Rating not found: ID ${ratingId}`);
        return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
      }
      // Log and re-throw other database errors
      console.error('[DELETE RATING] Error fetching rating for ownership check:', fetchError);
      throw fetchError;
    }

    // Double check if data is null even if no error (shouldn't happen with .single() if found)
     if (!ratingData) {
        console.warn(`[DELETE RATING] Rating data is null after fetch (unexpected): ID ${ratingId}`);
        return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    // Check if the user trying to delete owns the rating
    if (ratingData.user_id !== userId) {
      console.warn(`[DELETE RATING] Forbidden: User ${userId} does not own rating ${ratingId} (Owner: ${ratingData.user_id})`);
      return NextResponse.json({ error: 'Forbidden: You do not own this rating' }, { status: 403 });
    }

    // 4. Delete the rating if ownership is verified
    const { error: deleteError } = await supabase
      .from('ratings')
      .delete()
      .eq('id', ratingId); // Match the specific rating ID to delete

    if (deleteError) {
      console.error('[DELETE RATING] Error deleting rating from Supabase:', deleteError);
      throw deleteError; // Propagate the error
    }

    console.log(`[DELETE RATING] Successfully deleted rating ID: ${ratingId}`);
    // Return success response
    return NextResponse.json({ message: 'Rating deleted successfully' }, { status: 200 });

  } catch (error) {
    // Catch any unexpected errors during the process
    console.error(`[DELETE RATING] Internal Server Error for rating ID ${ratingId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error while trying to delete rating' }, { status: 500 });
  }
}
