'use client';

import Link from 'next/link';
import Image from 'next/image';
// Remove StarDisplay import for now
// import StarDisplay from '@/app/components/StarRating'; 
import { RatingItem, SpotifyItem } from '@/lib/enrichUtils';

// Helper function to render static stars (can be extracted later)
function StaticStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'base' }) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  const starSizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center text-yellow-400">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={`full-${i}`} className={starSizeClass} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {halfStar === 1 && (
        <svg key="half" className={starSizeClass} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292zM10 12.585V4.915a1 1 0 01.951-.69l.047-.144c.13-.4.597-.624 1.006-.414l.047.023L15.78 6.97a1 1 0 01.588 1.81l-1.247.905a1 1 0 01-.364 1.118l.477 1.465c.13.4-.17.814-.608.814l-.145-.001-1.248-.906a1 1 0 01-1.175 0l-1.248.906c-.438.316-.938.092-1.068-.314l.001-.145.477-1.465a1 1 0 01-.364-1.118L8.14 8.78a1 1 0 01.588-1.81l1.707-.001a1 1 0 01.951.69l.047.144v7.67z" />
        </svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg key={`empty-${i}`} className={`${starSizeClass} text-neutral-600`} fill="currentColor" viewBox="0 0 20 20">
           <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
       <span className={`ml-1.5 text-xs ${size === 'sm' ? 'text-neutral-400' : 'text-neutral-300'}`}>{rating.toFixed(1)}</span>
    </div>
  );
}

// Track Card Component for Ratings Pages
export default function RatedTrackCard({ item }: { item: RatingItem & Partial<SpotifyItem> }) {
  const name = item.name || 'Unknown Track';
  const artists = item.artists || [{ name: 'Unknown Artist' }];
  const imageUrl = item.album?.images?.[0]?.url || '/img/placeholder-track.png'; // Updated placeholder path
  const artistNames = artists.map(a => a.name).join(', ');
  const rating = typeof item.rating === 'number' ? item.rating : 0;
  const spotifyUrl = item.external_urls?.spotify;

  return (
    <div className="bg-neutral-800/60 rounded-lg overflow-hidden flex flex-col h-full group transition-all duration-300 hover:bg-neutral-700/80 hover:shadow-lg">
      <Link href={spotifyUrl || `/track/${item.id || item.item_id}`} target={spotifyUrl ? "_blank" : undefined} rel={spotifyUrl ? "noopener noreferrer" : undefined} className="block relative">
        <div className="aspect-square relative">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.currentTarget.src = '/img/placeholder-track.png'; }} // Simple fallback
            loading="lazy"
          />
           <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
             {spotifyUrl && (
                 <span className="p-2 bg-black/50 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                 </span>
             )}
           </div>
        </div>
      </Link>
      <div className="p-3 flex-grow flex flex-col justify-between">
        <div>
           <Link href={spotifyUrl || `/track/${item.id || item.item_id}`} target={spotifyUrl ? "_blank" : undefined} rel={spotifyUrl ? "noopener noreferrer" : undefined}>
             <h3 className="font-semibold text-white truncate hover:underline text-sm mb-0.5" title={name}>{name}</h3>
           </Link>
           <p className="text-xs text-neutral-400 truncate" title={artistNames}>{artistNames}</p>
        </div>
        <div className="mt-2 flex items-center justify-between">
            {/* Use StaticStars helper */}
           <StaticStars rating={rating} size="sm" />
           <span className="text-xs text-neutral-500">
             {new Date(item.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
           </span>
        </div>
      </div>
       {item.review && (
         <div className="px-3 pb-3 pt-2 border-t border-neutral-700/50">
            <p className="text-xs text-neutral-300 line-clamp-2 italic opacity-80">
            "{item.review}"
            </p>
         </div>
      )}
    </div>
  );
} 