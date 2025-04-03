import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStapleMoods } from '@/lib/supabase';

export async function GET(request: Request) {
  console.log('API: Received GET request to staple moods');
  
  try {
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    console.log('Staple moods API - Session found:', !!session);

    if (!session?.user?.email) {
      console.error('Unauthorized access attempt to staple moods');
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Get staple moods
    const moods = await getStapleMoods();
    console.log(`Retrieved ${moods.length} staple moods`);
    
    return NextResponse.json(moods, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in staple moods GET route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staple moods', details: error instanceof Error ? error.message : 'Unknown error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 