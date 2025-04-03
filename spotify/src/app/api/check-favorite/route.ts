import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import supabase from '@/utils/supabase';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // IMPORTANT: Pass authOptions explicitly
    const session = await getServerSession(authOptions);
    
    // Debug
    console.log("GET check-favorite - auth details:", {
      hasSession: !!session,
      userId: session?.user?.id || 'missing',
      headers: Object.fromEntries(request.headers.entries())
    });
    
    // Extended debugging for session issues
    console.log("GET check-favorite - Full session:", JSON.stringify({
      hasSession: !!session,
      accessToken: session?.accessToken ? "exists" : "missing",
      user: session?.user || 'missing'
    }));
    
    // Check if user is authenticated with a simpler check
    if (!session?.user?.id) {
      console.error("No valid user ID in session for check-favorite");
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
    
    if (userError) {
      // User not found in database, they can't have favorites
      return NextResponse.json({ isFavorite: false });
    }
    
    const userId = userData.id;
    console.log("Found user ID for favorite check:", userId);
    
    // Check if the item is in favorites
    const { data: favoriteData, error: favoriteError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .eq('item_type', itemType);
    
    const isFavorite = !!(favoriteData && favoriteData.length > 0);
    console.log(`Item ${itemId} favorite status:`, isFavorite);
    
    return NextResponse.json({ isFavorite });
    
  } catch (error) {
    console.error('Error in check-favorite route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 