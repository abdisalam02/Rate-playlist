import { NextResponse } from 'next/server';

export async function GET() {
  // This is a reliable mock data source that never changes
  // Useful as a fallback for when the real API calls fail
  const mockAlbums = [
    {
      id: "1pzvBxYgT6OVwJLtHkrdQK",
      name: "Thriller",
      artists: [{ id: "3fMbdgg4jU18AjLCvBBDxt", name: "Michael Jackson" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b273d9620eb6c05530bda7650af8" }],
      album_type: "album",
      total_tracks: 9,
      release_date: "1982-11-30"
    },
    {
      id: "2fenSS68JI1h4Fo296JfGr",
      name: "21",
      artists: [{ id: "4dpARuHxo51G3z768sgnrY", name: "Adele" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2734a3fd0e10a29c611c6b0d8f1" }],
      album_type: "album",
      total_tracks: 11,
      release_date: "2011-01-24"
    },
    {
      id: "0ETFjACtuP2ADo6sQyb2BSm",
      name: "The Dark Side of the Moon",
      artists: [{ id: "0k17h0D3J5VfsdmQ1iZtE9", name: "Pink Floyd" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe" }],
      album_type: "album",
      total_tracks: 10,
      release_date: "1973-03-01"
    },
    {
      id: "1C2h7mLntPSeVYciMRTF4a",
      name: "Abbey Road",
      artists: [{ id: "3WrFJ7ztbogyGnTHbHJFl2", name: "The Beatles" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b273dc30583ba717007b00cceb25" }],
      album_type: "album",
      total_tracks: 17,
      release_date: "1969-09-26"
    },
    {
      id: "5ht7ItJgpBH7W6vJ5BqpPF",
      name: "Nevermind",
      artists: [{ id: "6olE6TJLqED3rqDCT0FyPh", name: "Nirvana" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b273e175a19e530c898d167d39bf" }],
      album_type: "album",
      total_tracks: 12,
      release_date: "1991-09-24"
    },
    {
      id: "7tB40pGzj6Tg0HePj2jWZt",
      name: "Rumours",
      artists: [{ id: "08GQAI4eElDnROBrJRGE0X", name: "Fleetwood Mac" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2736c399f9e6f744d49549a09ce" }],
      album_type: "album",
      total_tracks: 11,
      release_date: "1977-02-04"
    },
    {
      id: "32fmH5wJLVn9bKQXYBkfQY",
      name: "Back in Black",
      artists: [{ id: "711MCceyCBcFnzjGY4Q7Un", name: "AC/DC" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2738399047ff71200928f5b6508" }],
      album_type: "album",
      total_tracks: 10,
      release_date: "1980-07-25"
    },
    {
      id: "4LH4d3cOWNNsVw41Gqt2kv",
      name: "The Miseducation of Lauryn Hill",
      artists: [{ id: "2Mu5NfyYm8n5iTomuKAEXO", name: "Ms. Lauryn Hill" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b273e08b1250db5f75643f1508c9" }],
      album_type: "album",
      total_tracks: 14,
      release_date: "1998-08-25"
    },
    {
      id: "1bt6q2SruMsBtcerNVtpZB",
      name: "Rumours",
      artists: [{ id: "08GQAI4eElDnROBrJRGE0X", name: "Fleetwood Mac" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2738548084aca1c3e2e0bf57dc4" }],
      album_type: "album",
      total_tracks: 11,
      release_date: "1977-02-04"
    },
    {
      id: "6dVIqQ8qmQ5GBnJ9shOYGE",
      name: "OK Computer",
      artists: [{ id: "4Z8W4fKeB5YxbusRsdQVPb", name: "Radiohead" }],
      images: [{ url: "https://i.scdn.co/image/ab67616d0000b2736c7112082b63beefffe40151" }],
      album_type: "album",
      total_tracks: 12,
      release_date: "1997-05-28"
    }
  ];

  console.log("Returning mock popular albums data");
  return NextResponse.json({
    albums: {
      items: mockAlbums,
      limit: mockAlbums.length,
      total: mockAlbums.length,
      href: "spotify:mock-popular-albums"
    }
  });
} 