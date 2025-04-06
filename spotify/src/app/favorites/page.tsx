'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import { Track } from '@/types/index'; // Assuming you have a Track type
import Link from 'next/link';
import Image from 'next/image'; // Import Next.js Image
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast'; // Using react-hot-toast for notifications

// --- Reusable Components ---

// Simplified Track Item with Checkbox (Larger Version)
interface FavoriteTrackItemProps {
  track: Track;
  isSelected: boolean;
  onToggleSelect: (trackId: string) => void;
}

const FavoriteTrackItem: React.FC<FavoriteTrackItemProps> = ({ track, isSelected, onToggleSelect }) => {
  const imageUrl = track.album?.images?.[0]?.url || '/placeholder-album.png';
  const artists = track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
  const trackIdString = String(track.id);
  const trackName = track.name || 'Untitled Track';

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg transition-colors duration-200 ${isSelected ? 'bg-[#2a2a2a]' : 'hover:bg-[#282828]'} h-20`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(trackIdString)}
        className="form-checkbox h-5 w-5 text-[#1DB954] bg-neutral-800 border-neutral-600 rounded focus:ring-[#1DB954] focus:ring-offset-0 cursor-pointer shrink-0"
      />
      <div className="relative w-16 h-16 rounded overflow-hidden shrink-0">
        <Image 
          src={imageUrl} 
          alt={trackName} 
          fill 
          sizes="64px" 
          className="object-cover" 
          onError={(e) => { e.currentTarget.src = '/placeholder-album.png'; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/track/${trackIdString}`} className="hover:underline">
           <p className="text-white font-semibold text-base truncate" title={trackName}>{trackName}</p>
        </Link>
        <p className="text-neutral-400 text-sm truncate" title={artists}>{artists}</p>
      </div>
    </div>
  );
};

// --- Revamped Add to Playlist Modal Component ---
interface SimplifiedPlaylist {
    id: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
}

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddToPlaylist: (playlistId: string | null, newPlaylistName: string | null) => Promise<void>;
    favoriteTrackCount: number;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ isOpen, onClose, onAddToPlaylist, favoriteTrackCount }) => {
    const { data: session } = useSession();
    const [playlists, setPlaylists] = useState<SimplifiedPlaylist[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
    const [newPlaylistName, setNewPlaylistName] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState(''); // State for search term
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch user's playlists
    useEffect(() => {
        if (isOpen && session?.accessToken && playlists.length === 0) {
            const fetchPlaylists = async () => {
                setIsLoadingPlaylists(true);
                setError(null);
                try {
                    // Use the correct API route
                    const res = await fetch('/api/spotify/me/playlists'); 
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || `Failed to fetch playlists (${res.status})`);
                    }
                    const data = await res.json();
                    setPlaylists(data.playlists || []);
                } catch (err) {
                    console.error("Error fetching playlists:", err);
                    setError(err instanceof Error ? err.message : 'Could not load your playlists.');
                    setPlaylists([]); // Ensure playlists is empty on error
                } finally {
                    setIsLoadingPlaylists(false);
                }
            };
            fetchPlaylists();
        }
        if (!isOpen) {
            setSelectedPlaylistId('');
            setNewPlaylistName('');
            setSearchTerm(''); // Reset search on close
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen, session, playlists.length]); // Rerun if playlists length becomes 0 again?

    const handleNewNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewPlaylistName(e.target.value);
        if (e.target.value) {
            setSelectedPlaylistId(''); // Clear selection if typing new name
        }
    };

    // Filter playlists based on search term
    const filteredPlaylists = useMemo(() => {
        if (!searchTerm) return playlists;
        return playlists.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [playlists, searchTerm]);

    const handleSelectPlaylist = (playlistId: string) => {
        setSelectedPlaylistId(playlistId);
        setNewPlaylistName(''); // Clear new name input when selecting
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlaylistId && !newPlaylistName.trim()) {
            setError('Please select an existing playlist or enter a name for a new one.');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
             await onAddToPlaylist(selectedPlaylistId || null, newPlaylistName.trim() || null);
             // Success handled by parent (toast, close)
        } catch (submitError) {
             setError(submitError instanceof Error ? submitError.message : 'An error occurred while adding tracks.');
        } finally {
             setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Playlist Item Component (Internal to Modal)
    const PlaylistItem = ({ playlist }: { playlist: SimplifiedPlaylist }) => (
        <button
            type="button"
            onClick={() => handleSelectPlaylist(playlist.id)}
            disabled={!!newPlaylistName || isSubmitting}
            className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed 
                        ${selectedPlaylistId === playlist.id 
                            ? 'bg-[#1DB954]/30' 
                            : 'hover:bg-[#2a2a2a]'
                        }`}
        >
            <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-neutral-700 flex items-center justify-center">
                 <Image 
                    src={playlist.imageUrl || '/placeholder-playlist.png'} 
                    alt={playlist.name}
                    fill 
                    sizes="40px" 
                    className="object-cover"
                    onError={(e) => { e.currentTarget.src = '/placeholder-playlist.png'; }}
                 />
             </div>
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                <p className="text-neutral-400 text-xs">{playlist.trackCount} tracks</p>
            </div>
            {selectedPlaylistId === playlist.id && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1DB954] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            )}
        </button>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#181818] rounded-xl w-full max-w-lg p-6 border border-neutral-700 shadow-xl flex flex-col"
                        onClick={(e) => e.stopPropagation()} // Prevent closing on inner click
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Add Favorites to Playlist</h2>
                            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors p-1 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-sm text-neutral-300 mb-5">
                            Add the selected <span className="font-semibold text-white">{favoriteTrackCount}</span> favorite track{favoriteTrackCount !== 1 ? 's' : ''} to one of your Spotify playlists or create a new one.
                        </p>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
                            {/* Search Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search your playlists..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    disabled={isLoadingPlaylists || isSubmitting}
                                    className="w-full bg-[#2a2a2a] border border-neutral-600 rounded-md pl-10 pr-4 py-2 text-white focus:ring-1 focus:ring-[#1DB954] focus:border-[#1DB954] text-sm"
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </div>

                            {/* Playlist List */}
                            <div className="flex-1 overflow-y-auto max-h-60 pr-1 space-y-1 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                                {isLoadingPlaylists ? (
                                    <div className="h-40 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
                                    </div>
                                ) : filteredPlaylists.length > 0 ? (
                                    filteredPlaylists.map((p) => (
                                        <PlaylistItem key={p.id} playlist={p} />
                                    ))
                                ) : (
                                     <p className="text-center text-sm text-neutral-400 py-4">
                                        {playlists.length === 0 && !isLoadingPlaylists && !error ? "You don't seem to have any playlists." : "No matching playlists found."} 
                                     </p>
                                )}
                                {error && !isLoadingPlaylists && playlists.length === 0 && (
                                    <p className="text-center text-sm text-red-400 py-4">Error: {error}</p>
                                )}
                            </div>
                            
                            {/* Separator */}
                            <div className="flex items-center my-3">
                                <hr className="flex-grow border-t border-neutral-600"/>
                                <span className="mx-3 text-xs text-neutral-500">OR</span>
                                <hr className="flex-grow border-t border-neutral-600"/>
                            </div>

                            {/* Create New Playlist Input */}
                            <div>
                                <label htmlFor="newPlaylistName" className="sr-only">Create New Playlist</label>
                                <input
                                    type="text"
                                    id="newPlaylistName"
                                    value={newPlaylistName}
                                    onChange={handleNewNameChange}
                                    disabled={!!selectedPlaylistId || isSubmitting || isLoadingPlaylists}
                                    placeholder="Or create a new playlist..."
                                    className="w-full bg-[#2a2a2a] border border-neutral-600 rounded-md px-3 py-2 text-white focus:ring-1 focus:ring-[#1DB954] focus:border-[#1DB954] text-sm disabled:opacity-50"
                                />
                            </div>

                            {/* Error Message Area (moved near button) */}
                             {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}

                            {/* Action Buttons */}
                            <div className="flex justify-end items-center gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-neutral-300 hover:text-white transition-colors text-sm px-4 py-2 rounded-full hover:bg-neutral-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={(!selectedPlaylistId && !newPlaylistName.trim()) || isSubmitting || isLoadingPlaylists}
                                    className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                                >
                                    {isSubmitting ? (
                                         <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                                    ) : 'Add Tracks'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


// --- Main Favorites Page Component ---
export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const [favoriteTracks, setFavoriteTracks] = useState<Track[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch favorites and track details
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      const fetchFavorites = async () => {
        setIsLoading(true);
        setError(null);
        setFavoriteTracks([]); 
        try {
          const favRes = await fetch('/api/favorites');
          if (!favRes.ok) {
            const errData = await favRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to fetch favorite IDs');
          }
          const favData = await favRes.json();
          const trackIds: string[] = favData.favorites?.map((fav: any) => fav.track_id) || [];

          if (trackIds.length === 0) {
            setFavoriteTracks([]);
            setIsLoading(false);
            return; 
          }

          const detailsRes = await fetch(`/api/spotify/tracks?ids=${trackIds.join(',')}`); 
          if (!detailsRes.ok) {
            const errData = await detailsRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to fetch track details');
          }
          const detailsData = await detailsRes.json();
          // Ensure tracks array exists
          if (!detailsData || !Array.isArray(detailsData.tracks)) {
              console.error("Invalid track details response structure:", detailsData);
              throw new Error('Received invalid data format for track details.');
          }
          setFavoriteTracks(detailsData.tracks);

        } catch (err) {
          console.error("Error loading favorites:", err);
          setError(err instanceof Error ? err.message : "Could not load favorites.");
          setFavoriteTracks([]); // Ensure clear on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchFavorites();
    } else if (status === 'unauthenticated') {
       setIsLoading(false); 
       setFavoriteTracks([]); 
       setError(null); // Clear error if logged out
    }
     setSelectedTrackIds(new Set());
  }, [session, status]);

  const handleToggleSelect = useCallback((trackId: string) => {
    setSelectedTrackIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = () => {
     if (selectedTrackIds.size === favoriteTracks.length && favoriteTracks.length > 0) {
         setSelectedTrackIds(new Set()); 
     } else {
         setSelectedTrackIds(new Set(favoriteTracks.map(t => String(t.id)))); 
     }
  };

  // Updated to handle potential errors thrown by modal submit
  const handleAddToPlaylistSubmit = async (playlistId: string | null, newPlaylistName: string | null) => {
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
             // Let the error bubble up to the modal
             throw new Error(result.error || result.details?.error?.message || `Failed to export (${res.status})`);
         }

         toast.success(result.message || 'Tracks added successfully!');
         setIsModalOpen(false); 
         setSelectedTrackIds(new Set()); 

     } catch (err) {
          console.error("Export API error:", err);
          toast.error(`Failed to add tracks: ${err instanceof Error ? err.message : 'Unknown error'}`);
          throw err; // Re-throw to be caught by the modal's handleSubmit
     }
  };


  // Render Logic
  if (status === 'loading') {
      // Consistent loading spinner
      return <div className="flex justify-center items-center min-h-screen bg-[#121212]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div></div>;
  }

  if (status === 'unauthenticated') {
     return (
         <div className="min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">
             <Navbar />
             <div className="container mx-auto px-4 py-12 pt-24 text-center flex flex-col items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#1DB954] mb-4 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                 </svg>
                 <h1 className="text-3xl font-bold mb-3">My Favorites</h1>
                 <p className="text-neutral-400 mb-6 max-w-md">Your favorite tracks live here. Sign in with Spotify to see and manage them.</p>
                 <button onClick={() => signIn('spotify')} className="bg-[#1DB954] text-black font-bold py-2.5 px-8 rounded-full hover:bg-opacity-90 transition text-sm">
                     Sign In with Spotify
                 </button>
             </div>
         </div>
     );
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">
      <Navbar />
      <main className="container mx-auto px-4 lg:px-8 py-8 pt-24">
        <h1 className="text-4xl font-bold mb-4">My Favorite Tracks</h1>
         {/* Added Descriptive Text */}
         <p className="text-neutral-300 mb-8 text-base font-sans">
             Select tracks below, then add them to an existing Spotify playlist or create a new one.
         </p>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        ) : error ? (
           <div className="text-center text-red-400 bg-red-900/20 p-6 rounded-lg border border-red-800/50">
                <p className="font-semibold mb-2">Oops! Something went wrong.</p>
                <p className="text-sm">{error}</p>
           </div>
        ) : favoriteTracks.length === 0 ? (
           <div className="text-center text-neutral-400 bg-[#181818]/80 p-10 rounded-lg border border-neutral-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 6L6 5v14l3 1M9 19l12 3l-3-4M6 5l-3 1v13l3 1" /> 
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l1.5 1.5l4.5-4.5" />
                </svg>
              <p className="text-lg font-medium text-white mb-2">No Favorites Yet</p>
              <p className="text-sm">Find tracks you love and click the heart icon to add them here!</p>
           </div>
        ) : (
          <>
             {/* Action Bar - Adjusted styling */}
             <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg sticky top-[72px] z-20 shadow-md border border-neutral-800">
                <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTrackIds.size > 0 && selectedTrackIds.size === favoriteTracks.length}
                      onChange={handleSelectAll}
                      disabled={favoriteTracks.length === 0}
                      title={selectedTrackIds.size === favoriteTracks.length ? "Deselect All" : "Select All"}
                      className="form-checkbox h-5 w-5 text-[#1DB954] bg-neutral-700 border-neutral-600 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-[#1DB954] cursor-pointer"
                    />
                    <span className="text-sm text-neutral-300 tabular-nums">
                       {selectedTrackIds.size} selected
                    </span>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={selectedTrackIds.size === 0}
                    className="bg-[#1DB954] text-black font-bold py-2 px-5 rounded-full text-sm hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 10-2 0v1H7a1 1 0 000 2h2v1a1 1 0 102 0V6h2a1 1 0 100-2h-2V3z" />
                      <path fillRule="evenodd" d="M4.5 5.5A.5.5 0 015 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zM7.5 5.5A.5.5 0 018 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0V14.5a.5.5 0 001 0V6z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M1 14a1 1 0 011-1h16a1 1 0 110 2H2a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                   Add to Playlist...
                </button>
             </div>

             {/* Favorites List */}
             <div className="space-y-2">
               {favoriteTracks.map((track) => (
                 <FavoriteTrackItem
                   key={track.id}
                   track={track}
                   isSelected={selectedTrackIds.has(String(track.id))}
                   onToggleSelect={handleToggleSelect}
                 />
               ))}
             </div>
          </>
        )}
      </main>

       {/* Modal - Pass the correct handler */}
       <AddToPlaylistModal
           isOpen={isModalOpen}
           onClose={() => setIsModalOpen(false)}
           onAddToPlaylist={handleAddToPlaylistSubmit} // Use the submit handler
           favoriteTrackCount={selectedTrackIds.size}
       />

    </div>
  );
}
