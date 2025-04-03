import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserId } from '@/lib/session';
import { supabase } from '@/lib/supabase';

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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * DELETE handler for /api/moods/user-moods/[id]
 * Deletes a specific user mood by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`DELETE /api/moods/user-moods/${params.id} - Deleting user mood`);
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.error('Unauthorized attempt to delete user mood');
      return createApiResponse(false, null, 'Unauthorized');
    }
    
    // Get user ID
    const userId = await getUserId();
    
    if (!userId && !session.user.id) {
      console.error('User ID not found for authenticated user');
      return createApiResponse(false, null, 'User not found');
    }
    
    // Use either database user ID or session ID
    const userIdentifier = userId || session.user.id;
    
    // First delete associated tracks
    try {
      console.log(`Deleting tracks for mood ${params.id}`);
      const { error: trackDeleteError } = await supabase
        .from('mood_tracks')
        .delete()
        .eq('user_mood_id', params.id);
        
      if (trackDeleteError) {
        console.warn('Error deleting associated tracks:', trackDeleteError);
        // Continue anyway as we still want to delete the mood
      }
    } catch (error) {
      console.warn('Exception when deleting associated tracks:', error);
      // Continue anyway as we still want to delete the mood
    }
    
    // Delete the mood
    const { data, error } = await supabase
      .from('user_moods')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userIdentifier)
      .select();
      
    if (error) {
      console.error('Error deleting user mood:', error);
      return createApiResponse(false, null, `Error deleting mood: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.warn(`No mood found with ID ${params.id} for user ${userIdentifier}`);
      return createApiResponse(false, null, 'Mood not found or not owned by user');
    }
    
    console.log('Mood deleted successfully:', data);
    return createApiResponse(true, data[0], 'Mood deleted successfully');
  } catch (error) {
    console.error('Error deleting user mood:', error);
    return createApiResponse(false, null, 
      `Error deleting user mood: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * PUT handler for /api/moods/user-moods/[id]
 * Updates a specific user mood by ID
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`PUT /api/moods/user-moods/${params.id} - Updating user mood`);
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.error('Unauthorized attempt to update user mood');
      return createApiResponse(false, null, 'Unauthorized');
    }
    
    // Get user ID
    const userId = await getUserId();
    
    if (!userId && !session.user.id) {
      console.error('User ID not found for authenticated user');
      return createApiResponse(false, null, 'User not found');
    }
    
    // Use either database user ID or session ID
    const userIdentifier = userId || session.user.id;
    
    // Get mood data from request body
    const moodData = await request.json();
    console.log('Update mood data:', moodData);
    
    if (!moodData.mood_name) {
      console.error('Missing required mood name');
      return createApiResponse(false, null, 'Missing required mood name');
    }
    
    // Build update object with only the fields that are provided
    const updateData: any = {};
    if (moodData.mood_name) updateData.mood_name = moodData.mood_name;
    if (moodData.description !== undefined) updateData.description = moodData.description;
    
    // Update the mood
    const { data, error } = await supabase
      .from('user_moods')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', userIdentifier)
      .select();
      
    if (error) {
      console.error('Error updating user mood:', error);
      return createApiResponse(false, null, `Error updating mood: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.warn(`No mood found with ID ${params.id} for user ${userIdentifier}`);
      return createApiResponse(false, null, 'Mood not found or not owned by user');
    }
    
    console.log('Mood updated successfully:', data);
    return createApiResponse(true, data[0], 'Mood updated successfully');
  } catch (error) {
    console.error('Error updating user mood:', error);
    return createApiResponse(false, null, 
      `Error updating user mood: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 