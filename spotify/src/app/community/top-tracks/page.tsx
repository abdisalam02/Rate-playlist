'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useInView } from 'react-intersection-observer';
import { useAudio } from '@/app/providers';
import { toast } from 'react-hot-toast';

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

// Music Wave Animation Component
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

function TrackItem({ track, index }: { track: any; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [randomReview, setRandomReview] = useState("");
  const { playingTrack, isPlaying, playTrack } = useAudio();
  
  const isCurrentTrack = playingTrack?.id === track.id;
  const hasPreview = !!track.preview_url;
  
  // Generate a random review when the component mounts or track changes
  useEffect(() => {
    const reviewIndex = Math.floor(Math.random() * sampleReviews.length);
    setRandomReview(sampleReviews[reviewIndex]);
  }, [track.id]);
  
  // Function to handle track play
  const handlePlayTrack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasPreview) {
      playTrack({
        id: track.id,
        name: track.name,
        preview_url: track.preview_url,
        artists: track.artists,
        album: {
          images: track.album?.images
        }
      });
    } else {
      toast.error('No preview available for this track');
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/track/${track.id}`} className="block">
        <div className="relative aspect-square overflow-hidden">
          <Image 
            src={track.album?.images?.[0]?.url || '/placeholder.png'} 
            alt={track.name}
            fill
            className={`object-cover transition-all duration-300 ${isHovered ? 'scale-110 blur-sm' : 'scale-100'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${isHovered ? 'from-black/90 to-black/40' : 'from-black/70 to-transparent'} transition-all duration-300`}></div>
          
          {/* Play Button */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <button
              onClick={handlePlayTrack}
              className={`${hasPreview ? 'hover:scale-110' : 'cursor-not-allowed opacity-70'} transition-all duration-200 bg-[#1DB954] text-black rounded-full p-3 shadow-lg`}
              disabled={!hasPreview}
            >
              {isCurrentTrack && isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Now Playing Indicator */}
          {isCurrentTrack && isPlaying && (
            <div className="absolute bottom-3 left-3 z-10">
              <MusicWaveAnimation />
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h3 className="font-bold text-white text-lg line-clamp-1">{track.name}</h3>
            <p className="text-gray-300 text-sm line-clamp-1">
              {track.artists?.map((artist: any) => artist.name).join(', ')}
            </p>
            <div className="mt-1">
              <StarRating rating={track.average_rating || 0} />
            </div>
            
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ReviewBubble review={randomReview} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function TopTracks() {
  const { data: session } = useSession();
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });
  
  const fetchTopTracks = async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community/top-rated?type=track&page=${pageNum}&limit=12`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        if (pageNum === 1) {
          setTracks(data.items);
        } else {
          setTracks(prev => [...prev, ...data.items]);
        }
        setHasMore(data.items.length === 12);
      } else {
        setHasMore(false);
        
        // If first page returns no results, use mock data
        if (pageNum === 1) {
          useMockData();
        }
      }
    } catch (error) {
      console.error('Failed to fetch top tracks:', error);
      setError('Failed to load top tracks. Please try again later.');
      
      // Use mock data on error
      if (pageNum === 1) {
        useMockData();
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Load more tracks when reaching the end of the page
  useEffect(() => {
    if (inView && !loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [inView, loading, hasMore]);
  
  // Fetch initial data
  useEffect(() => {
    fetchTopTracks(page);
  }, [page]);
  
  // Mock data for demo purposes
  const useMockData = () => {
    const mockTracks = [
      {
        id: '4iV5W9uYEdYUVa79Axb7Rh',
        name: 'Starboy',
        artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }],
        album: {
          name: 'Starboy',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }]
        },
        preview_url: 'https://p.scdn.co/mp3-preview/8b86838c05e89d60f97a3dab0c17e89b86a40be8',
        average_rating: 4.7,
        rating_count: 583
      },
      {
        id: '7qiZfU4dY1lWllzX7mPBI3',
        name: 'Shape of You',
        artists: [{ name: 'Ed Sheeran' }],
        album: {
          name: '÷ (Divide)',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }]
        },
        preview_url: 'https://p.scdn.co/mp3-preview/84462d8e1e4d0f9e5ccd06f0da390f65843774a2',
        average_rating: 4.3,
        rating_count: 612
      },
      {
        id: '4LwU4Vp6od3Sb08CsP99CR',
        name: 'HUMBLE.',
        artists: [{ name: 'Kendrick Lamar' }],
        album: {
          name: 'DAMN.',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2732c7c26968c01c6f12c4896f0' }]
        },
        preview_url: 'https://p.scdn.co/mp3-preview/8bfda39b64aaa94135b85e68e8e84b3b58d9ccce',
        average_rating: 4.9,
        rating_count: 723
      },
      {
        id: '0E9ZjEAyAwOXZ7wJC0PD33',
        name: 'Blinding Lights',
        artists: [{ name: 'The Weeknd' }],
        album: {
          name: 'After Hours',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c8e97032c552bde0dab9a2e8' }]
        },
        preview_url: 'https://p.scdn.co/mp3-preview/6ecfcc4e5c6c8d933a683f50010f2a2fe93dde0c',
        average_rating: 4.8,
        rating_count: 832
      },
      {
        id: '5ghIJDpPoe3CfHMGu71E6T',
        name: 'Bohemian Rhapsody',
        artists: [{ name: 'Queen' }],
        album: {
          name: 'A Night At The Opera',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273a0e7a323c3555c0c457affb5' }]
        },
        preview_url: 'https://p.scdn.co/mp3-preview/5dabdf63b8711f3a7a169a8da0fb5a12c6940a15',
        average_rating: 4.9,
        rating_count: 1024
      },
      {
        id: '4Cy0NHJ8Gh0xMdwyM9RkQm',
        name: 'Good As Hell',
        artists: [{ name: 'Lizzo' }],
        album: {
          name: 'Cuz I Love You',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d8f5ab3beb935e02c55eeeb4' }]
        },
        preview_url: 'https://p.scdn.co/mp3-preview/5f8f6955f44af00faf3ce9363efbc37d1f0e2e6e',
        average_rating: 4.5,
        rating_count: 437
      }
    ];
    
    setTracks(mockTracks);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-28 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-teal-400">
            Top Rated Tracks
          </h1>
          <p className="text-gray-400 mt-2">The highest rated tracks based on our community's ratings</p>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tracks.map((track, index) => (
            <TrackItem key={track.id} track={track} index={index} />
          ))}
          
          {loading && (
            <div className="col-span-full flex justify-center my-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1DB954]"></div>
            </div>
          )}
        </div>
        
        {!loading && tracks.length === 0 && !error && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No ratings yet</h3>
            <p className="text-gray-400 mb-4">Be the first to rate some tracks and they'll appear here!</p>
            <Link href="/discover" className="inline-block bg-[#1DB954] text-black font-bold px-6 py-3 rounded-full hover:bg-[#19a449] transition-colors">
              Discover Tracks to Rate
            </Link>
          </div>
        )}
        
        {hasMore && (
          <div ref={ref} className="h-20 flex items-center justify-center mt-8">
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={loading}
              className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More Tracks'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
} 