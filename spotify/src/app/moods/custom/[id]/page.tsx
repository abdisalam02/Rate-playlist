'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import UserAvatar from '@/app/components/UserAvatar';
import { AddToPlaylistModal } from '@/app/components/modals/PlaylistModal';
import { toast } from 'react-hot-toast';

// --- Type Definitions ---
interface Track {
  id: string; // Spotify Track ID
  spotify_track_id?: string;
  mood_track_db_id?: string;
  name: string;
  artists: { name: string }[];
  album?: { images: { url: string }[]; name: string; };
  duration_ms?: number;
  preview_url?: string | null;
  added_at?: string;
}

interface CustomMoodDetails {
  id: string;
  mood_name: string;
  description: string | null;
  created_at?: string;
  user_id?: string;
  username?: string; 
  profile_image?: string | null; 
}

// --- Reusable Components ---
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto bg-[#181818] p-6 rounded-lg text-center my-10">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="text-lg font-semibold mb-2">Error Loading Mood</h2>
      <p className="text-[#B3B3B3] mb-4">{message}</p>
    </div>
  );
}

// --- Skeleton Component --- 
function CustomMoodPageSkeleton() {
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
            <div className="h-4 bg-neutral-700 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Skeleton Track List Header */}
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-4 px-4 py-2 text-xs text-neutral-400 border-b border-neutral-800 mb-2">
        <div className="w-6 h-4 bg-neutral-700 rounded"></div>
        <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
        <div className="h-4 w-4 bg-neutral-700 rounded justify-self-end"></div>
      </div>

      {/* Skeleton Track Rows */}
      <div className="space-y-1">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="grid grid-cols-[auto,1fr,auto] items-center gap-4 px-4 py-2 rounded">
            <div className="w-6 h-4 bg-neutral-700 rounded"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-700 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
                <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-3 w-10 bg-neutral-700 rounded justify-self-end"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Selectable Track Row Component --- 
interface SelectableTrackRowProps {
  track: Track;
  index: number;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (trackId: string) => void;
}

function SelectableTrackRow({ track, index, isSelecting, isSelected, onToggleSelect }: SelectableTrackRowProps) {
  const trackId = track.id; // Use the Spotify ID
  
  function formatDuration(ms: number): string {
    if (!ms || ms < 0) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  const handleRowClick = () => {
      if (isSelecting) {
          onToggleSelect(trackId);
      }
  };

  const stopPropagation = (e: React.MouseEvent) => {
      e.stopPropagation();
  };
  
  // Define common classes
  const rowClasses = `grid grid-cols-[auto,auto,1fr,auto] items-center gap-4 px-4 py-2 rounded group transition-colors ${isSelecting ? 'cursor-pointer' : ''} ${isSelected ? 'bg-neutral-700/50 hover:bg-neutral-700/70' : 'hover:bg-neutral-800/60'}`;

  return (
      <div className={rowClasses} onClick={handleRowClick}>
          {/* Checkbox (only shown when selecting) */}
          <div className="w-5">
            {isSelecting && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={stopPropagation} // Prevent default change handling, row click manages state
                    onClick={stopPropagation} // Prevent click from bubbling to row
                    className="form-checkbox h-4 w-4 text-[#1DB954] bg-neutral-900 border-neutral-600 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-[#1DB954] cursor-pointer pointer-events-none" // Added pointer-events-none
                />
            )}
          </div>
          
          {/* Index */}
          <div className="text-neutral-400 text-sm w-6 text-right group-hover:text-white transition-colors">{index + 1}</div>
          
          {/* Title & Artist (wrapped in Link only if not selecting) */} 
          <div className="flex items-center gap-3 overflow-hidden">
             {track.album?.images?.[0]?.url && (
                  <div className="relative w-10 h-10 shrink-0 bg-neutral-700 rounded overflow-hidden">
                    <Image 
                      src={track.album.images[0].url}
                      alt={track.album.name || track.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
              )}
              <div className="min-w-0">
                {isSelecting ? (
                    // Plain text if selecting
                    <span className="text-white truncate font-medium text-sm block">{track.name}</span>
                ) : (
                    // Link if not selecting
                    <Link 
                       href={`/track/${trackId}`}
                       onClick={stopPropagation} 
                       className="text-white truncate font-medium text-sm hover:text-[#1DB954] transition-colors block group-hover:text-[#1DB954]"
                     >
                         {track.name}
                     </Link>
                )}
                  <div className="text-neutral-400 truncate text-xs">
                      {/* Make artist names links if possible in future */} 
                      {track.artists?.map(a => a.name).join(', ')}
                  </div>
              </div>
          </div>
          
          {/* Duration */}
          <div className="text-neutral-400 text-xs justify-self-end group-hover:text-white transition-colors">
            {formatDuration(track.duration_ms || 0)}
          </div>
      </div>
  );
}

// --- Main Page Component ---

export default function CustomMoodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moodId = params?.id as string; 

  const [moodDetails, setMoodDetails] = useState<CustomMoodDetails | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for selection mode and modal 
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!moodId) {
      setError("Mood ID is missing from URL.");
      setLoading(false);
      return;
    }

    const fetchMoodData = async () => {
      setLoading(true);
      setError(null);
      setIsSelecting(false); // Reset selection on load
      setSelectedTrackIds(new Set());
      
      let fetchedMood: CustomMoodDetails | null = null;

      try {
        // Fetch Mood Details
        const moodRes = await fetch(`/api/moods/custom/${moodId}`); 
        if (!moodRes.ok) {
           if (moodRes.status === 404) throw new Error(`Mood not found.`);
           const moodErrorText = await moodRes.text();
           throw new Error(`Failed to fetch mood details (${moodRes.status}): ${moodErrorText}`);
        }
        const moodData = await moodRes.json();
        if (moodData.success && moodData.data) {
            fetchedMood = moodData.data;
            setMoodDetails(fetchedMood);
        } else {
             console.warn("Unexpected mood details format:", moodData);
             throw new Error("Invalid data format for mood details.");
        }

        // Fetch Mood Tracks
        const tracksRes = await fetch(`/api/moods/custom/${moodId}/tracks`);
        if (!tracksRes.ok) {
            console.error(`Failed to fetch tracks for mood ${moodId} (${tracksRes.status}).`);
            setTracks([]); 
        } else {
            const tracksData = await tracksRes.json();
            if (tracksData.success && Array.isArray(tracksData.data)) {
               // Ensure tracks have a valid 'id' (Spotify ID) for selection key
               const validTracks = tracksData.data.filter((t: Track) => t.id);
               setTracks(validTracks);
               if (validTracks.length !== tracksData.data.length) {
                   console.warn("Some fetched tracks were missing a Spotify ID.");
               }
            } else {
               console.warn("Unexpected tracks format:", tracksData);
               setTracks([]);
            }
        }

      } catch (err: any) {
        console.error('Error fetching custom mood data:', err);
        setError(err.message || 'Could not load mood details.');
        if (!fetchedMood) setMoodDetails(null); 
        setTracks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMoodData();
  }, [moodId]);

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
     if (selectedTrackIds.size === tracks.length && tracks.length > 0) {
         setSelectedTrackIds(new Set()); 
     } else {
         setSelectedTrackIds(new Set(tracks.map(t => t.id))); 
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

  const handleAddToPlaylistSubmit = async (playlistId: string | null, newPlaylistName: string | null) => {
     if (selectedTrackIds.size === 0) {
         toast.error("No tracks selected.");
         return;
     }
     console.log("Adding tracks:", Array.from(selectedTrackIds), "to", playlistId || newPlaylistName);
     try {
         // Use the same export endpoint
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

  // --- Render Logic --- 
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />

      <main className="container mx-auto px-4 pt-20 pb-16">
        {loading ? (
          <CustomMoodPageSkeleton />
        ) : error ? (
           <div className="text-center py-10">
               <ErrorDisplay message={error} />
               <button 
                    onClick={() => router.back()} 
                    className="mt-6 bg-[#1DB954] text-black font-semibold py-2 px-5 rounded-full hover:bg-[#1ED760] transition text-sm"
               >
                 Go Back
               </button>
           </div>
        ) : !moodDetails ? (
             <div className="text-center py-10">
                 <ErrorDisplay message={"Mood details could not be loaded."} />
                 <button 
                    onClick={() => router.back()} 
                    className="mt-6 bg-[#1DB954] text-black font-semibold py-2 px-5 rounded-full hover:bg-[#1ED760] transition text-sm"
               >
                 Go Back
               </button>
             </div>
        ) : (
          <> 
             {/* Header Section */}
             <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 pt-8">
                 {/* Image Container */}
                 <div className="w-48 h-48 lg:w-56 lg:h-56 flex-shrink-0 bg-neutral-800 rounded-lg shadow-xl flex items-center justify-center overflow-hidden">
                     {(tracks[0]?.album?.images?.[0]?.url) ? (
                        <Image 
                            src={tracks[0].album.images[0].url}
                            alt={moodDetails.mood_name}
                            width={224}
                            height={224}
                            className="object-cover w-full h-full"
                         />
                     ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                     )}
                 </div>
                 {/* Text Details Container */}
                 <div className="flex flex-col items-center md:items-start text-center md:text-left pt-4 flex-1">
                     <h2 className="text-sm font-bold uppercase text-neutral-400 mb-2 tracking-wider">Custom Mood</h2>
                     <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-3 leading-tight break-words line-clamp-2">{moodDetails.mood_name}</h1>
                     {moodDetails.description && (
                         <p className="text-neutral-300 text-base mb-5 max-w-xl">{moodDetails.description}</p>
                     )}
                     {/* Creator Info */} 
                     {moodDetails.user_id && moodDetails.username && (
                         <Link href={`/user/${moodDetails.user_id}`} className="flex items-center gap-2 text-sm text-neutral-300 hover:text-white group/userlink">
                            <UserAvatar 
                                imageUrl={moodDetails.profile_image}
                                username={moodDetails.username}
                                sizeClasses="w-6 h-6"
                            />
                             <span>Created by <span className="font-medium group-hover/userlink:text-[#1DB954]">{moodDetails.username}</span></span>
                         </Link>
                     )}
                     {/* --- Selection Button --- */} 
                     <div className="mt-5">
                        {tracks.length > 0 && !isSelecting && (
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
             {isSelecting && tracks.length > 0 && (
                <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg sticky top-[72px] z-20 shadow-md border border-neutral-800">
                    <div className="flex items-center gap-3">
                        <input
                        type="checkbox"
                        checked={selectedTrackIds.size > 0 && selectedTrackIds.size === tracks.length}
                        onChange={handleSelectAll}
                        title={selectedTrackIds.size === tracks.length ? "Deselect All" : "Select All"}
                        className="form-checkbox h-5 w-5 text-[#1DB954] bg-neutral-700 border-neutral-600 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-[#1DB954] cursor-pointer"
                        />
                        <span className="text-sm text-neutral-300 tabular-nums">
                            {selectedTrackIds.size} / {tracks.length} selected
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

             {/* Track List Section */} 
             <div className="bg-[#181818]/50 rounded-lg p-4 md:p-6">
                <h3 className="text-xl font-semibold mb-4 px-4">Tracks in this Mood</h3>
                 {tracks.length > 0 ? (
                      <div className="space-y-1">
                          <div className="grid grid-cols-[auto,auto,1fr,auto] items-center gap-4 px-4 py-2 text-xs text-neutral-400 border-b border-neutral-800 mb-2 font-medium">
                              <div className="w-5">{/* Spacer */}</div>
                              <div className="w-6 text-right">#</div>
                              <div>Title</div>
                              <div className="justify-self-end">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              </div>
                          </div>
                          {tracks.map((track, index) => (
                             <SelectableTrackRow
                                 key={track.id}
                                 track={track}
                                 index={index}
                                 isSelecting={isSelecting}
                                 isSelected={selectedTrackIds.has(track.id)}
                                 onToggleSelect={handleToggleSelect} // Use the actual handler
                             />
                          ))}
                      </div>
                  ) : (
                      <p className="text-neutral-400 text-center py-10">No tracks found for this mood.</p>
                  )}
             </div>
          </>
        )}
      </main>

       {/* --- Render the Modal --- */} 
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