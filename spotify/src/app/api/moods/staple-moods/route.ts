import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStapleMoods } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { checkDbConnection, checkTableExists } from '@/lib/db-status';

/**
 * Helper function to create standardized API responses
 */
function createApiResponse(success: boolean, data: any = null, message: string = '') {
  return NextResponse.json({
    success,
    timestamp: new Date().toISOString(),
    data,
    message
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * GET handler for /api/moods/staple-moods
 * Returns all staple moods defined in the system
 */
export async function GET(request: Request) {
  console.log('GET /api/moods/staple-moods - Fetching all staple moods');
  
  try {
    // Get staple moods
    const stapleMoods = await getStapleMoods();
    
    console.log(`Retrieved ${stapleMoods.length} staple moods`);
    return createApiResponse(true, stapleMoods);
  } catch (error) {
    console.error('Error fetching staple moods:', error);
    return createApiResponse(false, null, 
      `Error fetching staple moods: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate mock staple moods for testing when database doesn't have any
 */
function getMockStapleMoods() {
  return [
    {
      id: 'mock-happy',
      mood_name: 'Happy',
      description: 'Upbeat and joyful songs to lift your mood',
      default_track_id: '4iV5W9uYEdYUVa79Axb7Rh',
      default_track_name: 'Starboy',
      default_artist_name: 'The Weeknd',
      default_track_image: 'https://i.scdn.co/image/ab67616d0000b2738399047ff71200928f5b4be2',
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-relaxed',
      mood_name: 'Relaxed',
      description: 'Calm and soothing tracks for unwinding',
      default_track_id: '6DCZcSspjsKoFjzjrWoCdn',
      default_track_name: 'God\'s Plan',
      default_artist_name: 'Drake',
      default_track_image: 'https://i.scdn.co/image/ab67616d0000b273731731446f99d23a3535bd3f',
      created_at: new Date().toISOString()
    },
    {
      id: 'mock-focus',
      mood_name: 'Focus',
      description: 'Concentration-enhancing music for work or study',
      default_track_id: '3n3Ppam7vgaVa1iaRUc9Lp',
      default_track_name: 'Party Monster',
      default_artist_name: 'The Weeknd',
      default_track_image: 'https://i.scdn.co/image/ab67616d0000b273e52a59eb13be11ca6f8aca66',
      created_at: new Date().toISOString()
    }
  ];
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 