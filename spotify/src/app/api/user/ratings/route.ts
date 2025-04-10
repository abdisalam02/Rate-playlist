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
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('Error testing Supabase connection:', testError);
      } else {
        console.log('Supabase connection successful! User count check removed, test user:', testData);
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
    
    // If we still have no user ID from the session, return error (DB UUID is required now)
    if (!session?.user?.id) {
      console.error('No DB User ID (UUID) available from session.');
      return NextResponse.json({ 
        ratings: [],
        error: 'Authentication required or user ID missing from session',
        status: 'unauthorized' 
      });
    }
    
    // --- Use Correct IDs --- 
    const correctDbUserId = session.user.id; // This is the database UUID
    const knownIncorrectSpotifyId = '3c03a855-4036-4b12-8fcf-f6297273cfef'; // The literal Spotify ID used previously
    
    // If we have a database user ID, use it to query ratings along with the old incorrect ID
    let userRatings = null;
    console.log(`Querying ratings for DB ID: ${correctDbUserId} OR Old Spotify ID: ${knownIncorrectSpotifyId}`);
    
    // Construct the .or() filter string
    const orFilter = `user_id.eq.${correctDbUserId},user_id.eq.${knownIncorrectSpotifyId}`;

    let query = supabase
        .from('ratings')
        .select('*') // Select all columns initially
        .or(orFilter) // Use .or() with the constructed filter
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

    // Add item type filter if provided
    if (itemType) {
        query = query.eq('item_type', itemType);
    }

    const { data, error } = await query;

    if (error) {
        // Log the specific error from Supabase
        console.error(`Error querying ratings with OR filter (DB: ${correctDbUserId}, Spotify: ${knownIncorrectSpotifyId}):`, error);
        // Return a 500 error as the query failed
        return NextResponse.json({ error: 'Failed to query ratings database', details: error.message }, { status: 500 });
    } else if (data && data.length > 0) {
        console.log(`Found ${data.length} ratings matching DB ID or Spotify ID.`);
        userRatings = data;
    } else {
        console.log(`No ratings found matching DB ID or Spotify ID.`);
        // Set to empty array, the check later will handle returning the message
        userRatings = [];
    }
    
    // If no ratings found after the OR query, return empty
    if (!userRatings || userRatings.length === 0) {
      console.log('No ratings found for user (checked DB ID and specific old Spotify ID)');
      // --- Check total count correctly --- 
      try {
        // Corrected: Use { count: 'exact', head: true } for counting
        const { error: countError, count: totalCount } = await supabase
          .from('ratings')
          .select('*', { count: 'exact', head: true }); // Get only the count
          
        if (countError) {
          console.error('Error checking total ratings count:', countError.message);
        } else {
          console.log(`Total ratings in the table: ${totalCount}`); 
        }
      } catch (countErr) {
        console.error('Exception checking ratings count:', countErr);
      }
      // --- End check total count --- 
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