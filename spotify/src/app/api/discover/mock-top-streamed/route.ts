import { NextResponse } from 'next/server';

export async function GET() {
  // This is a reliable mock data source for top streamed songs
  const mockTracks = [
    {
      id: "7qiZfU4dY1lWllzX7mPBI3",
      name: "Shape of You",
      artists: [{ id: "6eUKZXaKkcviH0Ku9w2n3V", name: "Ed Sheeran" }],
      album: {
        id: "3T4tUhGYeRNVUGevb0wThu",
        name: "÷ (Divide)",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96" }]
      },
      duration_ms: 233713
    },
    {
      id: "5CtI0qwDJkDQGwXD1H1cLb",
      name: "Despacito - Remix",
      artists: [
        { id: "4V8Sr092TqfHkfAA5fXXqG", name: "Luis Fonsi" },
        { id: "4VMYDCV2IEDYJArk749S6m", name: "Daddy Yankee" },
        { id: "1uNFoZAHBGtllmzznpCI3s", name: "Justin Bieber" }
      ],
      album: {
        id: "5C0YLr4OoRGFDaqdMQmkeH",
        name: "Despacito (Remix)",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273ef0d4234e1a645740f77d59c" }]
      },
      duration_ms: 228826
    },
    {
      id: "6habFhsOp2NvshLv26DqMb",
      name: "Blinding Lights",
      artists: [{ id: "1Xyo4u8uXC1ZmMpatF05PJ", name: "The Weeknd" }],
      album: {
        id: "2nLOHgzXzwFEpl62zAgCEC",
        name: "After Hours",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36" }]
      },
      duration_ms: 200040
    },
    {
      id: "0e7ipj03S05BNilyu5bRzt",
      name: "Rockstar (feat. 21 Savage)",
      artists: [
        { id: "246dkjvS1zLTtiykXe5h60", name: "Post Malone" },
        { id: "1URnnhqYAYcrqrcwql10ft", name: "21 Savage" }
      ],
      album: {
        id: "1YV5Rh5l0hyYCZUKWrajvZ",
        name: "beerbongs & bentleys",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2739b19c107109de740bad72df5" }]
      },
      duration_ms: 218146
    },
    {
      id: "3GCdLUSnKSMJufREtI12EP",
      name: "Levitating",
      artists: [{ id: "6M2wZ9GZgrQXHCFfjv46we", name: "Dua Lipa" }],
      album: {
        id: "5lKlFlReHOLShQKyRv6AL9",
        name: "Future Nostalgia",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946" }]
      },
      duration_ms: 203807
    },
    {
      id: "60ynsPSSKe6O3sfwRnIBRf",
      name: "Dance Monkey",
      artists: [{ id: "2NjfBq1NflQcKSeiDooVjY", name: "Tones And I" }],
      album: {
        id: "3Ks0eeH0GWpY4AU20D5HPD",
        name: "Dance Monkey",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2738ad8f5243d6eae209be65d40" }]
      },
      duration_ms: 209438
    },
    {
      id: "0nrRP2bk19rLc0orkWPQk2",
      name: "Dynamite",
      artists: [{ id: "3Nrfpe0tUJi4K4DXYWgMUX", name: "BTS" }],
      album: {
        id: "2qehskW9lYGWfYb0xPZkrS",
        name: "Dynamite (DayTime Version)",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273dd773055388d8ff4222894b5" }]
      },
      duration_ms: 199053
    },
    {
      id: "5ghIJDpPoe3CfHMGu71E6T",
      name: "Sunflower - Spider-Man: Into the Spider-Verse",
      artists: [
        { id: "246dkjvS1zLTtiykXe5h60", name: "Post Malone" },
        { id: "2tIP7SsRs7vjIcLrU85W8J", name: "Swae Lee" }
      ],
      album: {
        id: "1P74dQM7kmokC8Iu99JTgO",
        name: "Spider-Man: Into the Spider-Verse (Soundtrack From & Inspired by the Motion Picture)",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b27394234b8c5c91e2a599f4bb6c" }]
      },
      duration_ms: 157560
    },
    {
      id: "6UelLqGlWMcVH1E5c4H7lY",
      name: "Watermelon Sugar",
      artists: [{ id: "6KImCVD70vtIoJWnq6nGn3", name: "Harry Styles" }],
      album: {
        id: "7xV2TzoaVc0ycW7fwBwAml",
        name: "Fine Line",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2739e495fb707973f3390850eea" }]
      },
      duration_ms: 174000
    },
    {
      id: "7ytR5pFWmSjzHJIeQkgog4",
      name: "STAY (with Justin Bieber)",
      artists: [
        { id: "5vY42LlbRZmbHlMuXrJfQo", name: "The Kid LAROI" },
        { id: "1uNFoZAHBGtllmzznpCI3s", name: "Justin Bieber" }
      ],
      album: {
        id: "6cgXFXDX9txJdRsVYtQzpu",
        name: "STAY (with Justin Bieber)",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273e6f407c7f3a0ec98845e4431" }]
      },
      duration_ms: 141805
    }
  ];

  console.log("Returning mock top 100 most streamed tracks data");
  return NextResponse.json({
    tracks: mockTracks
  });
} 