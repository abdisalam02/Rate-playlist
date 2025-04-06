import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Adjust path
import { fetchWithToken } from '@/app/utils/api'; // Assuming you have this utility

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Helper function to add tracks in batches
async function addTracksToPlaylist(playlistId: string, trackUris: string[], accessToken: string): Promise<boolean> {
    const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    const batchSize = 100; // Spotify limit
    let success = true;

    console.log(`[API Export] Adding ${trackUris.length} tracks to playlist ${playlistId}...`);

    for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);
        console.log(`[API Export] Adding batch ${Math.floor(i / batchSize) + 1} (${batch.length} tracks)`);
        try {
            const response = await fetchWithToken(spotifyApiUrl, accessToken, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uris: batch }),
            });
            // Spotify returns 201 Created on success
             if (response.snapshot_id) { // Check for snapshot_id which indicates success
                 console.log(`[API Export] Batch ${Math.floor(i / batchSize) + 1} added successfully.`);
             } else {
                 console.error(`[API Export] Failed to add batch ${Math.floor(i / batchSize) + 1}. Response:`, response);
                 // Decide if you want to stop on failure or continue
                 success = false; 
                 // break; // Uncomment to stop after first failed batch
             }

        } catch (batchError) {
            console.error(`[API Export] Error adding batch ${Math.floor(i / batchSize) + 1}:`, batchError);
            success = false;
            // break; // Uncomment to stop after first failed batch
        }
    }
    return success;
}


// Handles exporting favorited tracks to a Spotify playlist
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
    }

    const spotifyUserId = session.user.id; // Spotify User ID from session

    try {
        const body = await request.json();
        const { trackIds, targetPlaylistId, newPlaylistName } = body;

        if (!Array.isArray(trackIds) || trackIds.length === 0) {
            return NextResponse.json({ error: 'Missing or empty trackIds array' }, { status: 400 });
        }
        if (!targetPlaylistId && !newPlaylistName) {
            return NextResponse.json({ error: 'Either targetPlaylistId or newPlaylistName is required' }, { status: 400 });
        }
        if (targetPlaylistId && newPlaylistName) {
            return NextResponse.json({ error: 'Provide either targetPlaylistId or newPlaylistName, not both' }, { status: 400 });
        }

        let playlistIdToAddTracksTo = targetPlaylistId;

        // 1. Create New Playlist if requested
        if (newPlaylistName) {
            console.log(`[API Export] Creating new playlist "${newPlaylistName}" for user ${spotifyUserId}`);
            const createPlaylistUrl = `https://api.spotify.com/v1/users/${spotifyUserId}/playlists`;
            try {
                const newPlaylistData = await fetchWithToken(createPlaylistUrl, session.accessToken, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: newPlaylistName,
                        public: false, // Default to private, or make it an option
                        description: `My favorite tracks from MusicBoxd - ${new Date().toLocaleDateString()}`
                    }),
                });

                if (!newPlaylistData?.id) {
                     console.error("[API Export] Failed to create playlist. Response:", newPlaylistData);
                     throw new Error("Failed to create Spotify playlist.");
                }
                playlistIdToAddTracksTo = newPlaylistData.id;
                console.log(`[API Export] Created playlist with ID: ${playlistIdToAddTracksTo}`);
            } catch (createError) {
                 console.error('[API Export] Error creating playlist:', createError);
                 return NextResponse.json({ error: 'Failed to create Spotify playlist', details: (createError as Error).message }, { status: 500 });
            }
        }

        if (!playlistIdToAddTracksTo) {
             console.error("[API Export] No target playlist ID determined.");
             return NextResponse.json({ error: 'Could not determine target playlist ID' }, { status: 500 });
        }

        // 2. Add Tracks to Playlist (New or Existing)
        const trackUris = trackIds.map(id => `spotify:track:${id}`);
        const addSuccess = await addTracksToPlaylist(playlistIdToAddTracksTo, trackUris, session.accessToken);

        if (!addSuccess) {
            // Even if some batches failed, we might still return a partial success message
             console.warn(`[API Export] Some tracks may not have been added to playlist ${playlistIdToAddTracksTo}.`);
             return NextResponse.json({ 
                 success: false, // Indicate partial failure
                 message: 'Playlist created/updated, but failed to add some tracks.', 
                 playlistId: playlistIdToAddTracksTo 
                }, { status: 207 }); // Multi-Status response
        }

        console.log(`[API Export] Successfully added tracks to playlist ${playlistIdToAddTracksTo}`);
        return NextResponse.json({ 
            success: true, 
            message: `Tracks successfully added to playlist!`, 
            playlistId: playlistIdToAddTracksTo 
        });

    } catch (error: any) {
        if (error instanceof SyntaxError) {
          console.error('[API Export] Error parsing request body:', error);
          return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        console.error('[API Export] Error exporting favorites:', error);
        return NextResponse.json({ error: 'Internal server error during export', details: error.message }, { status: 500 });
    }
}
