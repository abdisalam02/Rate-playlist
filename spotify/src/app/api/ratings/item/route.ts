import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const itemType = searchParams.get('itemType');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    // Validate required parameters
    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: 'Item ID and type are required parameters' },
        { status: 400 }
      );
    }
    
    // Validate item type
    if (itemType !== 'track' && itemType !== 'album') {
      return NextResponse.json(
        { error: 'Item type must be either "track" or "album"' },
        { status: 400 }
      );
    }
    
    // Get ratings from Supabase with user information
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select(`
        id,
        item_id,
        item_type,
        rating,
        review,
        created_at,
        updated_at,
        user:user_id (
          id,
          spotify_id,
          display_name,
          profile_image
        )
      `)
      .eq('item_id', itemId)
      .eq('item_type', itemType)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching ratings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ratings' },
        { status: 500 }
      );
    }
    
    // Format the response data with more friendly structure
    const formattedRatings = ratings.map(rating => ({
      id: rating.id,
      itemId: rating.item_id,
      itemType: rating.item_type,
      rating: rating.rating,
      review: rating.review,
      createdAt: rating.created_at,
      updatedAt: rating.updated_at,
      userId: rating.user?.id,
      userSpotifyId: rating.user?.spotify_id,
      userName: rating.user?.display_name,
      userImage: rating.user?.profile_image
    }));
    
    return NextResponse.json({ ratings: formattedRatings });
    
  } catch (error) {
    console.error('Error in ratings/item GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 