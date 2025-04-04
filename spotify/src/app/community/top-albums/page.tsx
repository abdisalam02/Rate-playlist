import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import { Album } from '@/types.d'; // Assuming Album type exists in types.d
import TokenRefresher from '@/app/components/TokenRefresher';

async function getTopAlbums(limit = 50) {
  const baseUrl = process.env.NEXTAUTH_URL || '';
  if (!baseUrl) {
    console.error("[TopAlbumsPage] Error: NEXTAUTH_URL not set.");
    return [];
  }
  const apiUrl = `${baseUrl}/api/community/top-rated?type=album&limit=${limit}`;
  console.log(`[TopAlbumsPage] Fetching from: ${apiUrl}`);
  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch top albums: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`[TopAlbumsPage] Received ${data?.items?.length || 0} albums.`);
    return data.items || [];
  } catch (error) {
    console.error('[TopAlbumsPage] Fetch error:', error);
    return [];
  }
}

function AlbumCard({ album }: { album: Album & { average_rating?: number; rating_count?: number } }) {
  const imageUrl = album.images?.[0]?.url || '/placeholder.png';
  const releaseYear = album.release_date ? new Date(album.release_date).getFullYear() : null;
  
  return (
    <div className="bg-[#181818] hover:bg-[#282828] transition rounded-lg overflow-hidden h-full flex flex-col relative group">
      <Link href={`/album/${album.id}`} className="block p-3 flex flex-col h-full">
        <div className="aspect-square mb-3 overflow-hidden rounded-md relative">
          <Image 
            src={imageUrl}
            alt={album.name || 'Album cover'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-white truncate mb-1" title={album.name}>{album.name}</h3>
          <p className="text-neutral-400 text-xs truncate" title={album.artists?.map(a => a.name).join(', ')}>
            {releaseYear ? `${releaseYear} • ` : ''}{album.artists?.map(a => a.name).join(', ') || 'Various Artists'}
          </p>
        </div>
      </Link>
      {/* Display Rating */}
      {(album.average_rating !== undefined && album.rating_count !== undefined) && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
          <StarIcon className="w-3 h-3 text-yellow-400" />
          <span>{album.average_rating.toFixed(1)}</span>
          <span className="text-neutral-400">({album.rating_count})</span>
        </div>
      )}
    </div>
  );
}

// Dummy StarIcon for placeholder
const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

export default async function TopCommunityAlbumsPage() {
  const topAlbums = await getTopAlbums();
  
  return (
    <div className="bg-gradient-to-b from-[#1f1f1f] to-[#121212] min-h-screen text-white">
      <TokenRefresher /> 
      <Navbar />
      <main className="pt-20 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/community" className="flex items-center bg-black bg-opacity-40 hover:bg-opacity-60 transition rounded-full p-2 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold">Top Rated Albums</h1>
        </div>
        <p className="text-neutral-400 mb-8">Albums most highly rated by the community.</p>
        
        {topAlbums.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {topAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-neutral-400">No top rated albums found or failed to load.</p>
          </div>
        )}
      </main>
    </div>
  );
} 