import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

// GET handler for fetching ratings
export async function GET(request: NextRequest) {
  try {
    // Debugging the cookies and headers
    const cookieHeader = request.headers.get('cookie');
    console.log("GET ratings - Cookie header:", cookieHeader ? 'exists' : 'missing');
    
    // Get the server session using auth options
    const session = await getServerSession(authOptions);
    
    // More extensive logging to diagnose session issues
    console.log("GET ratings - Full session data:", JSON.stringify({
      authenticated: !!session,
      hasAccessToken: session?.accessToken ? true : false,
      userId: session?.user?.id || 'missing',
      userName: session?.user?.name || 'missing'
    }));
    
    // Check if user is authenticated
    if (!session?.user?.id) {
      console.error("No valid user ID in session for ratings GET");
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const type = searchParams.get('type');
    
    if (!itemId || !type) {
      return NextResponse.json(
        { error: 'Item ID and type are required' },
        { status: 400 }
      );
    }
    
    // Get the user ID from the Spotify ID in the session
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('spotify_id', session.user.id)
      .single();
    
    let userId;
    
    if (userError) {
      console.log("User not found in DB, creating user:", session.user.id);
      
      // Create a new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          { 
            spotify_id: session.user.id, 
            display_name: session.user.name || 'User', 
            profile_image: session.user.image || null
          }
        ])
        .select();
      
      if (createError || !newUser || newUser.length === 0) {
        console.error("Failed to create user:", createError);
        return NextResponse.json({ rating: 0, review: '' });
      }
      
      userId = newUser[0].id;
    } else {
      userId = userData.id;
    }
    
    console.log("Found/created user ID:", userId);
    
    // Query the database for the user's rating
    const { data: ratingData, error: ratingError } = await supabase
      .from('ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', type);
    
    if (ratingError || !ratingData || ratingData.length === 0) {
      // No rating found
      return NextResponse.json({ rating: 0, review: '' });
    }
    
    // Return the rating
    return NextResponse.json({
      rating: parseFloat(ratingData[0].rating),
      review: ratingData[0].review || '',
      created_at: ratingData[0].created_at,
      updated_at: ratingData[0].updated_at
    });
    
  } catch (error) {
    console.error('Error in ratings GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler for creating/updating ratings
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error('No valid user ID in session for ratings POST');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
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
    
    // Multi-strategy approach for user ID resolution
    console.log('Using multi-strategy approach to find/create user');
    console.log('Session user ID:', session.user.id);
    
    // Try to find user by spotify_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('spotify_id', session.user.id)
      .single();
    
    let userId;
    
    if (userError) {
      console.log("User not found in DB, creating user:", session.user.id);
      
      // Create a new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          { 
            spotify_id: session.user.id, 
            display_name: session.user.name || 'User', 
            profile_image: session.user.image || null
          }
        ])
        .select();
      
      if (createError || !newUser || newUser.length === 0) {
        console.error("Failed to create user:", createError);
        
        // Use fallback direct session ID
        console.log("Using session ID directly as fallback");
        userId = session.user.id;
      } else {
        userId = newUser[0].id;
      }
    } else {
      userId = userData.id;
    }
    
    console.log("Found/created user ID:", userId);
    
    // Check if user already has a rating for this item
    const { data: existingRatingData, error: existingError } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType);
    
    // Initialize as let since it might be reassigned
    let existingRating = existingRatingData;
    
    if (existingError) {
      console.error('Error checking for existing rating:', existingError);
      
      // Try alternative query with text casting
      const { data: altExistingRating, error: altExistingError } = await supabase
        .from('ratings')
        .select('id')
        .filter('user_id::text', 'ilike', `%${userId}%`)
        .eq('item_id', itemId)
        .eq('item_type', itemType);
        
      if (!altExistingError && altExistingRating && altExistingRating.length > 0) {
        existingRating = altExistingRating;
      }
    }
    
    let result;
    
    if (existingRating && existingRating.length > 0) {
      console.log("Updating existing rating for item:", itemId);
      
      // Update existing rating
      const { error: updateError } = await supabase
        .from('ratings')
        .update({ 
          rating: rating, 
          review: review || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating[0].id);
      
      if (updateError) {
        console.error("Failed to update rating:", updateError);
        return NextResponse.json(
          { error: 'Failed to update rating', details: updateError.message },
          { status: 500 }
        );
      }
      
      result = { 
        success: true, 
        message: 'Rating updated'
      };
    } else {
      console.log("Creating new rating for item:", itemId);
      
      // Add new rating
      const { data: newRating, error: insertError } = await supabase
        .from('ratings')
        .insert([{
          user_id: userId,
          item_id: itemId,
          item_type: itemType,
          rating: rating,
          review: review || ''
        }])
        .select('id')
        .single();
      
      if (insertError) {
        console.error("Failed to insert rating:", insertError);
        
        // Try with session ID directly as fallback
        if (userId !== session.user.id) {
          console.log("Trying direct session ID as fallback");
          const { data: fallbackRating, error: fallbackError } = await supabase
            .from('ratings')
            .insert([{
              user_id: session.user.id,
              item_id: itemId,
              item_type: itemType,
              rating: rating,
              review: review || ''
            }])
            .select('id')
            .single();
            
          if (fallbackError) {
            console.error("Fallback insert failed too:", fallbackError);
            return NextResponse.json(
              { error: 'Failed to insert rating', details: insertError.message },
              { status: 500 }
            );
          }
          
          result = { 
            success: true, 
            message: 'Rating submitted with fallback ID',
            id: fallbackRating.id
          };
        } else {
          return NextResponse.json(
            { error: 'Failed to insert rating', details: insertError.message },
            { status: 500 }
          );
        }
      } else {
        result = { 
          success: true, 
          message: 'Rating submitted',
          id: newRating.id
        };
      }
    }
    
    console.log("Rating operation successful:", result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error in ratings POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 