import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, AppSession } from '@/lib/auth';
import supabase from '@/utils/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { replyId: string } }
) {
  try {
    const { replyId } = params;
    console.log(`Attempting to delete reply with ID: ${replyId}`);

    if (!replyId) {
      return NextResponse.json({ error: 'Reply ID is required' }, { status: 400 });
    }

    // 1. Get user session
    const session = await getServerSession(authOptions) as AppSession | null;
    if (!session?.user?.id) {
      console.error('Authentication required for deleting reply');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const sessionUserId = session.user.id;
    console.log(`Authenticated user ID (Supabase Auth): ${sessionUserId}`);

    // 2. Fetch the reply to verify ownership
    const { data: replyData, error: fetchError } = await supabase
      .from('review_replies')
      .select('id, user_id')
      .eq('id', replyId)
      .single();

    if (fetchError) {
      console.error(`Error fetching reply ${replyId} for deletion:`, fetchError);
      if (fetchError.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch reply' }, { status: 500 });
    }

    if (!replyData) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
    }

    console.log(`Reply ${replyId} belongs to user ${replyData.user_id}`);

    // 3. Check ownership
    if (replyData.user_id !== sessionUserId) {
      console.warn(`User ${sessionUserId} attempted to delete reply ${replyId} owned by ${replyData.user_id}`);
      return NextResponse.json({ error: 'You are not authorized to delete this reply' }, { status: 403 }); // Forbidden
    }

    // 4. Delete the reply
    // TODO: Consider what to do with child replies.
    // Option 1 (Current): Just delete this reply. Children become orphans (parent_reply_id points to nothing).
    // Option 2: Cascade delete children (Requires DB setup or recursive delete logic here).
    // Option 3: Mark as deleted (soft delete) instead of actually deleting.
    const { error: deleteError } = await supabase
      .from('review_replies')
      .delete()
      .eq('id', replyId);

    if (deleteError) {
      console.error(`Error deleting reply ${replyId}:`, deleteError);
      return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 });
    }

    console.log(`Reply ${replyId} deleted successfully by user ${sessionUserId}`);
    // 5. Return success response
    return NextResponse.json({ success: true, message: 'Reply deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/ratings/replies/[replyId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 