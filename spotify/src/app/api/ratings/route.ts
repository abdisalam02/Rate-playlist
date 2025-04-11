import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

// GET handler for fetching ratings
export async function GET(request: NextRequest) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions) as AppSession | null; // Use AppSession
    
    // --- Corrected: Directly use session.user.id ---
    const correctUserId = session?.user?.id;
    console.log("GET ratings - Full session data:", JSON.stringify({
      authenticated: !!session,
      userId: correctUserId
    }));
    
    // Check if user is authenticated
    if (!correctUserId) {
      console.error("No valid user ID in session for ratings GET");
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // --- End Correction ---
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const type = searchParams.get('type');
    
    if (!itemId || !type) {
      return NextResponse.json({ error: 'Item ID and type are required' }, { status: 400 });
    }
    
    // --- REMOVED Faulty User ID Lookup/Creation --- 
    console.log(`Fetching rating for user ${correctUserId}, item ${itemId}, type ${type}`);
    
    // Query the database for the user's rating using the CORRECT user ID
    const { data: ratingData, error: ratingError } = await supabase
      .from('ratings')
      .select('rating, review, created_at, updated_at') // Select specific columns needed
      .eq('user_id', correctUserId) // Use correctUserId
      .eq('item_id', itemId)
      .eq('item_type', type)
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 result
    
    if (ratingError) {
       console.error(`Error fetching rating for user ${correctUserId}, item ${itemId}:`, ratingError);
       return NextResponse.json({ error: 'Database error fetching rating' }, { status: 500 });
    }
    
    if (!ratingData) {
      // No rating found for this user and item
      console.log(`No rating found for user ${correctUserId}, item ${itemId}. Returning default.`);
      return NextResponse.json({ rating: 0, review: '' }); 
    }
    
    // Rating found, return it
    console.log(`Rating found for user ${correctUserId}, item ${itemId}:`, ratingData);
    return NextResponse.json({
      rating: parseFloat(ratingData.rating), // Ensure rating is a number
      review: ratingData.review || '',
      created_at: ratingData.created_at,
      updated_at: ratingData.updated_at
    });
    
  } catch (error) {
    console.error('Error in ratings GET route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for creating/updating ratings
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions) as AppSession | null;
    
    const correctUserId = session?.user?.id;
    if (!correctUserId) {
      console.error('No valid user ID (Supabase UUID) in session for ratings POST');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    console.log(`Authenticated user ID for rating POST: ${correctUserId}`);
    
    // Get request body
    const { itemId, itemType, rating, review } = await request.json();
    console.log(`Received rating request - itemId: ${itemId}, itemType: ${itemType}, rating: ${rating}, review length: ${review?.length || 0}`);
    
    // Validate required fields
    if (!itemId || !itemType || rating === undefined) {
      console.error(`Missing required fields - itemId: ${!!itemId}, itemType: ${!!itemType}, rating: ${rating}`);
      return NextResponse.json(
        { error: 'Item ID, type, and rating are required' },
        { status: 400 }
      );
    }
    
    // Validate item type
    if (itemType !== 'track' && itemType !== 'album') {
      console.error(`Invalid item type: ${itemType}`);
      return NextResponse.json(
        { error: 'Item type must be either "track" or "album"' },
        { status: 400 }
      );
    }
    
    // Validate rating
    const numericRating = parseFloat(rating);
    console.log(`Rating conversion - original: ${rating} (${typeof rating}), parsed: ${numericRating} (${typeof numericRating})`);
    
    if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
      console.error(`Invalid rating value: ${numericRating}, original: ${rating}`);
      return NextResponse.json(
        { error: 'Rating must be a number between 0 and 5' },
        { status: 400 }
      );
    }
    
    // Check if user already has a rating for this item using the CORRECT user ID
    const { data: existingRatingData, error: existingError } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', correctUserId)
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .maybeSingle();

    if (existingError) {
      console.error(`Error checking for existing rating for user ${correctUserId}, item ${itemId}:`, existingError);
      return NextResponse.json({ error: 'Database error checking rating' }, { status: 500 });
    }
    
    let result;
    let status = 200; // Default status for update

    if (existingRatingData) {
      console.log(`Updating existing rating (ID: ${existingRatingData.id}) for user ${correctUserId}, item ${itemId}`);
      const { error: updateError } = await supabase
        .from('ratings')
        .update({ 
          rating: numericRating,
          review: review || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRatingData.id);
      
      if (updateError) {
        console.error(`Failed to update rating ID ${existingRatingData.id}:`, updateError);
        return NextResponse.json(
          { error: 'Failed to update rating', details: updateError.message },
          { status: 500 }
        );
      }
      result = { success: true, message: 'Rating updated' };
      // status remains 200

    } else {
      console.log(`Inserting new rating for user ${correctUserId}, item ${itemId}`);
      const { data: insertedData, error: insertError } = await supabase
        .from('ratings')
        .insert({
          user_id: correctUserId,
          item_id: itemId,
          item_type: itemType,
          rating: numericRating,
          review: review || null
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`Failed to insert new rating for user ${correctUserId}, item ${itemId}:`, insertError);
         // Check for specific errors like foreign key constraints if needed
         return NextResponse.json(
          { error: 'Failed to save new rating', details: insertError.message },
          { status: 500 }
        );
      }
      result = { success: true, message: 'Rating created', ratingId: insertedData?.id };
      status = 201; // Set status to 201 Created
    }

    console.log(`Rating POST successful for user ${correctUserId}, item ${itemId}. Status: ${status}`);
    return NextResponse.json(result, { status });

  } catch (error: any) {
    console.error('Error in ratings POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 