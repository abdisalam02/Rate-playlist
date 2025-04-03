import React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
// import AlbumList from '@/components/AlbumList';
import Navbar from '@/app/components/Navbar';
import TokenRefresher from '@/app/components/TokenRefresher';

export const metadata: Metadata = {
  title: 'Popular Albums | Deezer Charts',
  description: 'Explore the most popular albums currently trending on Deezer.',
};

// Define types for the album and artist objects
interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
  images?: Array<{ url: string }>;
  artists?: Artist[];
  release_date?: string;
  source?: string;
}

// Simple album component to replace the missing AlbumList
function AlbumCard({ album, className = '' }: { album: Album; className?: string }) {
  const imageUrl = album.images?.[0]?.url || 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album';
  const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : null;

  return (
    <div className={`bg-[#181818] hover:bg-[#282828] transition rounded-lg overflow-hidden h-full flex flex-col ${className}`}>
      <Link href={`/album/${album.id}`} className="block p-3 flex flex-col h-full">
        <div className="aspect-square mb-3 overflow-hidden rounded-md relative">
          <Image 
            src={imageUrl}
            alt={album.name || 'Album cover'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/300x300/1DB954/FFFFFF?text=Album';
            }}
          />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-white truncate" title={album.name}>{album.name}</h3>
          <p className="text-neutral-400 text-xs truncate" title={album.artists?.map(a => a.name).join(', ')}>
            {releaseYear ? `${releaseYear} • ` : ''}{album.artists?.map(a => a.name).join(', ') || 'Various Artists'}
          </p>
          {album.source && (
            <p className="text-xs text-green-500 mt-2">From: {album.source}</p>
          )}
        </div>
      </Link>
    </div>
  );
}

// Simple loading spinner to replace the missing LoadingSpinner
function SimpleLoadingSpinner() {
  return (
    <div className="w-full h-64 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
    </div>
  );
}

interface AlbumsResponse {
  albums: {
    items: Album[];
  };
  total: number;
}

// Function to fetch albums
async function getDeezerTopAlbums(): Promise<AlbumsResponse> {
  const baseUrl = process.env.NEXTAUTH_URL || ''; 
  if (!baseUrl) {
    console.error("[PopularAlbumsPage] Error: NEXTAUTH_URL environment variable is not set.");
    return { albums: { items: [] }, total: 0 }; 
  }

  const limit = 50; 
  const apiUrl = `${baseUrl}/api/deezer/chart/albums?limit=${limit}`; 
  console.log(`[PopularAlbumsPage] Fetching from: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      cache: 'no-store', 
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[PopularAlbumsPage] Failed API fetch: ${response.status}`, errorBody);
      // Throw specific error based on status
      throw new Error(`Failed to fetch popular albums: ${response.statusText}`);
    }

    // Log the raw response text before parsing
    const rawData = await response.text();
    console.log("[PopularAlbumsPage] Raw API Response Text:", rawData);

    // Parse the JSON
    const data = JSON.parse(rawData); 
    console.log("[PopularAlbumsPage] Parsed API Response Data:", JSON.stringify(data, null, 2)); // Log the parsed data structure

    // Check the expected structure
    if (data && data.albums && Array.isArray(data.albums.items)) {
      console.log(`[PopularAlbumsPage] Successfully fetched and validated ${data.albums.items.length} albums.`);
      return data as AlbumsResponse;
    } else {
      // Log specific reason for failure
      console.error("[PopularAlbumsPage] Invalid data format received from API:", data);
      throw new Error("Invalid data format received for popular albums.");
    }
    
  } catch (error) {
    // Log fetch/parse errors
    console.error('[PopularAlbumsPage] Error during fetch or processing:', error); 
    return { albums: { items: [] }, total: 0 }; 
  }
}

export default async function PopularAlbumsPage() {
  const albumsData = await getDeezerTopAlbums();
  const albums = albumsData.albums?.items || [];

  return (
    <div className="bg-gradient-to-b from-[#1f1f1f] to-[#121212] min-h-screen text-white">
      <TokenRefresher />
      <Navbar />

      <main className="pt-20 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Link 
            href="/discover" 
            className="flex items-center bg-black bg-opacity-40 hover:bg-opacity-60 transition rounded-full p-2 mr-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold">Popular Albums</h1>
        </div>
        
        <div className="mb-8">
          <p className="text-neutral-400 mb-4">
            Discover the hottest albums topping the Deezer charts right now.
          </p>
        </div>

        <Suspense fallback={<SimpleLoadingSpinner />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {albums.map((album) => (
              <AlbumCard 
                key={album.id} 
                album={album}
                className="hover:bg-neutral-800 transition"
              />
            ))}
          </div>
          
          {(!albums || albums.length === 0) && (
            <div className="flex justify-center items-center h-64">
              <p className="text-neutral-400">No popular albums found or failed to load.</p>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
} 