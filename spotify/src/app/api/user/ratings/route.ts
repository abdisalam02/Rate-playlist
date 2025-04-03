import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase'; // Use the global supabase client instead

// Define artist interface for TypeScript
interface SpotifyArtist {
  id: string;
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get the server session
    const session = await getServerSession(authOptions);
    
    // Debug logging
    console.log('User ratings API route accessed');
    console.log('Session details:', {
      auth: !!session,
      userId: session?.user?.id,
      userName: session?.user?.name,
      email: session?.user?.email,
      accessToken: !!session?.accessToken
    });
    
    // Get query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const itemType = searchParams.get('itemType'); // 'track' or 'album' filter
    
    // Log request parameters
    console.log('Ratings API request parameters:', {
      limit,
      offset,
      itemType: itemType || 'all',
      url: request.url
    });
    
    // Verify Supabase connection
    console.log('Testing Supabase connection...');
    
    try {
      // Try a simple query to verify the connection
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact' });
        
      if (testError) {
        console.error('Error testing Supabase connection:', testError);
      } else {
        console.log('Supabase connection successful! User count:', testData);
      }
    } catch (testErr) {
      console.error('Exception testing Supabase connection:', testErr);
    }
    
    // Check if we have session, but it doesn't have a valid session.user.id
    // Try to get Spotify user data to populate the user ID
    let spotifyUserId = null;
    
    if (session?.accessToken && (!session.user || !session.user.id)) {
      console.log('Session has access token but no user ID. Fetching Spotify user profile...');
      
      try {
        // Fetch Spotify profile directly to get user ID
        const spotifyResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        });
        
        if (spotifyResponse.ok) {
          const spotifyUserData = await spotifyResponse.json();
          spotifyUserId = spotifyUserData.id;
          console.log('Got Spotify user ID from API:', spotifyUserId);
        } else {
          console.error('Failed to fetch Spotify profile:', spotifyResponse.status);
        }
      } catch (error) {
        console.error('Error fetching Spotify profile:', error);
      }
    }
    
    // If we still have no user ID at this point, return error
    if (!session?.user?.id && !spotifyUserId) {
      console.error('No user ID available from session or Spotify API');
      return NextResponse.json({ 
        ratings: [],
        error: 'Authentication required',
        status: 'unauthorized' 
      });
    }
    
    // Use the user ID from session or the one we got from Spotify
    const userIdToUse = session?.user?.id || spotifyUserId;
    
    // Try to get the user ID from users table by matching spotify_id or email
    let dbUser = null;
    
    // Try with Spotify ID
    if (userIdToUse) {
      console.log('Looking up user by Spotify ID:', userIdToUse);
      const { data: spotifyIdUser, error: spotifyIdError } = await supabase
        .from('users')
        .select('id')
        .eq('spotify_id', userIdToUse)
        .single();
        
      if (spotifyIdError) {
        console.error('Error finding user by Spotify ID:', spotifyIdError.message);
      }
        
      if (!spotifyIdError && spotifyIdUser) {
        dbUser = spotifyIdUser;
        console.log('Found user by Spotify ID:', dbUser.id);
      } else {
        console.log('User not found by Spotify ID');
      }
    }
    
    // If not found, try with email
    if (!dbUser && session?.user?.email) {
      console.log('Looking up user by email:', session.user.email);
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();
        
      if (emailError) {
        console.error('Error finding user by email:', emailError.message);
      }
        
      if (!emailError && emailUser) {
        dbUser = emailUser;
        console.log('Found user by email:', dbUser.id);
      } else {
        console.log('User not found by email');
      }
    }
    
    // If user not found, create a new user record
    if (!dbUser && (userIdToUse || session?.user?.email)) {
      console.log('Creating new user record');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          { 
            spotify_id: userIdToUse || null, 
            email: session?.user?.email || null,
            display_name: session?.user?.name || 'User',
            profile_image: session?.user?.image || null
          }
        ])
        .select();
        
      if (createError) {
        console.error('Failed to create user:', createError.message);
      }
        
      if (!createError && newUser && newUser.length > 0) {
        dbUser = newUser[0];
        console.log('Created new user:', dbUser.id);
      } else {
        console.log('Failed to create user');
      }
    }
    
    // If we have a database user ID, use it to query ratings
    let userRatings = null;
    if (dbUser?.id) {
      console.log('Querying ratings by user_id:', dbUser.id);
      let query = supabase
              .from('ratings')
              .select('*')
        .eq('user_id', dbUser.id)
              .order('created_at', { ascending: false })
              .limit(limit)
              .range(offset, offset + limit - 1);
            
      // Add item type filter if provided
      if (itemType) {
        query = query.eq('item_type', itemType);
      }
        
      const { data, error } = await query;
      
      if (error) {
        console.error('Error querying ratings:', error.message);
      }
        
      if (!error && data && data.length > 0) {
        console.log(`Found ${data.length} ratings with user_id: ${dbUser.id}`);
        userRatings = data;
      } else {
        console.log(`No ratings found for user ${dbUser.id}`);
      }
    }
    
    // If no ratings found, try a broader query to debug
    if (!userRatings || userRatings.length === 0) {
      console.log('No ratings found for specific user, checking if any ratings exist in the table');
      
      try {
        const { data: allRatings, error: allRatingsError } = await supabase
          .from('ratings')
          .select('count(*)', { count: 'exact' });
          
        if (allRatingsError) {
          console.error('Error checking ratings table:', allRatingsError.message);
        } else {
          console.log(`Total ratings in the table: ${allRatings}`);
        }
      } catch (countErr) {
        console.error('Exception checking ratings count:', countErr);
      }
      
      console.log('No ratings found for user');
      return NextResponse.json({ 
        ratings: [],
        message: 'No ratings found for this user'
      });
    }
    
    console.log(`Returning ${userRatings.length} ratings`);
      
      // Return the ratings as is if we don't have an access token to enrich them
    if (!session?.accessToken) {
        return NextResponse.json({ ratings: userRatings });
      }
      
      // Enrich the ratings with Spotify data if we have any and have an access token
      try {
        // Process in batches to avoid rate limiting
        const processedRatings = [];
        const batchSize = 5;
        const batches = Math.ceil(userRatings.length / batchSize);
        
        for (let i = 0; i < batches; i++) {
          const batchStart = i * batchSize;
          const batchRatings = userRatings.slice(batchStart, batchStart + batchSize);
          
          const batchPromises = batchRatings.map(async (rating) => {
            try {
              console.log('Processing rating:', rating.id);
              
              // Skip if we don't have valid item_id or item_type
              if (!rating.item_id || !rating.item_type) {
                console.log('Missing item_id or item_type for rating:', rating.id);
                return {
                  ...rating,
                  name: 'Unknown Item',
                  artist_name: 'Unknown Artist',
                  image_url: '/placeholder.png'
                };
              }
              
              let spotifyData = null;
              
              // Fetch Spotify data based on item type
              if (rating.item_type === 'track') {
                try {
                  console.log('Fetching track data for:', rating.item_id);
                  
                  // First try Spotify API
                  const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${rating.item_id}`, {
                    headers: {
                      Authorization: `Bearer ${session.accessToken}`
                    }
                  });
                  
                  if (trackResponse.ok) {
                    spotifyData = await trackResponse.json();
                  } else {
                    console.error(`Track fetch failed with status: ${trackResponse.status}`);
                    
                    // Try our local API as fallback
                    const localResponse = await fetch(`/api/spotify/track/${rating.item_id}`, {
                      headers: {
                        'Cache-Control': 'no-cache'
                      }
                    });
                    
                    if (localResponse.ok) {
                      spotifyData = await localResponse.json();
                    }
                  }
                } catch (trackErr) {
                  console.error(`Error fetching track ${rating.item_id}:`, trackErr);
                }
              } else if (rating.item_type === 'album') {
                try {
                  console.log('Fetching album data for:', rating.item_id);
                  
                  // First try Spotify API
                  const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${rating.item_id}`, {
                    headers: {
                      Authorization: `Bearer ${session.accessToken}`
                    }
                  });
                  
                  if (albumResponse.ok) {
                    spotifyData = await albumResponse.json();
                  } else {
                    console.error(`Album fetch failed with status: ${albumResponse.status}`);
                    
                    // Try our local API as fallback
                    const localResponse = await fetch(`/api/spotify/album/${rating.item_id}`, {
                      headers: {
                        'Cache-Control': 'no-cache'
                      }
                    });
                    
                    if (localResponse.ok) {
                      spotifyData = await localResponse.json();
                    }
                  }
                } catch (albumErr) {
                  console.error(`Error fetching album ${rating.item_id}:`, albumErr);
                }
              }
              
            // Enrich the rating with Spotify data if available
              if (spotifyData) {
              let artistsString = '';
              
              if (rating.item_type === 'track') {
                artistsString = spotifyData.artists?.map((a: SpotifyArtist) => a.name).join(', ') || 'Unknown Artist';
              } else if (rating.item_type === 'album') {
                artistsString = spotifyData.artists?.map((a: SpotifyArtist) => a.name).join(', ') || 'Unknown Artist';
              }
              
              return {
                ...rating,
                // Use spotify_id from the API if available
                spotify_id: spotifyData.id || rating.item_id,
                name: spotifyData.name || 'Unknown Item',
                artist_name: artistsString,
                image_url: rating.item_type === 'track' 
                  ? spotifyData.album?.images?.[0]?.url || '/placeholder.png'
                  : spotifyData.images?.[0]?.url || '/placeholder.png'
              };
            }
            
            // Return the original rating if we couldn't fetch Spotify data
            return rating;
          } catch (err) {
            console.error(`Error processing rating ${rating.id}:`, err);
            return rating;
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          processedRatings.push(...batchResults);
        }
        
      console.log(`Processed ${processedRatings.length} ratings with Spotify data`);
      
      return NextResponse.json({ 
        ratings: processedRatings,
        count: processedRatings.length
      });
    } catch (err) {
      console.error('Error enriching ratings:', err);
      
      // Still return the ratings even if enriching failed
      return NextResponse.json({ 
        ratings: userRatings,
        count: userRatings.length,
        enriched: false
      });
    }
  } catch (err) {
    console.error('Error fetching ratings from database:', err);
    return NextResponse.json({ 
      ratings: [],
      error: 'Database error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
} 