// app/api/ratings/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request) {
  try {
    const { playlistId, ratings } = await request.json();
    if (!playlistId || !Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }
    // Insert each rating into the ratings table
    for (const { songId, rating } of ratings) {
      const { error } = await supabase.from('ratings').insert({
        playlist_id: playlistId,
        song_id: songId,
        rating,
      });
      if (error) {
        console.error('Error inserting rating for song', songId, error.message);
      }
    }
    // Compute the average rating for this playlist
    const { data: avgData, error: avgError } = await supabase
      .from('ratings')
      .select('rating', { count: 'exact', head: false })
      .eq('playlist_id', playlistId);
    if (avgError) {
      throw new Error(avgError.message);
    }
    const ratingsArray = avgData.map((r) => r.rating);
    const average =
      ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
    return NextResponse.json({ average });
  } catch (error) {
    console.error('Error in POST /api/ratings:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
