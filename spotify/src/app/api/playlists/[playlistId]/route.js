// app/api/playlists/[playlistId]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

export async function GET(request, { params }) {
  const { playlistId } = params;
  // Fetch the playlist record
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .single();
  if (playlistError) {
    return NextResponse.json({ error: playlistError.message }, { status: 404 });
  }
  // Fetch the songs for this playlist
  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('*')
    .eq('playlist_id', playlistId);
  if (songsError) {
    return NextResponse.json({ error: songsError.message }, { status: 500 });
  }
  // Return a combined object
  return NextResponse.json({ ...playlist, songs });
}
