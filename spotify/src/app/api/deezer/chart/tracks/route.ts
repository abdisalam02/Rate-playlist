import { NextRequest, NextResponse } from 'next/server';

// Define basic types locally 
interface Artist { name: string; id?: number; }
interface Album { title?: string; id?: number; cover_medium?: string; }
interface DeezerChartTrack {
  id: number | string; // Use string as well for consistency
  title: string;
  title_short?: string;
  duration?: number; // Make optional as it might be missing
  preview?: string | null; // Allow null
  explicit_lyrics?: boolean;
  artist?: Artist; // Make optional
  album?: Album; // Make optional
}

// Set caching behavior
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper function to fetch chart tracks from Deezer API
async function fetchDeezerChartTracksFromAPI(limit: number = 50): Promise<DeezerChartTrack[]> {
    const url = `https://api.deezer.com/chart/0/tracks?limit=${limit}`;
    console.log(`[API Deezer Chart - Simplified] Fetching from ${url}`);
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            console.error(`[API Deezer Chart - Simplified] Deezer API error: ${response.status} ${response.statusText}`);
            const errorBody = await response.text();
            console.error(`[API Deezer Chart - Simplified] Deezer error body: ${errorBody}`);
            throw new Error(`Failed to fetch Deezer chart tracks: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`[API Deezer Chart - Simplified] Received response structure from Deezer:`, Object.keys(data));
        
        // Expect tracks usually in the 'data' property of the root object
        const tracks = data?.data;
         if (!Array.isArray(tracks)) {
             console.error(`[API Deezer Chart - Simplified] Unexpected data structure from Deezer. Expected 'data' array. Received:`, data);
             return []; // Return empty if structure is wrong
         }
        console.log(`[API Deezer Chart - Simplified] Received ${tracks.length} tracks from Deezer chart.`);
        return tracks as DeezerChartTrack[];
    } catch (error) {
        console.error(`[API Deezer Chart - Simplified] Error fetching Deezer chart tracks:`, error);
        return []; // Return empty array on error
    }
}

/**
 * GET handler for /api/deezer/chart/tracks
 * Fetches tracks from the global Deezer chart.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    if (isNaN(limit) || limit <= 0) {
        return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }

    console.log(`[API Deezer Chart - Simplified] GET called, Limit: ${limit}`);

    try {
        // Fetch raw Deezer chart tracks
        const deezerTracks: DeezerChartTrack[] = await fetchDeezerChartTracksFromAPI(limit);
        
        // Return the raw Deezer tracks, nested as expected by the Home page (page.tsx)
        console.log(`[API Deezer Chart - Simplified] Returning ${deezerTracks.length} raw Deezer chart tracks.`);
        return NextResponse.json({ tracks: { data: deezerTracks } }); 

    } catch (error) {
        console.error(`[API Deezer Chart - Simplified] Final catch block error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}