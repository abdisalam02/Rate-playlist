import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/moods/custom/[id] - Fetch details for a specific custom mood
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const moodId = params.id;

  if (!moodId) {
    return NextResponse.json({ error: 'Mood ID is required' }, { status: 400 });
  }

  console.log(`Fetching details for custom mood ID: ${moodId}`);

  try {
    // Fetch the specific mood and related user info
    const { data: moodData, error: moodError } = await supabase
      .from('user_moods')
      .select(`
        id,
        mood_name,
        description,
        created_at,
        user_id,
        users ( display_name, profile_image ) 
      `)
      .eq('id', moodId)
      .single(); // Use .single() as we expect only one result

    if (moodError) {
      if (moodError.code === 'PGRST116') {
        // PGRST116 indicates that the query returned no rows
        console.log(`Custom mood with ID ${moodId} not found.`);
        return NextResponse.json({ error: 'Mood not found' }, { status: 404 });
      }
      // For other errors, log and return 500
      console.error('Supabase error fetching mood details:', moodError);
      throw moodError;
    }

    if (!moodData) {
      // Should be caught by PGRST116, but as a fallback
      console.log(`Custom mood with ID ${moodId} not found (fallback).`);
      return NextResponse.json({ error: 'Mood not found' }, { status: 404 });
    }

    // Format the data to match client expectation
    const formattedMood = {
      id: moodData.id,
      mood_name: moodData.mood_name,
      description: moodData.description,
      created_at: moodData.created_at,
      user_id: moodData.user_id,
      username: moodData.users?.display_name || 'Unknown User',
      profile_image: moodData.users?.profile_image || null,
    };

    return NextResponse.json({ success: true, data: formattedMood });

  } catch (error: any) {
    console.error('Error fetching custom mood details:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
} 