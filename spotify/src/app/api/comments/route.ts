import { NextRequest, NextResponse } from 'next/server';

// Mock database for storing comments (in a real app, this would be a database)
// This would typically be connected to your ratings system
const mockComments = [
  {
    id: "comment1",
    userId: "user1",
    userName: "Music Lover",
    userImage: "https://i.pravatar.cc/150?img=1",
    itemId: "3j3SfV4hAcR4XjCvW393Gr",
    itemType: "track",
    rating: 4.5,
    review: "This track is absolutely amazing! The beat is incredible and the vocals are on point.",
    date: "2023-05-15"
  },
  {
    id: "comment2",
    userId: "user2",
    userName: "Beats Explorer",
    userImage: "https://i.pravatar.cc/150?img=2",
    itemId: "3j3SfV4hAcR4XjCvW393Gr",
    itemType: "track",
    rating: 5,
    review: "One of my all-time favorites. I can't stop listening to this!",
    date: "2023-06-22"
  },
  {
    id: "comment3",
    userId: "user3",
    userName: "Melody Hunter",
    userImage: "https://i.pravatar.cc/150?img=3",
    itemId: "3j3SfV4hAcR4XjCvW393Gr",
    itemType: "track",
    rating: 3,
    review: "It's decent but I've heard better from this artist.",
    date: "2023-07-10"
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const itemType = searchParams.get('itemType');
    
    if (!itemId || !itemType) {
      return NextResponse.json({ error: 'Item ID and type are required' }, { status: 400 });
    }
    
    // Filter comments for the specific item
    const comments = mockComments.filter(
      comment => comment.itemId === itemId && comment.itemType === itemType
    );
    
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error in comments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 