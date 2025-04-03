import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log("API Route: Mock New Releases called");
  
  // This is a reliable mock data source for new releases
  const mockNewReleases = {
    albums: {
      href: "https://api.spotify.com/v1/browse/new-releases?country=US&limit=20&offset=0",
      items: [
        {
          id: "6FJxoadUE4JNVwWHghBwnb",
          name: "BANDO WAVE",
          artists: [{ id: "5f7VJjfbwm532GiveGC0ZK", name: "Lil Baby" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b2730e36a5a25a88ceb489d9a2f1" }],
          release_date: "2023-12-08",
          total_tracks: 22
        },
        {
          id: "0KJ0y7dOxbYLJj3JOgWHQM",
          name: "NOT TIL THE MORNING",
          artists: [{ id: "0Y5tJX1MQlPlqiwlOH1tJY", name: "Travis Scott" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b273d6844f05534641f3ca80d789" }],
          release_date: "2023-11-10",
          total_tracks: 19
        },
        {
          id: "3xxsNucj0QYF2X0uHJdGxw",
          name: "The Rise and Fall of a Midwest Princess (Deluxe)",
          artists: [{ id: "6Ao5d3IKWmkgKZ9Ip1H2MA", name: "Chappell Roan" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b273eaac2a7955f5b8967991cacf" }],
          release_date: "2023-09-28",
          total_tracks: 16
        },
        {
          id: "26b5cd3rVrGQdMA0UxJ1V0",
          name: "White Night",
          artists: [{ id: "4O15NlyKLIASxsJ0PrXPfz", name: "Lil Uzi Vert" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b27360bfa9f373c96521b992d171" }],
          release_date: "2023-11-17",
          total_tracks: 10
        },
        {
          id: "5ju16uL0PhoFTW1JpKk9dG",
          name: "FOR ALL THE DOGS SCARY HOURS EDITION",
          artists: [{ id: "3TVXtAsR1Inumwj472S9r4", name: "Drake" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b273a49421dd3a18169d5845ffe3" }],
          release_date: "2023-11-17",
          total_tracks: 29
        },
        {
          id: "06UuXmAQjYW5RhMXMvwlOH",
          name: "One More Time...",
          artists: [{ id: "6qqNVTkY8uBg9cP3Jd7DAH", name: "Blink-182" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b2730c13d3d5a503c84fcc63274e" }],
          release_date: "2023-10-20",
          total_tracks: 17
        },
        {
          id: "1rEZ0WnUd2BAKdlgev8R7i",
          name: "I've Tried Everything But Therapy (Part 1)",
          artists: [{ id: "4pdoRs7yM0glVGQqHg3bIG", name: "Teddy Swims" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b2736f70404014182d076e8c64d5" }],
          release_date: "2023-10-13",
          total_tracks: 12
        },
        {
          id: "37cCPEtMGYzqTfkwYLkX9q",
          name: "1989 (Taylor's Version)",
          artists: [{ id: "06HL4z0CvFAxyc27GXpf02", name: "Taylor Swift" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b273a76121cdb63451f9cd3ade85" }],
          release_date: "2023-10-27",
          total_tracks: 21
        },
        {
          id: "4PETVRrMOAW3tQpqT81NJZ",
          name: "Jackman",
          artists: [{ id: "2YZyLoL8N0Wb9xBt1NhZWg", name: "Jack Harlow" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b273f54faf4e49fe52b4b0d0dbcd" }],
          release_date: "2023-04-28",
          total_tracks: 10
        },
        {
          id: "5S9lQWRIQmVxwjJIKPruPL",
          name: "Pink Friday 2",
          artists: [{ id: "0hCNtLu0JehylgoiP8L4Gh", name: "Nicki Minaj" }],
          images: [{ url: "https://i.scdn.co/image/ab67616d0000b273bdf3aa1e8e42f67acf8f2aff" }],
          release_date: "2023-12-08",
          total_tracks: 22
        }
      ],
      limit: 20,
      next: "https://api.spotify.com/v1/browse/new-releases?country=US&limit=20&offset=20",
      offset: 0,
      previous: null,
      total: 100
    }
  };

  console.log("Returning mock new releases data");
  return NextResponse.json(mockNewReleases);
} 