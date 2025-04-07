'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image'; // Import Next.js Image

// Interface for the playlist data expected by the modal
interface SimplifiedPlaylist {
    id: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
}

// Props for the reusable modal
export interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Function to call when the user confirms adding tracks
    onAddToPlaylist: (playlistId: string | null, newPlaylistName: string | null) => Promise<void>;
    // Number of tracks currently selected
    itemCount: number;
    // Noun for the items being added (e.g., "track", "favorite")
    itemNoun?: string;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
    isOpen,
    onClose,
    onAddToPlaylist,
    itemCount,
    itemNoun = 'track' // Default item noun
}) => {
    const { data: session } = useSession();
    const [playlists, setPlaylists] = useState<SimplifiedPlaylist[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
    const [newPlaylistName, setNewPlaylistName] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch user's playlists
    useEffect(() => {
        // Only fetch if modal is open, user is logged in, and playlists haven't been loaded yet
        if (isOpen && session?.accessToken && playlists.length === 0) {
            const fetchPlaylists = async () => {
                setIsLoadingPlaylists(true);
                setError(null);
                try {
                    const res = await fetch('/api/spotify/me/playlists'); // API endpoint for user playlists
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || `Failed to fetch playlists (${res.status})`);
                    }
                    const data = await res.json();
                    // Ensure the API returns { playlists: [...] }
                    setPlaylists(data.playlists || []);
                } catch (err) {
                    console.error("Error fetching playlists:", err);
                    setError(err instanceof Error ? err.message : 'Could not load your playlists.');
                    setPlaylists([]);
                } finally {
                    setIsLoadingPlaylists(false);
                }
            };
            fetchPlaylists();
        }
        // Reset state when modal closes
        if (!isOpen) {
            setSelectedPlaylistId('');
            setNewPlaylistName('');
            setSearchTerm('');
            setError(null);
            setIsSubmitting(false);
            // Clear playlists if we want to refetch every time (optional)
            // setPlaylists([]);
        }
    // Dependency array includes playlists.length to refetch if it somehow becomes 0 while open
    }, [isOpen, session, playlists.length]);

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
        if (newPlaylistName.trim().length > 100) {
             setError('New playlist name cannot exceed 100 characters.');
             return;
        }

        setError(null);
        setIsSubmitting(true);
        try {
             // Call the provided submit handler
             await onAddToPlaylist(selectedPlaylistId || null, newPlaylistName.trim() || null);
             // Parent component should handle closing the modal on success via the promise resolving
        } catch (submitError) {
             // Display error message from the submit handler
             setError(submitError instanceof Error ? submitError.message : 'An error occurred while adding items.');
        } finally {
             setIsSubmitting(false);
        }
    };

    // Render nothing if the modal isn't open
    if (!isOpen) return null;

    // Internal Playlist Item Component
    const PlaylistItem = ({ playlist }: { playlist: SimplifiedPlaylist }) => (
        <button
            type="button"
            onClick={() => handleSelectPlaylist(playlist.id)}
            disabled={!!newPlaylistName || isSubmitting}
            // Apply styling for selected state and hover effects
            className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed
                        ${selectedPlaylistId === playlist.id
                            ? 'bg-[#1DB954]/30' // Highlight selected
                            : 'hover:bg-neutral-700' // Hover effect
                        }`}
        >
            {/* Playlist Image */}
            <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-neutral-700 flex items-center justify-center">
                 <Image
                    src={playlist.imageUrl || '/placeholder-playlist.png'} // Use placeholder if no image
                    alt={playlist.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                    onError={(e) => { e.currentTarget.src = '/placeholder-playlist.png'; }} // Fallback on error
                 />
             </div>
             {/* Playlist Name and Track Count */}
            <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                <p className="text-neutral-400 text-xs">{playlist.trackCount} tracks</p>
            </div>
            {/* Checkmark for selected playlist */}
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
                // Backdrop
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
                    {/* Modal Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-[#181818] rounded-xl w-full max-w-lg p-6 border border-neutral-700 shadow-xl flex flex-col max-h-[90vh]" // Added max-h
                        onClick={(e) => e.stopPropagation()} // Prevent closing on inner click
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h2 className="text-xl font-bold text-white">Add to Playlist</h2>
                            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors p-1 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Info Text */}
                        <p className="text-sm text-neutral-300 mb-5 shrink-0">
                            Add the selected <span className="font-semibold text-white">{itemCount}</span> {itemNoun}{itemCount !== 1 ? 's' : ''} to one of your Spotify playlists or create a new one.
                        </p>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4 min-h-0"> {/* Added min-h-0 */}
                            {/* Search Input */}
                            <div className="relative shrink-0">
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

                            {/* Playlist List (Scrollable) */}
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-transparent">
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
                            <div className="flex items-center shrink-0">
                                <hr className="flex-grow border-t border-neutral-600"/>
                                <span className="mx-3 text-xs text-neutral-500">OR</span>
                                <hr className="flex-grow border-t border-neutral-600"/>
                            </div>

                            {/* Create New Playlist Input */}
                            <div className="shrink-0">
                                <label htmlFor="newPlaylistName" className="sr-only">Create New Playlist</label>
                                <input
                                    type="text"
                                    id="newPlaylistName"
                                    value={newPlaylistName}
                                    onChange={handleNewNameChange}
                                    disabled={!!selectedPlaylistId || isSubmitting || isLoadingPlaylists}
                                    placeholder="Or create a new playlist..."
                                    className="w-full bg-[#2a2a2a] border border-neutral-600 rounded-md px-3 py-2 text-white focus:ring-1 focus:ring-[#1DB954] focus:border-[#1DB954] text-sm disabled:opacity-50"
                                    maxLength={100} // Spotify limit
                                />
                            </div>

                            {/* Error Message Area */}
                             {error && <p className="text-red-400 text-sm text-center shrink-0">{error}</p>}

                            {/* Action Buttons */}
                            <div className="flex justify-end items-center gap-3 pt-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-neutral-300 hover:text-white transition-colors text-sm px-4 py-2 rounded-full hover:bg-neutral-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={(!selectedPlaylistId && !newPlaylistName.trim()) || isSubmitting || isLoadingPlaylists || itemCount === 0}
                                    className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                                >
                                    {isSubmitting ? (
                                         <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                                    ) : 'Add Items'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Export default for easier dynamic import if needed, though named export is fine too
export default AddToPlaylistModal;
