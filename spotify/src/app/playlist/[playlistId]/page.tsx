'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { AddToPlaylistModal } from '@/app/components/modals/PlaylistModal';
import Image from 'next/image';

// Types
interface Track {
  id: string;
  name: string;
  preview_url: string | null;
  artists: { id: string; name: string }[];
  album?: { 
    id: string;
    name: string;
    images: { url: string }[];
  };
  duration_ms?: number;
}

interface Artist {
  id: string;
  name: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  owner: {
    display_name: string;
    id?: string;
  };
  images: { url: string }[];
  tracks: {
    total: number;
    items: {
      track: Track | null;
      added_at?: string;
    }[];
  };
  followers?: {
    total: number;
  };
}

// Format track duration
function formatDuration(ms: number | undefined): string {
  if (typeof ms !== 'number' || ms <= 0) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// --- Skeleton Component --- 
function PlaylistPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Skeleton Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 pt-8">
        <div className="w-48 h-48 lg:w-56 lg:h-56 flex-shrink-0 bg-neutral-800 rounded-lg shadow-xl"></div>
        <div className="flex flex-col items-center md:items-start text-center md:text-left pt-4 flex-1">
          <div className="h-4 bg-neutral-700 rounded w-24 mb-3"></div>
          <div className="h-10 bg-neutral-700 rounded w-3/4 mb-4"></div>
          <div className="h-5 bg-neutral-700 rounded w-full mb-2"></div>
          <div className="h-5 bg-neutral-700 rounded w-2/3 mb-6"></div>
          <div className="flex items-center gap-4">
            <div className="h-4 bg-neutral-700 rounded w-32"></div>
            <div className="h-4 bg-neutral-700 rounded w-20"></div>
            <div className="h-4 bg-neutral-700 rounded w-24"></div>
          </div>
        </div>
      </div>

      {/* Skeleton Track List Header */}
      <div className="grid grid-cols-[auto,auto,1fr,1fr,auto] items-center gap-4 px-4 py-2 text-xs text-neutral-400 border-b border-neutral-800 mb-2">
        <div className="w-5 h-4 bg-neutral-700 rounded"></div>
        <div className="w-6 h-4 bg-neutral-700 rounded"></div>
        <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
        <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
        <div className="h-4 w-10 bg-neutral-700 rounded justify-self-end"></div>
      </div>

      {/* Skeleton Track Rows */}
      <div className="space-y-1">
        {[...Array(10)].map((_, index) => (
          <div key={index} className="grid grid-cols-[auto,auto,1fr,1fr,auto] items-center gap-4 px-4 py-2 rounded">
            <div className="w-5 h-4 bg-neutral-700 rounded"></div>
            <div className="w-6 h-4 bg-neutral-700 rounded"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-700 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
                <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
            <div className="h-3 w-10 bg-neutral-700 rounded justify-self-end"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Error Display --- 
function ErrorDisplay({ message }: { message: string }) {
    return (
      <div className="bg-[#181818] p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Playlist</h2>
        <p className="text-gray-300">{message}</p>
        <Link href="/discover" className="mt-4 inline-block px-4 py-2 bg-[#1DB954] text-black font-medium rounded-full">
          Back to Discover
        </Link>
      </div>
    );
}

// --- Selectable Track Row Component --- 
interface SelectablePlaylistTrackRowProps {
  track: Track;
  index: number;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (trackId: string) => void;
}

function SelectablePlaylistTrackRow({ track, index, isSelecting, isSelected, onToggleSelect }: SelectablePlaylistTrackRowProps) {
  const trackId = track.id;
  
  const handleRowClick = () => {
      if (isSelecting) {
          onToggleSelect(trackId);
      }
  };

  const stopPropagation = (e: React.MouseEvent) => {
      // Stop propagation if we are NOT selecting, to allow row click ONLY when selecting
      // If we ARE selecting, let the row click handle it, but stop propagation for internal links.
      if (isSelecting) {
          e.stopPropagation();
      }
  };
  
  // Responsive grid classes
  const rowClasses = `grid grid-cols-[auto,auto,1fr,auto] md:grid-cols-[auto,auto,1fr,1fr,auto] items-center gap-x-4 gap-y-2 px-4 py-2 rounded group transition-colors ${isSelecting ? 'cursor-pointer' : ''} ${isSelected ? 'bg-neutral-700/50 hover:bg-neutral-700/70' : 'hover:bg-neutral-800/60'}`;

  // Decide whether to wrap the row in a Link based on selection mode
  const RowWrapper = isSelecting ? 'div' : Link;
  const wrapperProps = isSelecting ? { className: rowClasses, onClick: handleRowClick } : { href: `/track/${trackId}`, className: rowClasses };

  return (
      // @ts-ignore - Dynamic component type
      <RowWrapper {...wrapperProps}>
          {/* Checkbox */}
          <div className="w-5 flex items-center justify-center">
            {isSelecting && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    // Prevent checkbox itself from interfering with row click when selecting
                    onChange={(e) => e.stopPropagation()} 
                    onClick={(e) => e.stopPropagation()}
                    className="form-checkbox h-4 w-4 text-[#1DB954] bg-neutral-900 border-neutral-600 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-[#1DB954] cursor-pointer pointer-events-none"
                />
            )}
          </div>
          
          {/* Index */}
          <div className="text-neutral-400 text-sm w-6 text-right group-hover:text-white transition-colors">{index + 1}</div>
          
          {/* Title & Artist */} 
          <div className="flex items-center gap-3 overflow-hidden">
             {track.album?.images?.[0]?.url && (
                  <div className="relative w-10 h-10 shrink-0 bg-neutral-700 rounded overflow-hidden">
                    <Image 
                      src={track.album.images[0].url}
                      alt={track.album.name || track.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                      unoptimized // Spotify images don't need optimization
                    />
                  </div>
              )}
              <div className="min-w-0">
                 <span className={`truncate font-medium text-sm block ${isSelected ? 'text-[#1DB954]' : 'text-white'} ${!isSelecting ? 'group-hover:text-[#1DB954]' : ''}`}>
                    {track.name}
                 </span>
                  <div className="text-neutral-400 truncate text-xs">
                     {track.artists?.map((artist, idx) => (
                        <React.Fragment key={artist.id || idx}>
                            {/* Link only if not selecting */}
                            {!isSelecting ? (
                                <Link href={`/artist/${artist.id}`} onClick={stopPropagation} className="hover:underline hover:text-white transition-colors">
                                    {artist.name}
                                </Link>
                            ) : (
                                artist.name
                            )}
                           {idx < track.artists.length - 1 ? ', ' : ''}
                        </React.Fragment>
                     ))}
                  </div>
              </div>
          </div>
          
          {/* Album (Hidden on mobile by grid definition) */} 
          <div className="text-sm text-neutral-400 truncate hidden md:block">
             {/* Link only if not selecting */} 
             {!isSelecting && track.album?.id ? (
                 <Link href={`/album/${track.album.id}`} onClick={stopPropagation} className="hover:underline hover:text-white transition-colors">
                    {track.album.name}
                 </Link>
             ) : (
                  track.album?.name
             )}
          </div>

          {/* Duration */}
          <div className="text-neutral-400 text-xs justify-self-end group-hover:text-white transition-colors">
            {formatDuration(track.duration_ms)}
          </div>
      {/* @ts-ignore */} 
      </RowWrapper>
  );
}

// --- Main Component --- 
export default function PlaylistPage() {
  const { playlistId } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for selection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtered tracks (remove nulls)
  const validTracks = playlist?.tracks?.items?.map(item => item.track).filter((track): track is Track => track !== null && track !== undefined && !!track.id) || [];

  // Fetching Logic
  useEffect(() => {
    if (!playlistId) {
      setError('No playlist ID provided');
      setLoading(false);
      return;
    }

    const fetchPlaylist = async () => {
      setLoading(true);
      setError(null);
      setIsSelecting(false); // Reset selection
      setSelectedTrackIds(new Set());
      
      try {
        // Session check can remain similar
        console.log('Fetching playlist with ID:', playlistId);
        if (!session && status !== 'loading') {
            console.warn('No session found, fetching potentially limited public playlist data.');
            // Proceed without session for public playlists, API should handle permissions
        } else if (status === 'loading') {
             console.log('Session loading, waiting...');
             return; // Wait for session status to resolve
        }

        const response = await fetch(`/api/spotify/playlist/${playlistId}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
           if (response.status === 404) throw new Error('Playlist not found.');
          throw new Error(`Failed to fetch playlist: ${response.statusText || response.status}`);
        }
        const data = await response.json();
        console.log('Playlist data received:', data);
        setPlaylist(data);
        
      } catch (err) {
        console.error('Error fetching playlist:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
         setLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId, session, status]); // Rerun if session changes

  // --- Selection Handlers --- 
  const handleToggleSelect = useCallback((trackId: string) => {
    if (!isSelecting) return;
    setSelectedTrackIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, [isSelecting]);

  const handleSelectAll = () => {
     if (!isSelecting) return;
     if (selectedTrackIds.size === validTracks.length && validTracks.length > 0) {
         setSelectedTrackIds(new Set()); 
     } else {
         // Use the filtered validTracks array
         setSelectedTrackIds(new Set(validTracks.map(t => t.id))); 
     }
  };

  const handleEnterSelectionMode = () => {
      setIsSelecting(true);
  };

  const handleCancelSelection = () => {
      setIsSelecting(false);
      setSelectedTrackIds(new Set());
  };
  
  const handleOpenPlaylistModal = () => {
      if (selectedTrackIds.size === 0) {
          toast.error("Please select at least one track to add.");
      } else {
          setIsModalOpen(true);
      }
  };

  // Use the same submit handler as mood pages
  const handleAddToPlaylistSubmit = async (playlistId: string | null, newPlaylistName: string | null) => {
     if (selectedTrackIds.size === 0) {
         toast.error("No tracks selected.");
         return;
     }
     console.log("Adding tracks:", Array.from(selectedTrackIds), "to", playlistId || newPlaylistName);
     try {
         const res = await fetch('/api/favorites/export', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 trackIds: Array.from(selectedTrackIds),
                 targetPlaylistId: playlistId,
                 newPlaylistName: newPlaylistName,
             })
         });
         const result = await res.json();
         if (!res.ok) {
             throw new Error(result.error || result.details?.error?.message || `Failed to export (${res.status})`);
         }
         toast.success(result.message || 'Tracks added successfully!');
         setIsModalOpen(false); 
         setSelectedTrackIds(new Set()); 
         setIsSelecting(false);
     } catch (err) {
          console.error("Export API error:", err);
          toast.error(`Failed to add tracks: ${err instanceof Error ? err.message : 'Unknown error'}`);
          throw err; 
     }
  };

  // Render logic updated
  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 pb-16">
          {loading ? (
             <PlaylistPageSkeleton />
          ) : error ? (
             <ErrorDisplay message={error} />
          ) : !playlist ? (
             <ErrorDisplay message={"Playlist data could not be loaded."} />
          ) : (
            <>
              {/* Playlist Header - Refined */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 pt-8">
                  {/* Image */} 
                  <div className="w-48 h-48 lg:w-56 lg:h-56 flex-shrink-0 shadow-lg rounded-lg overflow-hidden bg-neutral-800">
                    <Image 
                      src={playlist.images?.[0]?.url || '/playlist-placeholder.png'} 
                      alt={playlist.name}
                      width={224}
                      height={224}
                      className="w-full h-full object-cover"
                      priority // Prioritize loading header image
                      unoptimized // Spotify images don't need optimization
                    />
                  </div>
                  {/* Details */} 
                  <div className="flex-grow flex flex-col items-center md:items-start text-center md:text-left pt-4">
                      <h2 className="text-sm font-bold uppercase text-neutral-400 mb-2 tracking-wider">Playlist</h2>
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-3 leading-tight break-words line-clamp-2" title={playlist.name}>{playlist.name}</h1>
                      {playlist.description && (
                        <p className="text-neutral-300 text-base mb-5 max-w-xl" dangerouslySetInnerHTML={{ __html: playlist.description }}></p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-300 mb-6">
                          {playlist.owner?.id ? (
                             <Link href={`/user/${playlist.owner.id}`} className="hover:text-white font-medium">{playlist.owner.display_name || 'Unknown'}</Link>
                          ) : (
                             <span className="font-medium text-white">{playlist.owner?.display_name || 'Unknown'}</span>
                          )}
                          <span className="text-neutral-500">•</span>
                          {playlist.followers && <span>{playlist.followers.total.toLocaleString()} {playlist.followers.total === 1 ? 'follower' : 'followers'}</span>}
                          {validTracks.length > 0 && <span className="text-neutral-500">•</span>}
                          {validTracks.length > 0 && <span>{validTracks.length} {validTracks.length === 1 ? 'song' : 'songs'}</span>}
                      </div>
                      
                      {/* --- Add to Playlist Button --- */} 
                      <div className="mt-5">
                         {validTracks.length > 0 && !isSelecting && (
                             <button 
                                 onClick={handleEnterSelectionMode}
                                 className="bg-neutral-700 text-white font-bold px-5 py-2 rounded-full inline-flex items-center gap-2 hover:bg-neutral-600 transition-colors text-sm"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                     <path d="M11 3a1 1 0 10-2 0v1H7a1 1 0 000 2h2v1a1 1 0 102 0V6h2a1 1 0 100-2h-2V3z" />
                                     <path fillRule="evenodd" d="M4.5 5.5A.5.5 0 015 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zM7.5 5.5A.5.5 0 018 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0V14.5a.5.5 0 001 0V6z" clipRule="evenodd" />
                                     <path fillRule="evenodd" d="M1 14a1 1 0 011-1h16a1 1 0 110 2H2a1 1 0 01-1-1z" clipRule="evenodd" />
                                 </svg>
                                 Add Tracks to Playlist
                             </button>
                         )}
                      </div>
                  </div>
              </div>
            
              {/* --- Action Bar --- */} 
              {isSelecting && validTracks.length > 0 && (
                 <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg sticky top-[72px] z-20 shadow-md border border-neutral-800">
                     <div className="flex items-center gap-3">
                         <input
                         type="checkbox"
                         checked={selectedTrackIds.size > 0 && selectedTrackIds.size === validTracks.length}
                         onChange={handleSelectAll}
                         title={selectedTrackIds.size === validTracks.length ? "Deselect All" : "Select All"}
                         className="form-checkbox h-5 w-5 text-[#1DB954] bg-neutral-700 border-neutral-600 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-[#1DB954] cursor-pointer"
                         />
                         <span className="text-sm text-neutral-300 tabular-nums">
                             {selectedTrackIds.size} / {validTracks.length} selected
                         </span>
                     </div>
                     <div className="flex items-center gap-3">
                         <button
                             onClick={handleCancelSelection}
                             className="text-neutral-300 hover:text-white transition-colors text-sm px-4 py-2 rounded-full hover:bg-neutral-700"
                         >
                             Cancel
                         </button>
                         <button
                             onClick={handleOpenPlaylistModal}
                             disabled={selectedTrackIds.size === 0}
                             className="bg-[#1DB954] text-black font-bold py-2 px-5 rounded-full text-sm hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow"
                         >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 10-2 0v1H7a1 1 0 000 2h2v1a1 1 0 102 0V6h2a1 1 0 100-2h-2V3z" /><path fillRule="evenodd" d="M4.5 5.5A.5.5 0 015 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zM7.5 5.5A.5.5 0 018 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0V14.5a.5.5 0 001 0V6z" clipRule="evenodd" /><path fillRule="evenodd" d="M1 14a1 1 0 011-1h16a1 1 0 110 2H2a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                             Choose Playlist...
                         </button>
                     </div>
                 </div>
              )}
            
              {/* Track List - Refined */} 
              {validTracks.length > 0 ? (
                  <div className="bg-[#181818]/50 rounded-lg p-4 md:px-6 md:py-4">
                      {/* Header - Updated grid classes */} 
                      <div className="grid grid-cols-[auto,auto,1fr,auto] md:grid-cols-[auto,auto,1fr,1fr,auto] items-center gap-x-4 gap-y-2 px-4 py-2 text-xs text-neutral-400 border-b border-neutral-800 mb-2 font-medium">
                         <div className="w-5">{/* Checkbox Spacer */}</div>
                         <div className="w-6 text-right">#</div>
                         <div>Title</div>
                         <div className="hidden md:block">Album</div>
                         <div className="justify-self-end">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                         </div>
                      </div>
                      {/* Rows */} 
                      <div className="space-y-1">
                          {validTracks.map((track, index) => (
                             <SelectablePlaylistTrackRow
                                 key={track.id}
                                 track={track}
                                 index={index}
                                 isSelecting={isSelecting}
                                 isSelected={selectedTrackIds.has(track.id)}
                                 onToggleSelect={handleToggleSelect}
                              />
                          ))}
                      </div>
                  </div>
              ) : (
                 <div className="text-center py-10 text-neutral-400">
                     This playlist is empty.
                 </div>
              )}
              
            </>
          )}
      </main>
       {/* --- Modal --- */} 
        <AddToPlaylistModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAddToPlaylist={handleAddToPlaylistSubmit} 
            itemCount={selectedTrackIds.size}
            itemNoun="track"
        />
    </div>
  );
} 