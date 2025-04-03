import { NextResponse } from 'next/server';

export async function GET() {
  // This is a reliable mock data source that never changes
  // Useful as a fallback for when the real API calls fail
  const mockTracks = [
    {
      id: "4cOdK2wGLETKBW3PvgPWqT",
      name: "Bohemian Rhapsody",
      artists: [{ id: "1dfeR4HaWDbWqFHLkxsg1d", name: "Queen" }],
      album: {
        id: "6i6folBtxKV28WX3msQ4FE",
        name: "A Night At The Opera",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2734a3fd0e10a29c611c6b0d8f1" }]
      },
      duration_ms: 354320
    },
    {
      id: "3z8h0TU7ReDPLIbEnYhWZb",
      name: "Billie Jean",
      artists: [{ id: "3fMbdgg4jU18AjLCvBBDxt", name: "Michael Jackson" }],
      album: {
        id: "1pzvBxYgT6OVwJLtHkrdQK",
        name: "Thriller",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273d9620eb6c05530bda7650af8" }]
      },
      duration_ms: 293826
    },
    {
      id: "6rqhFgbbKwnb9MLmUQDhG6",
      name: "Imagine",
      artists: [{ id: "4x1nvY2FN8jxqAFA0DA02H", name: "John Lennon" }],
      album: {
        id: "0xzScRdnWlTF2oQbYlTDDP",
        name: "Imagine",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b27399581550ef9746ca582bb3cc" }]
      },
      duration_ms: 183093
    },
    {
      id: "4pbJqGIASGPr0ZpGpnWkDn",
      name: "Smells Like Teen Spirit",
      artists: [{ id: "6olE6TJLqED3rqDCT0FyPh", name: "Nirvana" }],
      album: {
        id: "5ht7ItJgpBH7W6vJ5BqpPF",
        name: "Nevermind",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273e175a19e530c898d167d39bf" }]
      },
      duration_ms: 301920
    },
    {
      id: "7a53HqqArd4b9NF4XAmlbI",
      name: "Hotel California",
      artists: [{ id: "0ECwFtbIWEVNwjlrfc6xoL", name: "Eagles" }],
      album: {
        id: "2widuo17g5CEC66IbzveRu",
        name: "Hotel California",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2734637341b9f507521afa9a778" }]
      },
      duration_ms: 391376
    },
    {
      id: "3sdIEyMCnTXKnAIqECdTXT",
      name: "Sweet Child O' Mine",
      artists: [{ id: "3qm84nBOXUEQ2vnTfUTTFC", name: "Guns N' Roses" }],
      album: {
        id: "3I9Z1nDCL4E0cP62flcbI5",
        name: "Appetite For Destruction",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273d21d8e6f515f1fc5d720660c" }]
      },
      duration_ms: 356426
    },
    {
      id: "6b2oQwSGFkzsMtQruIWm2p",
      name: "Purple Haze",
      artists: [{ id: "776Uo845nYHJpNaStv1Ds4", name: "Jimi Hendrix" }],
      album: {
        id: "7rSZXXHHvIhF4yUFdaOCy9",
        name: "Are You Experienced",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273c63aded6f4bf6a9dfcd6df1e" }]
      },
      duration_ms: 170333
    },
    {
      id: "7iAqvWLgZzXvH38lA06QZg",
      name: "Like a Rolling Stone",
      artists: [{ id: "74ASZWbe4lXaubB36ztrGX", name: "Bob Dylan" }],
      album: {
        id: "1D2YR7ZnAoMtwdyNrilOuA",
        name: "Highway 61 Revisited",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0" }]
      },
      duration_ms: 369093
    },
    {
      id: "0WsLIzLET8D0q3LkK9ZNrj",
      name: "Superstition",
      artists: [{ id: "7guDJrEfX3qb6FEbdPA5qi", name: "Stevie Wonder" }],
      album: {
        id: "6YUCc2RiXcEKS9ibuZxjt0",
        name: "Talking Book",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273ab876e787a1f1ecd9a747737" }]
      },
      duration_ms: 268866
    },
    {
      id: "3ctoHJ6bL4vhgkVqBUFOPJ",
      name: "Stairway to Heaven",
      artists: [{ id: "36QJpDe2go2KgaRleHCDTp", name: "Led Zeppelin" }],
      album: {
        id: "5EyIDBAqhnlkAHqvPRwdbX",
        name: "Led Zeppelin IV",
        images: [{ url: "https://i.scdn.co/image/ab67616d0000b273d400d27cba05bb0545533864" }]
      },
      duration_ms: 482830
    }
  ];

  console.log("Returning mock popular tracks data");
  return NextResponse.json({
    tracks: mockTracks
  });
} 