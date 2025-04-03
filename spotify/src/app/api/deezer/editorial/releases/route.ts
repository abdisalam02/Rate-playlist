import { NextResponse } from 'next/server';
// import { fetchDeezerApi } from '@/lib/deezer-api'; // Assuming you have a helper
// import { fetchRapidApi } from '@/app/utils/api'; // Trying utils path

// Helper function for standardized API responses
function createApiResponse(success: boolean, data: any = null, message: string = '') {
  return NextResponse.json({
    success,
    timestamp: new Date().toISOString(),
    data,
    message
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// GET handler for /api/deezer/editorial/releases
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') || '10'; // Default limit

  console.log(`GET /api/deezer/editorial/releases - Fetching new releases (limit: ${limit})`);

  try {
    // Construct the path to the Deezer editorial releases endpoint
    // Deezer endpoint is often /editorial/0/releases (0 for worldwide)
    const deezerApiPath = `/editorial/0/releases`; 
    
    // !!! Placeholder: Need actual implementation to call Deezer/RapidAPI !!!
    // Example using a generic fetch (replace with your actual helper)
    const deezerBaseUrl = 'https://api.deezer.com'; // Or your RapidAPI base
    const fetchUrl = `${deezerBaseUrl}${deezerApiPath}?limit=${limit}`;
    // Add Authentication headers if needed for direct Deezer API call
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);
    const deezerResponse = await response.json(); 
    // !!! End Placeholder !!!

    // Check if the response has the expected 'data' array for albums
    if (!deezerResponse || !Array.isArray(deezerResponse.data)) {
      console.error('Invalid or empty response from Deezer API for releases:', deezerResponse);
      return createApiResponse(false, null, 'Failed to fetch new releases from Deezer or invalid format');
    }

    // Transform Deezer album data from RapidAPI response
    const transformedAlbums = deezerResponse.data.map((deezerAlbum: any) => ({
      id: deezerAlbum.id.toString(),
      name: deezerAlbum.title,
      artists: deezerAlbum.artist ? [{ name: deezerAlbum.artist.name }] : [],
      images: deezerAlbum.cover_medium ? [{ url: deezerAlbum.cover_medium }] : [],
      release_date: deezerAlbum.release_date,
    }));

    console.log(`Successfully fetched and transformed ${transformedAlbums.length} new releases.`);
    
    // Return the transformed albums
    return NextResponse.json({ albums: transformedAlbums }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate' // Cache for 1 hour
      }
     });

  } catch (error: any) {
    console.error('Error fetching Deezer new releases:', error);
    return createApiResponse(false, null, `Error fetching new releases: ${error.message || 'Unknown error'}`);
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust for production
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 