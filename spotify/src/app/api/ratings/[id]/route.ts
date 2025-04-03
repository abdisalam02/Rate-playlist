import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be logged in to rate items' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { rating, review, item_type } = body;
    
    if (!rating || !item_type) {
      return NextResponse.json(
        { error: 'Rating and item type are required' },
        { status: 400 }
      );
    }
    
    if (!['track', 'album'].includes(item_type)) {
      return NextResponse.json(
        { error: 'Invalid item type. Must be "track" or "album"' },
        { status: 400 }
      );
    }
    
    const numericRating = parseFloat(rating);
    if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 0 and 5' },
        { status: 400 }
      );
    }
    
    // Get user ID from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('spotify_id', session.user.id || session.user.sub)
      .single();
    
    if (userError || !userData) {
      console.error('Error getting user ID:', userError);
      return NextResponse.json(
        { error: 'Failed to get user ID' },
        { status: 500 }
      );
    }
    
    const userId = userData.id;
    const itemId = params.id;
    
    // Check if user has already rated this item
    const { data: existingRating, error: existingError } = await supabase
      .from('ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', item_type)
      .single();
    
    let result;
    
    if (existingRating) {
      // Update existing rating
      result = await supabase
        .from('ratings')
        .update({
          rating: numericRating,
          review: review || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRating.id)
        .select()
        .single();
    } else {
      // Create new rating
      result = await supabase
        .from('ratings')
        .insert({
          user_id: userId,
          item_id: itemId,
          item_type,
          rating: numericRating,
          review: review || null
        })
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Error saving rating:', result.error);
      return NextResponse.json(
        { error: 'Failed to save rating' },
        { status: 500 }
      );
    }
    
    // Log activity - the trigger should handle this, but we'll also explicitly record it
    // for better compatibility with the current activities structure
    const activityType = review ? 'review' : 'rating';
    
    const { error: activityError } = await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        item_id: itemId,
        item_type,
        rating: numericRating,
        review: review || null
      });
    
    if (activityError) {
      console.error('Error recording activity:', activityError);
      // Non-critical error, continue
    }
    
    return NextResponse.json({
      success: true,
      rating: result.data
    });
    
  } catch (error) {
    console.error('Error in ratings POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions);
    
    const itemId = params.id;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'track';
    
    if (!['track', 'album'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid item type. Must be "track" or "album"' },
        { status: 400 }
      );
    }
    
    // Get all ratings for the item
    const { data: ratings, error: ratingsError } = await supabase
      .from('ratings')
      .select(`
        id,
        user_id,
        rating,
        review,
        created_at,
        updated_at,
        users(display_name, profile_image)
      `)
      .eq('item_id', itemId)
      .eq('item_type', type)
      .order('created_at', { ascending: false });
    
    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      return NextResponse.json(
        { error: 'Failed to fetch ratings' },
        { status: 500 }
      );
    }
    
    // Get user's rating if logged in
    let userRating = null;
    
    if (session?.user) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('spotify_id', session.user.id || session.user.sub)
        .single();
      
      if (!userError && userData) {
        const { data: userRatingData, error: userRatingError } = await supabase
          .from('ratings')
          .select('*')
          .eq('user_id', userData.id)
          .eq('item_id', itemId)
          .eq('item_type', type)
          .single();
        
        if (!userRatingError && userRatingData) {
          userRating = userRatingData;
        }
      }
    }
    
    // Calculate average rating
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;
    
    return NextResponse.json({
      ratings: ratings.map(r => ({
        ...r,
        user_name: r.users?.display_name || 'Unknown User',
        user_image: r.users?.profile_image || null
      })),
      average_rating: averageRating,
      rating_count: ratings.length,
      user_rating: userRating
    });
    
  } catch (error) {
    console.error('Error in ratings GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 