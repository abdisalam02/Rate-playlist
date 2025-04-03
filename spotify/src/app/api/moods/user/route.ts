import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserMoods, createUserMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

// Empty default user moods with instructions
const getEmptyUserMoods = (userId: string) => [
  {
    id: 'empty-default',
    user_id: userId,
    mood_name: 'Create Your First Mood',
    description: 'Click "Create Mood" above to start organizing your music by mood or occasion.',
    created_at: new Date().toISOString(),
    isEmpty: true
  }
];

export async function GET(request: Request) {
  console.log('API: Received GET request to user moods');
  
  try {
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    console.log('User moods API - Session found:', !!session);

    if (!session?.user?.email) {
      console.error('Unauthorized access attempt to user moods');
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // Get user ID from session
    const userId = await getUserId();
    console.log('User moods API - User ID:', userId);

    if (!userId) {
      console.error('User not found when accessing user moods');
      return NextResponse.json({ error: 'User not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get user moods
    const moods = await getUserMoods(userId);
    console.log(`Retrieved ${moods.length} user moods`);
    
    return NextResponse.json(moods, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in user moods GET route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user moods', details: error instanceof Error ? error.message : 'Unknown error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function POST(request: Request) {
  console.log('API: Received POST request to create user mood');
  
  try {
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    console.log('Create mood API - Session found:', !!session);

    if (!session?.user?.email) {
      console.error('Unauthorized access attempt to create mood');
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get user ID from session
    const userId = await getUserId();
    console.log('Create mood API - User ID:', userId);

    if (!userId) {
      console.error('User not found when creating mood');
      return NextResponse.json({ error: 'User not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Parse request body
    const body = await request.json();
    console.log('Create mood request body:', body);
    
    if (!body.mood_name) {
      return NextResponse.json({ error: 'Mood name is required' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Create the mood
    const mood = await createUserMood(userId, {
      mood_name: body.mood_name,
      description: body.description || ''
    });
    
    console.log('Mood created successfully:', mood);
    return NextResponse.json(mood, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in create mood route:', error);
    return NextResponse.json(
      { error: 'Failed to create mood', details: error instanceof Error ? error.message : 'Unknown error' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 