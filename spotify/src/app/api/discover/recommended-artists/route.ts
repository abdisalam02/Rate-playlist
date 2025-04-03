import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("API Route: Recommended Artists called");
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization header in recommended-artists request');
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }
    
    // Get limit from query params (optional)
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '10';
    
    console.log(`Fetching recommended artists with limit=${limit}`);
    
    // First, we'll try to get the user's top artists
    const topArtistsResponse = await fetch(
      `https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=5`,
      {
        headers: {
          'Authorization': authHeader
        },
        cache: 'no-store'
      }
    );

    if (!topArtistsResponse.ok) {
      console.error(`Spotify API error getting top artists: ${topArtistsResponse.status}`);
    }

    const topArtistsData = topArtistsResponse.ok ? await topArtistsResponse.json() : { items: [] };
    
    // If user has top artists, get related artists for their top artist
    if (topArtistsData.items && topArtistsData.items.length > 0) {
      const topArtistId = topArtistsData.items[0].id;
      const relatedArtistsResponse = await fetch(
        `https://api.spotify.com/v1/artists/${topArtistId}/related-artists`,
        {
          headers: {
            'Authorization': authHeader
          },
          cache: 'no-store'
        }
      );
      
      if (!relatedArtistsResponse.ok) {
        console.error(`Spotify API error getting related artists: ${relatedArtistsResponse.status}`);
        return NextResponse.json(
          { error: `Spotify API error: ${relatedArtistsResponse.status}` }, 
          { status: relatedArtistsResponse.status }
        );
      }
      
      const relatedArtistsData = await relatedArtistsResponse.json();
      // Limit the number of related artists
      relatedArtistsData.items = relatedArtistsData.artists.slice(0, parseInt(limit));
      
      return NextResponse.json(relatedArtistsData);
    } 
    // If no top artists, get some recommendations based on genres
    else {
      const recommendationsResponse = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_genres=pop,rock,indie,electronic,hip-hop&limit=${limit}`,
        {
          headers: {
            'Authorization': authHeader
          },
          cache: 'no-store'
        }
      );
      
      if (!recommendationsResponse.ok) {
        console.error(`Spotify API error getting recommendations: ${recommendationsResponse.status}`);
        return NextResponse.json(
          { error: `Spotify API error: ${recommendationsResponse.status}` }, 
          { status: recommendationsResponse.status }
        );
      }
      
      const recommendationsData = await recommendationsResponse.json();
      // Extract artists from tracks
      const artists = recommendationsData.tracks
        .map((track: any) => track.artists[0])
        .filter((artist: any, index: number, self: any[]) => 
          // Remove duplicates
          index === self.findIndex((a: any) => a.id === artist.id)
        )
        .slice(0, parseInt(limit));
      
      return NextResponse.json({ items: artists });
    }
  } catch (error) {
    console.error('Recommended artists API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 