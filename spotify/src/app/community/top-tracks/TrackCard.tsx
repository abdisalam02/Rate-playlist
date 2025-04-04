'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Track } from '@/types.d';
import { useAudio } from '@/app/providers'; 

// Define Icons (can be shared or local)
const PlayIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const PauseIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
);
const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

// Component Definition
export default function TrackCardClient({ track }: { track: Track & { average_rating?: number; rating_count?: number } }) {
  const { playTrack, isPlaying, playingTrack } = useAudio(); 
  const isCurrentTrack = playingTrack?.id === track.id.toString();
  const imageUrl = track.album?.images?.[0]?.url || '/placeholder.png';

  const handlePlayToggle = () => {
     if (track.preview_url) {
        playTrack(track); 
    } else {
        alert('Preview not available for this track.');
    }
  };

  return (
     <div className="bg-[#181818] hover:bg-[#282828] transition rounded-lg overflow-hidden h-full flex flex-col group">
       <Link href={`/track/${track.id}`} className="block p-3 flex flex-col h-full">
        <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-md">
          <Image 
            src={imageUrl}
            alt={track.name || 'Track artwork'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePlayToggle(); }}
            className={`absolute bottom-2 right-2 bg-[#1DB954] text-black rounded-full p-2 shadow-xl transform transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 ${isCurrentTrack && isPlaying ? 'opacity-100 translate-y-0' : ''}`}
            aria-label={isCurrentTrack && isPlaying ? "Pause" : "Play"}
            disabled={!track.preview_url} 
          >
            {isCurrentTrack && isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </button>
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-white truncate" title={track.name}>{track.name}</h3>
            <p className="text-neutral-400 text-xs truncate" title={track.artists?.map(a => a.name).join(', ')}>
              {track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
            </p>
        </div>
      </Link>
       {(track.average_rating !== undefined && track.rating_count !== undefined) && (
         <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 z-10">
           <StarIcon className="w-3 h-3 text-yellow-400" /> 
           <span>{track.average_rating.toFixed(1)}</span>
           <span className="text-neutral-400">({track.rating_count})</span>
         </div>
       )}
     </div>
  );
} 