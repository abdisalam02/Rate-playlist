import React from 'react';
// Restore framer-motion import for MusicWaveAnimation
import { motion } from 'framer-motion'; 
// Remove imports only needed by the old TrackItem
// import { useState, useEffect } from 'react'; 
// import { motion, AnimatePresence } from 'framer-motion';
// import { toast } from 'react-hot-toast';

// Keep necessary top-level imports
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import { Track } from '@/types.d';
import TokenRefresher from '@/app/components/TokenRefresher';
// Remove useAudio import - not needed in server component
// import { useAudio } from '@/app/providers'; 
// Import the extracted client component
import TrackCardClient from './TrackCard'; 

// SVG Star components for better visuals
const StarFilled = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const StarHalf = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" fill="black" />
  </svg>
);

const StarEmpty = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

// Music Wave Animation Component (Uses motion)
function MusicWaveAnimation() {
  return (
    <div className="flex space-x-0.5 items-end h-4">
      {[0, 0.1, 0.2, 0.15, 0.25].map((delay, i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-[#1DB954] rounded-full"
          animate={{ height: ["40%", "100%", "40%"] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

// Enhanced star rating display with SVG icons
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return (
    <div className="flex items-center space-x-0.5 text-yellow-400">
      {[...Array(fullStars)].map((_, i) => (
        <StarFilled key={`full-${i}`} />
      ))}
      
      {hasHalfStar && <StarHalf />}
      
      {[...Array(emptyStars)].map((_, i) => (
        <StarEmpty key={`empty-${i}`} />
      ))}
      
      <span className="ml-1 text-white text-sm">{rating.toFixed(1)}</span>
    </div>
  );
}

// New component for review bubbles
function ReviewBubble({ review }: { review: string }) {
  return (
    <div className="relative mt-4">
      <div className="absolute left-4 top-0 w-4 h-4 -translate-y-full">
        <div className="absolute w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white/10"></div>
      </div>
      <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm text-sm">
        "{review}"
      </div>
    </div>
  );
}

// Sample reviews for demo purposes
const sampleReviews = [
  "This track has been on repeat for days! Can't get enough.",
  "The beat on this is incredible, it's an instant mood lifter.",
  "One of the most innovative songs I've heard this year.",
  "The vocals on this track give me chills every time.",
  "Perfect blend of lyrics and production, a true masterpiece.",
  "This song is the perfect addition to my workout playlist.",
  "The melody is so catchy, I can't stop humming it.",
  "I love how this track builds up to that amazing chorus.",
  "So many layers to this song, I discover something new every listen."
];

async function getTopTracks(limit = 50) {
  const baseUrl = process.env.NEXTAUTH_URL || '';
  if (!baseUrl) {
    console.error("[TopTracksPage] Error: NEXTAUTH_URL not set.");
    return [];
  }
  const apiUrl = `${baseUrl}/api/community/top-rated?type=track&limit=${limit}`;
  console.log(`[TopTracksPage] Fetching from: ${apiUrl}`);
  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch top tracks: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`[TopTracksPage] Received ${data?.items?.length || 0} tracks.`);
    return data.items || [];
  } catch (error) {
    console.error('[TopTracksPage] Fetch error:', error);
    return [];
  }
}

// Define StarIcon here if not imported, or ensure it's defined globally
const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );

// --- TopCommunityTracksPage (Server Component) ---
export default async function TopCommunityTracksPage() {
  const topTracks = await getTopTracks();

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
          <h1 className="text-3xl font-bold">Top Rated Tracks</h1>
        </div>
        <p className="text-neutral-400 mb-8">Tracks most highly rated by the community.</p>
        
        {topTracks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {topTracks.map((track: Track & { average_rating?: number; rating_count?: number }) => (
              <TrackCardClient key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-neutral-400">No top rated tracks found or failed to load.</p>
          </div>
        )}
      </main>
    </div>
  );
} 