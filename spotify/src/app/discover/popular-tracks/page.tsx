'use client';

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";

interface Track {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; height: number; width: number }[];
  };
  duration_ms?: number;
  source_playlist?: string; // Added source_playlist field
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "0:00";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = "/images/placeholder.png";
}

function TrackItem({ track }: { track: Track }) {
  return (
    <div className="flex items-center p-2 rounded-md hover:bg-gray-900 transition">
      <div className="flex-shrink-0 mr-4">
        <Image
          src={track.album.images[0]?.url || "/images/placeholder.png"}
          alt={track.album.name}
          width={50}
          height={50}
          className="rounded shadow"
          onError={handleImageError}
        />
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-white truncate font-medium">{track.name}</p>
        <p className="text-gray-400 truncate text-sm">
          {track.artists.map((artist) => artist.name).join(", ")}
        </p>
      </div>
      <div className="hidden md:block text-right text-gray-400 truncate text-sm">
        {track.album.name}
      </div>
      <div className="hidden md:block ml-4 text-right text-gray-400 text-sm">
        {formatDuration(track.duration_ms)}
      </div>
      {track.source_playlist && (
        <div className="hidden md:block ml-4 text-right text-gray-400 text-xs bg-gray-800 px-2 py-1 rounded">
          {track.source_playlist}
        </div>
      )}
    </div>
  );
}

export default function PopularTracks() {
  const { data: session } = useSession();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("Unknown");
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Only fetch if user is authenticated
    if (isLoading) return;
    
    setLoading(true);
    const fetchTrendingTracks = async () => {
      try {
        const useClientCredentials = !session?.user;
        const apiUrl = `/api/discover/current-hits?limit=50${useClientCredentials ? '&use_client_credentials=true' : ''}`;
        console.log("Fetching current hits from:", apiUrl);
        const response = await fetch(apiUrl, { cache: 'no-store' });
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received current hits data:", data);
        
        // Extract tracks, handling different response formats
        let extractedTracks: Track[] = [];
        if (data.tracks && Array.isArray(data.tracks)) {
          extractedTracks = data.tracks;
        } else if (data.tracks?.items && Array.isArray(data.tracks.items)) {
          extractedTracks = data.tracks.items;
        }
        
        if (extractedTracks.length > 0) {
          setTracks(extractedTracks);
          setSource(data.source || 'Unknown Source');
          console.log(`Loaded ${extractedTracks.length} current hits`);
        } else {
          setError("No current hits found. Try again later.");
        }
      } catch (error) {
        console.error('Error fetching current hits:', error);
        setError("Failed to load current hits. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrendingTracks();
  }, [session, isLoading]);
  
  // Loading skeleton
  const renderSkeletons = () => {
    return Array(10)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="flex items-center p-2 rounded-md">
          <div className="flex-shrink-0 mr-4">
            <div className="w-[50px] h-[50px] bg-gray-800 rounded animate-pulse" />
          </div>
          <div className="flex-grow">
            <div className="h-5 bg-gray-800 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-800 rounded w-1/2 animate-pulse" />
          </div>
          <div className="hidden md:block">
            <div className="h-4 bg-gray-800 rounded w-[100px] animate-pulse" />
          </div>
        </div>
      ));
  };
  
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Current Popular Hits</h1>
        <div className="text-sm text-gray-400">Source: {source}</div>
      </div>
      
      {!session ? (
        <div className="bg-[#121212] p-8 rounded-lg text-center">
          <p className="text-gray-400">Please log in to view current popular hits.</p>
          <button 
            onClick={() => signIn('spotify')}
            className="mt-4 px-6 py-2 bg-[#1DB954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition"
          >
            Log in with Spotify
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-2">{renderSkeletons()}</div>
      ) : error ? (
        <div className="text-red-500 p-4 bg-red-900/20 rounded-md">
          <p>{error}</p>
          <button
            onClick={() => {
              if (session) {
                setLoading(true);
                window.location.reload();
              }
            }}
            className="mt-2 px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-gray-400">No trending tracks found.</p>
      ) : (
        <>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <div className="mb-4 hidden md:flex text-gray-500 text-sm font-medium px-2">
              <div className="flex-shrink-0 mr-4 w-[50px]"></div>
              <div className="flex-grow">TITLE</div>
              <div className="hidden md:block text-right">ALBUM</div>
              <div className="hidden md:block ml-4 text-right w-[50px]">
                DURATION
              </div>
              <div className="hidden md:block ml-4 text-right w-[140px]">
                SOURCE
              </div>
            </div>
            <div className="space-y-1">
              {tracks.map((track) => (
                <TrackItem key={track.id} track={track} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
} 