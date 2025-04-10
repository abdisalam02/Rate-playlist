import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import supabase from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    // 1. Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('No valid user ID in session for posting reply');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { ratingId, replyText, parentReplyId } = await request.json();
    console.log(`Received reply request - ratingId: ${ratingId}, parentReplyId: ${parentReplyId}, replyText length: ${replyText?.length || 0}`);

    // 3. Validate required fields
    if (!ratingId || !replyText) {
      console.error(`Missing required fields - ratingId: ${!!ratingId}, replyText: ${!!replyText}`);
      return NextResponse.json(
        { error: 'Rating ID and reply text are required' },
        { status: 400 }
      );
    }
    
    if (typeof replyText !== 'string' || replyText.trim().length === 0) {
        console.error(`Invalid reply text: ${replyText}`);
        return NextResponse.json(
            { error: 'Reply text cannot be empty' },
            { status: 400 }
        );
    }

    // 4. Get internal user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('spotify_id', session.user.id)
      .single();

    if (userError || !userData) {
      console.error('Error finding user for reply:', userError);
      // Attempt to create user if not found (optional, adjust based on desired behavior)
      // For now, just return an error if user not found
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    const userId = userData.id;
    console.log(`User ID for reply: ${userId}`);

    // 5. Insert reply into review_replies table
    const insertPayload = {
        rating_id: ratingId,
        user_id: userId,
        reply_text: replyText.trim(), // Ensure trimmed text is saved
        parent_reply_id: parentReplyId || null // Use null if not provided
    };
    console.log("Inserting reply with payload:", insertPayload);

    const { data: replyData, error: insertError } = await supabase
      .from('review_replies')
      .insert(insertPayload)
      .select(`
        *,
        user:user_id (
            id,
            spotify_id,
            display_name,
            profile_image
        )
      `) // Select the newly created reply along with user info
      .single();

    if (insertError) {
      console.error('Error inserting reply:', insertError);
      // Check for specific errors, e.g., foreign key constraint violation (invalid ratingId or parentReplyId)
      if (insertError.code === '23503') { // Foreign key violation
           // Could be invalid rating_id or invalid parent_reply_id
           // More specific error checking might be needed if the DB schema allows differentiating
           return NextResponse.json(
             { error: 'Invalid rating ID or parent reply ID. Cannot add reply.' }, 
             { status: 404 }
           );
      }
      return NextResponse.json(
        { error: 'Failed to save reply', details: insertError.message },
        { status: 500 }
      );
    }

    console.log('Reply successfully inserted:', replyData);

    // Format the response to match potential frontend expectations
     const formattedReply = {
        id: replyData.id,
        ratingId: replyData.rating_id,
        parentReplyId: replyData.parent_reply_id,
        replyText: replyData.reply_text,
        createdAt: replyData.created_at,
        userId: replyData.user?.id,
        userName: replyData.user?.display_name,
        userImage: replyData.user?.profile_image
     };

    // 6. Return success response with the created reply data
    return NextResponse.json({ 
        success: true, 
        message: 'Reply submitted successfully',
        reply: formattedReply // Include the newly created reply
    });

  } catch (error) {
    console.error('Error in ratings/replies POST route:', error);
    // Distinguish between JSON parsing errors and other errors
    if (error instanceof SyntaxError) {
        return NextResponse.json(
          { error: 'Invalid request body format. Expected JSON.' },
          { status: 400 }
        );
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Optional: Add a GET handler if needed in the future, e.g., to get replies for a specific rating ID
// export async function GET(request: NextRequest) { ... } 