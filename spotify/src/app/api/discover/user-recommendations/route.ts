import { NextRequest, NextResponse } from 'next/server';

// This would typically come from a database
// For demonstration, we'll use mock data with public image URLs
const mockUserRecommendations = [
  {
    id: '1',
    userId: 'user123',
    userName: 'Music Enthusiast',
    userImage: '/user-avatars/avatar1.jpg',
    title: 'Hidden Gems of 2023',
    description: 'These underrated tracks deserve more attention!',
    items: [
      {
        id: '4iV5W9uYEdYUVa79Axb7Rh',
        type: 'track',
        name: 'Starlight',
        artists: [{ name: 'Stellar Wave' }],
        image: '/album-covers/album1.jpg'
      },
      {
        id: '2nLtzopw4rPReszdYBJU6h',
        type: 'track',
        name: 'Midnight Drive',
        artists: [{ name: 'Neon Dreams' }],
        image: '/album-covers/album2.jpg'
      }
    ]
  },
  {
    id: '2',
    userId: 'user456',
    userName: 'Genre Explorer',
    userImage: 'https://randomuser.me/api/portraits/women/44.jpg',
    title: 'Jazz Fusion Essentials',
    description: 'Modern jazz with electronic influences',
    items: [
      {
        id: '3iQfZSYpVkWbcYQ6Dn0GXK',
        type: 'album',
        name: 'Cosmic Rhythms',
        artists: [{ name: 'Jazz Collective' }],
        image: 'https://picsum.photos/200/200?random=3'
      }
    ]
  }
];

export async function GET(request: NextRequest) {
  console.log("API Route: User Recommendations called");
  
  // Updated mock recommendations with publicly accessible images
  const mockRecommendations = [
    {
      id: "1",
      userId: "user1",
      userName: "Alex Music Lover",
      userImage: "https://randomuser.me/api/portraits/men/32.jpg", // External placeholder
      title: "Hidden Gems of 2023",
      description: "These underrated tracks deserve more attention!",
      items: [
        {
          id: "1abc",
          type: "track",
          name: "Midnight Drive",
          artists: [{ name: "Neon Wave" }],
          image: "https://picsum.photos/200/200?random=1" // External placeholder
        },
        {
          id: "2xyz",
          type: "track",
          name: "Summer Memories",
          artists: [{ name: "Coastal Dreams" }],
          image: "https://picsum.photos/200/200?random=2" // External placeholder
        }
      ]
    },
    {
      id: "2",
      userId: "user2",
      userName: "Melody Explorer",
      userImage: "https://randomuser.me/api/portraits/women/44.jpg", // External placeholder
      title: "Perfect Workout Mix",
      description: "High-energy tracks to keep you motivated!",
      items: [
        {
          id: "3def",
          type: "track",
          name: "Power Up",
          artists: [{ name: "Energy Boost" }],
          image: "https://picsum.photos/200/200?random=3" // External placeholder
        },
        {
          id: "4ghi",
          type: "track",
          name: "Run The Distance",
          artists: [{ name: "Endurance" }],
          image: "https://picsum.photos/200/200?random=4" // External placeholder
        }
      ]
    }
  ];
  
  return NextResponse.json({ recommendations: mockRecommendations });
} 