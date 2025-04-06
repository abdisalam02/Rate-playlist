'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import UserAvatar from '@/app/components/UserAvatar';
// Assuming utility components are correctly pathed or globally available

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
function SimpleLoadingSpinner({ size = 'h-16 w-16' }: { size?: string }) {
  return (
    <div className={`flex items-center justify-center py-20`}>
      <div className={`animate-spin rounded-full ${size} border-t-2 border-b-2 border-[#1DB954]`}></div>
    </div>
  );
}

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

// Enhanced TrackList component placeholder with Links
function TrackList({ tracks }: { tracks: Track[] }) {
  function formatDuration(ms: number): string {
    if (!ms || ms < 0) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  if (!tracks || tracks.length === 0) {
    return <p className="text-neutral-400 text-center py-10">No tracks found for this mood.</p>;
  }

  return (
    <div className="space-y-1">
      {/* Header Row (Optional) */}
      <div className="grid grid-cols-[auto,1fr,auto] items-center gap-4 px-4 py-2 text-xs text-neutral-400 border-b border-neutral-800 mb-2">
        <div className="w-6 text-right">#</div>
        <div>Title</div>
        <div className="justify-self-end">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </div>

      {/* Track Rows */}
      {tracks.map((track, index) => (
        // Wrap each track row in a Link to the track detail page
        <Link 
          key={track.id || index}
          href={`/track/${track.id}`} 
          className="grid grid-cols-[auto,1fr,auto] items-center gap-4 px-4 py-2 rounded group hover:bg-neutral-800/60 transition-colors cursor-pointer"
        >
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
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-white truncate font-medium text-sm group-hover:text-[#1DB954] transition-colors">{track.name}</div>
              <div className="text-neutral-400 truncate text-xs">
                {track.artists?.map(a => a.name).join(', ')}
              </div>
            </div>
          </div>
          
          {/* Duration */}
          <div className="text-neutral-400 text-xs justify-self-end group-hover:text-white transition-colors">
            {formatDuration(track.duration_ms || 0)}
          </div>
        </Link>
      ))}
    </div>
  );
}

// --- Main Page Component (UI Refined) ---

export default function CustomMoodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moodId = params?.id as string; 

  const [moodDetails, setMoodDetails] = useState<CustomMoodDetails | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!moodId) {
      setError("Mood ID is missing from URL.");
      setLoading(false);
      return;
    }

    const fetchMoodData = async () => {
      setLoading(true);
      setError(null);
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
            // Log error instead of throwing, allow page to render mood details
            console.error(`Failed to fetch tracks for mood ${moodId} (${tracksRes.status}).`);
            setTracks([]); 
        } else {
            const tracksData = await tracksRes.json();
            if (tracksData.success && Array.isArray(tracksData.data)) {
               setTracks(tracksData.data);
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

  // --- Render Logic ---

  if (loading) {
    return (
      // Use standard background for loading
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <SimpleLoadingSpinner />
      </div>
    );
  }

  if (error || !moodDetails) {
    return (
      <div className="min-h-screen bg-[#121212] text-white">
          <Navbar />
          <main className="container mx-auto px-4 pt-24 pb-16 text-center">
              <ErrorDisplay message={error || "Mood details could not be loaded."} />
               <button 
                    onClick={() => router.back()} 
                    className="mt-6 bg-[#1DB954] text-black font-semibold py-2 px-5 rounded-full hover:bg-[#1ED760] transition text-sm"
               >
                 Go Back
               </button>
          </main>
      </div>
    );
  }

  // Use standard background, remove dynamic style
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Navbar />

      <main className="container mx-auto px-4 pt-20 pb-16">
         {/* Header Section - Refined Layout */}
         <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 pt-8">
             {/* Image Container */}
             <div className="w-48 h-48 lg:w-56 lg:h-56 flex-shrink-0 bg-neutral-800 rounded-lg shadow-xl flex items-center justify-center overflow-hidden">
                 {tracks[0]?.album?.images?.[0]?.url ? (
                    <Image 
                        src={tracks[0].album.images[0].url}
                        alt={moodDetails.mood_name}
                        width={224} // Example sizes, adjust as needed
                        height={224}
                        className="object-cover w-full h-full"
                     />
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                 )}
             </div>
             {/* Text Details Container */}
             <div className="flex flex-col items-center md:items-start text-center md:text-left pt-4">
                 <h2 className="text-sm font-bold uppercase text-neutral-400 mb-2 tracking-wider">Custom Mood</h2>
                 <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-3 leading-tight break-words line-clamp-2">{moodDetails.mood_name}</h1>
                 {moodDetails.description && (
                     <p className="text-neutral-300 text-base mb-5 max-w-xl">{moodDetails.description}</p>
                 )}
                 {/* Creator Info - Use UserAvatar */} 
                 <div className="flex items-center gap-2 text-sm text-neutral-300">
                    <UserAvatar 
                        imageUrl={moodDetails.profile_image} 
                        username={moodDetails.username} 
                        sizeClasses="w-6 h-6" // Standard size for header
                        textSizeClass="text-xs" 
                    />
                    <span>Created by <span className="font-medium text-white hover:underline cursor-pointer">{moodDetails.username || 'Unknown User'}</span></span>
                    {/* Link to user profile if applicable */} 
                    <span className="text-neutral-500">•</span>
                    <span className="text-neutral-400">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
                 </div>
             </div>
         </div>

        {/* Back Button */}
         <div className="mb-8">
             <button 
                onClick={() => router.back()} 
                className="inline-flex items-center text-sm text-neutral-300 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full px-3 py-1 group"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                 Back
             </button>
         </div>

        {/* Tracks Section */}
        <div className="bg-gradient-to-b from-neutral-900/30 to-neutral-900/0 rounded-lg pt-6">
          <h2 className="text-2xl font-bold mb-5 px-4">Tracks in this Mood</h2>
          <TrackList tracks={tracks} />
        </div>

      </main>
    </div>
  );
} 