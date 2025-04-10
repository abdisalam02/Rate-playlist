'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { AddToPlaylistModal } from '@/app/components/modals/PlaylistModal';
import { toast } from 'react-hot-toast';
import UserAvatar from '@/app/components/UserAvatar';

// Types for the staple moods and user tracks
interface StapleMood {
  id: string;
  mood_name: string;
  description: string | null;
  default_track_image: string | null;
}

interface UserTrack {
  id: string;
  user_id: string;
  staple_mood_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  track_image: string | null;
  added_at: string;
  mood_name?: string;
  user?: {
    display_name: string;
    profile_image: string | null;
    id: string;
    username?: string;
  };
}

// Skeletal loading component
function DetailPageSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="h-10 bg-neutral-800 rounded-lg w-1/3"></div>
        <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
      </div>
      
      <div className="bg-neutral-800/40 rounded-lg overflow-hidden">
        <div className="h-60 bg-neutral-700"></div>
        <div className="p-6 space-y-4">
          <div className="h-8 bg-neutral-700 rounded w-1/2"></div>
          <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
          <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
        </div>
      </div>
      
      <div className="h-8 bg-neutral-800 rounded w-1/4 mt-10"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-neutral-800/40 rounded-lg overflow-hidden p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-10 w-10 bg-neutral-700 rounded-full"></div>
              <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
            </div>
            <div className="flex space-x-4">
              <div className="w-16 h-16 bg-neutral-700 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-neutral-700 rounded w-3/4"></div>
                <div className="h-4 bg-neutral-700 rounded w-1/2"></div>
                <div className="h-4 bg-neutral-700 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reworked UserTrackContribution for conditional selection UI and restored user info
interface UserTrackContributionProps {
  track: UserTrack;
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (trackId: string) => void;
}

function UserTrackContribution({ track, isSelecting, isSelected, onToggleSelect }: UserTrackContributionProps) {
  const addedDate = track.added_at ? new Date(track.added_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : '';
  const trackIdString = String(track.track_id);
  const trackName = track.track_name || 'Untitled Track';
  const artistName = track.artist_name || 'Unknown Artist';
  
  return (
    <motion.div 
      className={`bg-neutral-800/50 rounded-lg overflow-hidden p-5 transition-all relative ${isSelected ? 'ring-2 ring-[#1DB954] ring-offset-2 ring-offset-black' : isSelecting ? 'hover:bg-neutral-700/60 cursor-pointer' : 'hover:bg-neutral-700/40'}`}
      whileHover={isSelecting ? { scale: 1.02, backgroundColor: 'rgba(64, 64, 64, 0.6)' } : { y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={isSelecting ? () => onToggleSelect(trackIdString) : undefined}
    >
      {isSelecting && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => e.stopPropagation()}
          className="form-checkbox absolute top-3 right-3 h-5 w-5 text-[#1DB954] bg-neutral-900/80 border-neutral-600 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:ring-[#1DB954] cursor-pointer z-10 pointer-events-none"
        />
      )}

      <div className="flex justify-between items-start mb-4">
        {track.user && (
          <Link 
            href={`/user/${track.user.id}`} 
            className="flex items-center gap-3 flex-1 min-w-0 mr-2 group/userlink" 
            onClick={(e) => e.stopPropagation()}
          >
            <UserAvatar 
              imageUrl={track.user.profile_image}
              username={track.user.display_name}
              sizeClasses="w-10 h-10 shrink-0"
              textSizeClass="text-sm"
            />
            <div className="min-w-0">
              <h4 className="font-medium text-white truncate group-hover/userlink:text-[#1DB954] transition-colors">{track.user.display_name || 'Unknown User'}</h4>
            </div>
          </Link>
        )}
        {addedDate && (
          <span className="text-xs text-neutral-500 shrink-0 mt-1">{addedDate}</span>
        )}
      </div>
      
      <div className="flex items-start gap-4">
        <Link 
          href={`/track/${trackIdString}`}
          className="relative w-20 h-20 shrink-0 rounded overflow-hidden block group/tracklink"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={track.track_image || '/placeholder-track.png'}
            alt={trackName}
            fill
            className="object-cover transition-transform duration-300 group-hover/tracklink:scale-110"
            sizes="80px"
            unoptimized={track.track_image?.includes('i.scdn.co')}
          />
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover/tracklink:opacity-100 flex items-center justify-center transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </Link>
        
        <div className="flex-1 min-w-0">
          <Link 
            href={`/track/${trackIdString}`}
            className="block group/tracktitle"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-semibold text-white text-lg group-hover/tracktitle:text-[#1DB954] transition-colors" title={trackName}>{trackName}</h4>
            <p className="text-neutral-400" title={artistName}>{artistName}</p>
          </Link>
          
          <Link 
            href={`https://open.spotify.com/track/${trackIdString}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-3 text-xs font-medium text-[#1DB954] hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Listen on Spotify
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// Component to display when there are no user contributions yet
function EmptyContributions({ moodName }: { moodName: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  
  const handleAddTrack = () => {
    if (session) {
      router.push('/moods/manage');
    } else {
      router.push('/login?callbackUrl=/moods/manage');
    }
  };
  
  return (
    <div className="bg-neutral-800/30 rounded-lg p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-neutral-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      <h3 className="text-xl font-semibold mb-3">No tracks added yet</h3>
      <p className="text-neutral-400 text-lg mb-6 max-w-md mx-auto">
        Be the first to add a track that represents "{moodName}" to you!
      </p>
      <button
        onClick={handleAddTrack}
        className="bg-[#1DB954] text-black font-bold px-6 py-3 rounded-full inline-flex items-center gap-2 hover:bg-[#1ED760] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Add Your Track
      </button>
    </div>
  );
}

export default function StapleMoodDetailPage() {
  const { moodName } = useParams();
  const decodedMoodName = typeof moodName === 'string' ? decodeURIComponent(moodName) : '';
  
  const [mood, setMood] = useState<StapleMood | null>(null);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  
  // State for selection mode and modal 
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Track Selection Handlers 
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
    if (selectedTrackIds.size === userTracks.length && userTracks.length > 0) {
      setSelectedTrackIds(new Set()); 
    } else {
      setSelectedTrackIds(new Set(userTracks.map(t => String(t.track_id)))); 
    }
  };

  // Add to Playlist Handler 
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
  
  // --- New Handlers for Selection Mode ---
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

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedMoodName) return;
      setLoading(true);
      setError(null);
      setUserTracks([]);
      setSelectedTrackIds(new Set());
      setIsSelecting(false);
      
      try {
        const moodsRes = await fetch('/api/moods/staple-moods');
        if (!moodsRes.ok) throw new Error(`Failed to fetch staple moods: ${moodsRes.statusText}`);
        const moodsData = await moodsRes.json();
        const matchedMood = moodsData.success && moodsData.data 
          ? moodsData.data.find((m: StapleMood) => m.mood_name.toLowerCase() === decodedMoodName.toLowerCase()) 
          : null;
        if (!matchedMood) throw new Error(`Mood "${decodedMoodName}" not found`);
        setMood(matchedMood);
        
        console.log(`Fetching tracks for mood ID ${matchedMood.id} via /api/moods/staple/${matchedMood.id}/tracks`);
        const tracksRes = await fetch(`/api/moods/staple/${matchedMood.id}/tracks`); 
        
        if (!tracksRes.ok) {
            const errData = await tracksRes.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to fetch tracks for mood ${matchedMood.id} (${tracksRes.status})`);
        }
        
        const tracksData = await tracksRes.json();
        
        const moodTracks = Array.isArray(tracksData.data) ? tracksData.data : []; 
        
        const sortedTracks = moodTracks.sort((a: UserTrack, b: UserTrack) => 
          new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
        );
        setUserTracks(sortedTracks);
        
      } catch (err: any) {
        console.error('Error fetching mood data:', err);
        setError(err.message);
        setUserTracks([]); 
      } finally {
        setLoading(false);
      }
    };
    if (decodedMoodName) fetchData();
  }, [decodedMoodName]);
  
  const handleAddTrack = () => {
    const targetUrl = '/profile?tab=moods'; // Target profile page with moods tab
    if (session) {
      router.push(targetUrl);
    } else {
      // Redirect to login, then back to profile moods tab
      router.push(`/login?callbackUrl=${encodeURIComponent(targetUrl)}`); 
    }
  };
  
  const getBackgroundClass = () => {
    if (!mood?.mood_name) return 'bg-gradient-to-br from-[#1DB954] to-[#0D8043]';
    
    const colorBackgrounds = [
      'bg-gradient-to-br from-[#1DB954] to-[#0D8043]',
      'bg-gradient-to-br from-[#2D46B9] to-[#1a2a70]',
      'bg-gradient-to-br from-[#3b1966] to-[#29104d]',
      'bg-gradient-to-br from-[#1e3264] to-[#0e1832]',
      'bg-gradient-to-br from-[#e13300] to-[#8c1932]',
      'bg-gradient-to-br from-[#8c1932] to-[#3b1966]',
      'bg-gradient-to-br from-[#f037a5] to-[#8c1932]',
      'bg-gradient-to-br from-[#509bf5] to-[#2D46B9]',
      'bg-gradient-to-br from-[#ff6c00] to-[#e13300]',
      'bg-gradient-to-br from-[#ffae00] to-[#ff6c00]',
    ];
    
    const sum = mood.mood_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colorBackgrounds[sum % colorBackgrounds.length];
  };

  const getMoodDefaultImage = () => {
    if (!mood) return null;
    
    const moodImages: Record<string, string> = {
      'happy': '/mood-images/happy.jpg',
      'sad': '/mood-images/sad.jpg',
      'energetic': '/mood-images/energetic.jpg',
      'calm': '/mood-images/calm.jpg',
      'focus': '/mood-images/focus.jpg',
      'workout': '/mood-images/workout.jpg',
      'party': '/mood-images/party.jpg',
      'romantic': '/mood-images/romantic.jpg',
      'relaxed': '/mood-images/relaxed.jpg',
      'chill': '/mood-images/chill.jpg',
      'nostalgia': '/mood-images/nostalgia.jpg',
      'evening': '/mood-images/evening.jpg',
      'morning': '/mood-images/morning.jpg',
      'travel': '/mood-images/travel.jpg',
      'summer': '/mood-images/summer.jpg',
      'winter': '/mood-images/winter.jpg',
    };
    
    const moodText = (mood.mood_name + ' ' + (mood.description || '')).toLowerCase();
    
    for (const [keyword, image] of Object.entries(moodImages)) {
      if (moodText.includes(keyword)) {
        return image;
      }
    }
    
    return null;
  };

  const defaultImage = getMoodDefaultImage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <div className="mb-6">
          <Link href="/moods/staple" className="text-neutral-400 hover:text-white flex items-center transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to All Moods
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg mb-8">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        
        {loading ? (
          <DetailPageSkeleton />
        ) : mood ? (
          <>
            <div className="bg-neutral-800/40 rounded-xl overflow-hidden shadow-xl mb-10">
              <div className="relative h-64 md:h-80">
                {mood.default_track_image ? (
                  <Image 
                    src={mood.default_track_image}
                    alt={`${mood.mood_name} mood`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    priority
                    unoptimized={mood.default_track_image.includes('i.scdn.co') || mood.default_track_image.startsWith('https://images.unsplash.com')}
                  />
                ) : (
                  <div className={`absolute inset-0 ${getBackgroundClass()} flex items-center justify-center`}>
                    <span className="text-white text-5xl font-bold opacity-60">
                      {mood.mood_name?.charAt(0) || "M"}
                    </span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="inline-block bg-[#1DB954] text-black text-xs font-bold px-3 py-1 rounded-full mb-3">
                    Staple Mood
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{mood.mood_name}</h1>
                  <p className="text-neutral-300 md:text-lg max-w-2xl">{mood.description}</p>
                  
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={handleAddTrack}
                      className="bg-white text-black font-bold px-5 py-2 rounded-full inline-flex items-center gap-2 hover:bg-opacity-90 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Your Track
                    </button>
                    
                    {userTracks.length > 0 && !isSelecting && (
                      <button 
                        onClick={handleEnterSelectionMode}
                        className="bg-neutral-700 text-white font-bold px-5 py-2 rounded-full inline-flex items-center gap-2 hover:bg-neutral-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 10-2 0v1H7a1 1 0 000 2h2v1a1 1 0 102 0V6h2a1 1 0 100-2h-2V3z" />
                          <path fillRule="evenodd" d="M4.5 5.5A.5.5 0 015 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zM7.5 5.5A.5.5 0 018 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0V14.5a.5.5 0 001 0V6z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M1 14a1 1 0 011-1h16a1 1 0 110 2H2a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        Add Contributions to Playlist
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {isSelecting && userTracks.length > 0 && (
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg sticky top-[72px] z-20 shadow-md border border-neutral-800">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTrackIds.size > 0 && selectedTrackIds.size === userTracks.length}
                    onChange={handleSelectAll}
                    title={selectedTrackIds.size === userTracks.length ? "Deselect All" : "Select All"}
                    className="form-checkbox h-5 w-5 text-[#1DB954] bg-neutral-700 border-neutral-600 rounded focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-[#1DB954] cursor-pointer"
                  />
                  <span className="text-sm text-neutral-300 tabular-nums">
                    {selectedTrackIds.size} / {userTracks.length} selected
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 3a1 1 0 10-2 0v1H7a1 1 0 000 2h2v1a1 1 0 102 0V6h2a1 1 0 100-2h-2V3z" />
                      <path fillRule="evenodd" d="M4.5 5.5A.5.5 0 015 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zM7.5 5.5A.5.5 0 018 6v8.5a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0V14.5a.5.5 0 001 0V6z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M1 14a1 1 0 011-1h16a1 1 0 110 2H2a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Choose Playlist...
                  </button>
                </div>
              </div>
            )}
            
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Community Contributions
                <span className="ml-3 text-sm font-normal text-neutral-400">
                  {userTracks.length} {userTracks.length === 1 ? 'track' : 'tracks'}
                </span>
              </h2>
            </div>
            
            {userTracks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userTracks.map(track => (
                  <UserTrackContribution 
                    key={track.id}
                    track={track}
                    isSelecting={isSelecting}
                    isSelected={selectedTrackIds.has(String(track.track_id))}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            ) : (
              <EmptyContributions moodName={mood.mood_name} />
            )}
          </>
        ) : (
          <div className="bg-neutral-800/30 p-8 rounded-lg text-center">
            <h3 className="text-xl font-bold mb-2">Mood not found</h3>
            <p className="text-neutral-400">
              The mood you're looking for doesn't exist or has been removed.
            </p>
            <Link href="/moods/staple" className="mt-6 inline-block bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-full transition-colors">
              View All Moods
            </Link>
          </div>
        )}
      </main>

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