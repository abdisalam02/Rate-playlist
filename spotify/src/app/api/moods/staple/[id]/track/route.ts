import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addTrackToStapleMood, removeTrackFromStapleMood } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`API: Received POST request to add track to staple mood ${params.id}`);
  
  try {
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    console.log('Add staple mood track API - Session found:', !!session);

    if (!session?.user?.email) {
      console.error('Unauthorized access attempt to add staple mood track');
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get user ID from session
    const userId = await getUserId();
    console.log('Add staple mood track API - User ID:', userId);

    if (!userId) {
      console.error('User not found when adding staple mood track');
      return NextResponse.json({ error: 'User not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Parse request body
    const body = await request.json();
    console.log('Add staple mood track request body:', body);
    
    if (!body.track_id || !body.track_name || !body.artist_name) {
      return NextResponse.json({ error: 'Missing required track data' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Add track to staple mood
    const track = await addTrackToStapleMood(userId, params.id, {
      track_id: body.track_id,
      track_name: body.track_name,
      artist_name: body.artist_name,
      track_image: body.track_image || ''
    });
    
    console.log('Track added to staple mood successfully:', track);
    return NextResponse.json(track, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error adding track to staple mood:', error);
    return NextResponse.json(
      { error: 'Failed to add track to staple mood', details: error instanceof Error ? error.message : 'Unknown error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`API: Received DELETE request to remove track from staple mood ${params.id}`);
  
  try {
    // Verify authenticated session
    const session = await getServerSession(authOptions);
    console.log('Remove staple mood track API - Session found:', !!session);

    if (!session?.user?.email) {
      console.error('Unauthorized access attempt to remove staple mood track');
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get user ID from session
    const userId = await getUserId();
    console.log('Remove staple mood track API - User ID:', userId);

    if (!userId) {
      console.error('User not found when removing staple mood track');
      return NextResponse.json({ error: 'User not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Remove track from staple mood
    await removeTrackFromStapleMood(userId, params.id);
    
    console.log('Track removed from staple mood successfully');
    return NextResponse.json({ success: true }, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error removing track from staple mood:', error);
    return NextResponse.json(
      { error: 'Failed to remove track from staple mood', details: error instanceof Error ? error.message : 'Unknown error' },
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
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 