import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/moods/custom/[id]/tracks - Fetch tracks for a specific custom mood
export async function GET(
  request: Request, // Keep request parameter even if unused for now
  { params }: { params: { id: string } }
) {
  const moodId = params.id;

  if (!moodId) {
    return NextResponse.json({ error: 'Mood ID is required' }, { status: 400 });
  }

  console.log(`[API Tracks] Fetching tracks for custom mood ID: ${moodId}`);

  try {
    console.log("[API Tracks] Attempting Supabase query...");
    // Fetch tracks associated with the user_mood_id
    const { data: tracksData, error: tracksError } = await supabase
      .from('mood_tracks')
      .select(`
        id, 
        track_id, 
        track_name, 
        artist_name, 
        track_image, 
        added_at 
      `)
      .eq('user_mood_id', moodId)
      .order('added_at', { ascending: false }); // Example order: newest first

    console.log("[API Tracks] Supabase query completed.");

    if (tracksError) {
      console.error('[API Tracks] Supabase error fetching mood tracks:', tracksError);
      throw tracksError;
    }

    console.log(`[API Tracks] Fetched ${tracksData?.length ?? 0} tracks from DB.`);

    // Format the data slightly if needed by the client's Track interface
    // (Assuming client expects 'name' and 'artists' array for TrackList)
    console.log("[API Tracks] Starting data formatting...");
    const formattedTracks = tracksData?.map((track, index) => {
      // Log the first track being processed
      if (index === 0) {
          console.log("[API Tracks] Processing first track:", JSON.stringify(track, null, 2));
      }
      let artists = [];
      try {
        artists = track.artist_name ? track.artist_name.split(',').map(name => ({ name: name.trim() })) : [];
      } catch (e) {
        console.error(`[API Tracks] Error parsing artist_name for track ID ${track.id}:`, track.artist_name, e);
        // Keep artists as empty array on error
      }

      return {
          id: track.track_id, 
          spotify_track_id: track.track_id, 
          mood_track_db_id: track.id, 
          name: track.track_name,
          artists: artists, // Use parsed artists
          album: { images: track.track_image ? [{ url: track.track_image }] : [] }, 
          added_at: track.added_at,
          // Add duration_ms, preview_url if fetched and needed
      };
    }) || [];
    console.log("[API Tracks] Data formatting complete.");

    return NextResponse.json({ success: true, data: formattedTracks });

  } catch (error: any) {
    console.error('[API Tracks] Error in GET handler:', error);
    return NextResponse.json(
      { error: `Internal server error fetching tracks: ${error.message}` },
      { status: 500 }
    );
  }
} 