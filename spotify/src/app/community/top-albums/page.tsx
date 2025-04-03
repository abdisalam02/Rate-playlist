'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useInView } from 'react-intersection-observer';

// SVG Star components for better visuals
const StarFilled = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const StarHalf = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M12 18.354V5l-1.212-2.79L7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" fill="black" />
  </svg>
);

const StarEmpty = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

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
  "Absolute masterpiece! The production on this album is incredible.",
  "One of the best albums of the year, every track is a standout.",
  "A transformative listening experience that grows with each play.",
  "The artist really pushed boundaries with this release.",
  "An instant classic that will be remembered for years to come.",
  "Surprisingly cohesive album with great flow between tracks.",
  "I can't stop listening to this, it's been on repeat for weeks!",
  "The lyrical depth on this album is amazing.",
  "Such a unique sound, really stands out from their previous work."
];

function AlbumItem({ album, index }: { album: any; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [randomReview, setRandomReview] = useState("");
  
  // Generate a random review when the component mounts or album changes
  useEffect(() => {
    const reviewIndex = Math.floor(Math.random() * sampleReviews.length);
    setRandomReview(sampleReviews[reviewIndex]);
  }, [album.id]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/album/${album.id}`} className="block">
        <div className="relative aspect-square overflow-hidden">
          <Image 
            src={album.images?.[0]?.url || '/placeholder.png'} 
            alt={album.name}
            fill
            className={`object-cover transition-all duration-300 ${isHovered ? 'scale-110 blur-sm' : 'scale-100'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${isHovered ? 'from-black/90 to-black/40' : 'from-black/70 to-transparent'} transition-all duration-300`}></div>
          
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h3 className="font-bold text-white text-lg line-clamp-1">{album.name}</h3>
            <p className="text-gray-300 text-sm line-clamp-1">
              {album.artists?.map((artist: any) => artist.name).join(', ')}
            </p>
            <div className="mt-1">
              <StarRating rating={album.average_rating || 0} />
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

export default function TopAlbums() {
  const { data: session } = useSession();
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });
  
  const fetchTopAlbums = async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community/top-rated?type=album&page=${pageNum}&limit=12`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        if (pageNum === 1) {
          setAlbums(data.items);
        } else {
          setAlbums(prev => [...prev, ...data.items]);
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
      console.error('Failed to fetch top albums:', error);
      setError('Failed to load top albums. Please try again later.');
      
      // Use mock data on error
      if (pageNum === 1) {
        useMockData();
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Load more albums when reaching the end of the page
  useEffect(() => {
    if (inView && !loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  }, [inView, loading, hasMore]);
  
  // Fetch initial data
  useEffect(() => {
    fetchTopAlbums(page);
  }, [page]);
  
  // Mock data for demo purposes
  const useMockData = () => {
    const mockAlbums = [
      {
        id: '4aawyAB9vmqN3uQ7FjRGTy',
        name: 'Dawn FM',
        artists: [{ name: 'The Weeknd' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734ab2520c2c77a1d66b9ee21d' }],
        average_rating: 4.8,
        rating_count: 532
      },
      {
        id: '2noRn2Aes5aoNVsU6iWThc',
        name: 'My Beautiful Dark Twisted Fantasy',
        artists: [{ name: 'Kanye West' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d9194aa18fa4c9362b47464f' }],
        average_rating: 4.9,
        rating_count: 871
      },
      {
        id: '0FZK97MXMm5mUQ8mtudjuK',
        name: 'To Pimp a Butterfly',
        artists: [{ name: 'Kendrick Lamar' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273cdb645498cd3d8a2db4d05e1' }],
        average_rating: 4.9,
        rating_count: 732
      },
      {
        id: '6vV5UrXcfyQD1wu4Qo2I9K',
        name: 'Blonde',
        artists: [{ name: 'Frank Ocean' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526' }],
        average_rating: 4.7,
        rating_count: 619
      },
      {
        id: '2QRedhP5RmKJiJ1i8VgDGR',
        name: 'Rumours',
        artists: [{ name: 'Fleetwood Mac' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273e52a59a28efa4773dd2bfe1b' }],
        average_rating: 4.8,
        rating_count: 892
      },
      {
        id: '4LH4d3cOWNNsVw41Gqt2kv',
        name: 'The Dark Side of the Moon',
        artists: [{ name: 'Pink Floyd' }],
        images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ea7caaff71dea1051d49b2fe' }],
        average_rating: 4.9,
        rating_count: 1024
      }
    ];
    
    setAlbums(mockAlbums);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-28 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-teal-400">
            Top Rated Albums
          </h1>
          <p className="text-gray-400 mt-2">The highest rated albums based on our community's ratings</p>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {albums.map((album, index) => (
            <AlbumItem key={album.id} album={album} index={index} />
          ))}
          
          {loading && (
            <div className="col-span-full flex justify-center my-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1DB954]"></div>
            </div>
          )}
        </div>
        
        {!loading && albums.length === 0 && !error && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No ratings yet</h3>
            <p className="text-gray-400 mb-4">Be the first to rate some albums and they'll appear here!</p>
            <Link href="/discover" className="inline-block bg-[#1DB954] text-black font-bold px-6 py-3 rounded-full hover:bg-[#19a449] transition-colors">
              Discover Albums to Rate
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
              {loading ? 'Loading...' : 'Load More Albums'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
} 