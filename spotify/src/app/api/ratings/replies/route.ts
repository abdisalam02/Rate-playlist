import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, AppSession } from '@/lib/auth';
import supabase from '@/utils/supabase';

export async function POST(request: NextRequest) {
  try {
    // 1. Get user session
    const session = await getServerSession(authOptions) as AppSession | null;
    
    const correctUserId = session?.user?.id;
    if (!correctUserId) {
      console.error('No valid user ID (Supabase UUID) in session for posting reply');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    console.log(`Authenticated user ID for reply: ${correctUserId}`);

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

    // 5. Insert reply into review_replies table using the CORRECT user ID
    const insertPayload = {
        rating_id: ratingId,
        user_id: correctUserId,
        reply_text: replyText.trim(),
        parent_reply_id: parentReplyId || null
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
      `)
      .single();

    if (insertError) {
      console.error('Error inserting reply:', insertError);
      if (insertError.code === '23503') {
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

    return NextResponse.json({ 
        success: true, 
        message: 'Reply submitted successfully',
        reply: formattedReply
    });

  } catch (error) {
    console.error('Error in ratings/replies POST route:', error);
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