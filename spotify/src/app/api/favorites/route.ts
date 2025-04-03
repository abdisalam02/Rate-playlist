import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

// GET handler for fetching favorites
export async function GET(request: NextRequest) {
  try {
    // IMPORTANT: Pass authOptions explicitly
    const session = await getServerSession(authOptions);
    
    // Debug
    console.log("GET favorites - auth details:", {
      hasSession: !!session,
      userId: session?.user?.id || 'missing'
    });
    
    // Check if user is authenticated
    if (!session?.accessToken || !session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('itemType'); // Optional filter by type
    
    // Get the user ID from the Spotify ID in the session
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('spotify_id', session.user.id)
      .single();
    
    if (userError || !userData) {
      // User not found in database
      return NextResponse.json({ favorites: [] });
    }
    
    const userId = userData.id;
    
    // Query to get favorites
    let favoritesQuery = supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);
    
    if (itemType) {
      favoritesQuery = favoritesQuery.eq('item_type', itemType);
    }
    
    favoritesQuery = favoritesQuery.order('added_at', { ascending: false });
    
    const { data: favorites, error: favoritesError } = await favoritesQuery;
    
    if (favoritesError) {
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ favorites: favorites || [] });
    
  } catch (error) {
    console.error('Error in favorites GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler for adding favorites
export async function POST(request: NextRequest) {
  try {
    // IMPORTANT: Pass authOptions explicitly
    const session = await getServerSession(authOptions);
    
    // Debug
    console.log("POST favorites - auth details:", {
      hasSession: !!session,
      userId: session?.user?.id || 'missing'
    });
    
    // Detailed logging to diagnose session issues
    console.log("POST favorites - Session details:", {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      userId: session?.user?.id || 'missing',
      userEmail: session?.user?.email || 'missing',
      userImage: !!session?.user?.image
    });
    
    // Check if user is authenticated - simpler check
    if (!session?.user?.id) {
      console.error("No valid user ID in session for favorites POST");
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { itemId, itemType } = body;
    
    if (!itemId || !itemType) {
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
      
      // User not found, create a new user
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
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
      
      userId = newUser[0].id;
    } else {
      userId = userData.id;
    }
    
    console.log("Found/created user ID:", userId);
    
    // Check if item is already in favorites
    const { data: existingFavorite, error: existingError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType);
    
    if (existingFavorite && existingFavorite.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Item already in favorites'
      });
    }
    
    // Add to favorites
    const { error: insertError } = await supabase
      .from('favorites')
      .insert([
        {
          user_id: userId,
          item_id: itemId,
          item_type: itemType
        }
      ]);
    
    if (insertError) {
      console.error("Failed to add favorite:", insertError);
      return NextResponse.json(
        { error: 'Failed to add favorite', details: insertError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Added ${itemType} to favorites`
    });
    
  } catch (error) {
    console.error('Error in favorites POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing favorites
export async function DELETE(request: NextRequest) {
  try {
    // IMPORTANT: Pass authOptions explicitly
    const session = await getServerSession(authOptions);
    
    // Debug
    console.log("DELETE favorites - auth details:", {
      hasSession: !!session,
      userId: session?.user?.id || 'missing'
    });
    
    // Detailed logging to diagnose session issues
    console.log("DELETE favorites - Session details:", {
      hasSession: !!session,
      hasAccessToken: !!session?.accessToken,
      userId: session?.user?.id || 'missing',
      userEmail: session?.user?.email || 'missing',
      userImage: !!session?.user?.image
    });
    
    // Check if user is authenticated - simpler check
    if (!session?.user?.id) {
      console.error("No valid user ID in session for favorites DELETE");
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const itemType = searchParams.get('itemType');
    
    if (!itemId || !itemType) {
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
    
    if (userError || !userData) {
      // User not found in database
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    const userId = userData.id;
    console.log("Found user ID for favorite deletion:", userId);
    
    // Delete the favorite
    const { error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType);
    
    if (deleteError) {
      console.error("Failed to delete favorite:", deleteError);
      return NextResponse.json(
        { error: 'Failed to delete favorite', details: deleteError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Removed ${itemType} from favorites`
    });
    
  } catch (error) {
    console.error('Error in favorites DELETE route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 