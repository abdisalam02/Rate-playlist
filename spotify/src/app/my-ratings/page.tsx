'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Star rating display component
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center">
      <div className="text-[#1DB954]">
        {"★".repeat(Math.floor(rating))}
        {rating % 1 === 0.5 && "½"}
        {"☆".repeat(5 - Math.ceil(rating))}
      </div>
      <span className="ml-2 text-sm">{rating.toFixed(1)}</span>
    </div>
  );
}

// Rating item for tracks and albums
function RatingItem({ 
  item, 
  type 
}: { 
  item: any; 
  type: 'track' | 'album';
}) {
  return (
    <div className="bg-[#181818] rounded-lg p-4 flex items-center gap-4 hover:bg-[#282828] transition-colors">
      <div className="w-16 h-16 flex-shrink-0">
        <img 
          src={item.image_url || '/placeholder.png'} 
          alt={item.name} 
          className="w-full h-full object-cover rounded"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <Link 
          href={`/${type}/${item.item_id}`}
          className="text-white hover:underline text-lg font-medium truncate block"
        >
          {item.name}
        </Link>
        <p className="text-[#B3B3B3] truncate">{item.artist}</p>
        <div className="mt-1">
          <StarDisplay rating={item.rating} />
        </div>
        {item.review && (
          <p className="text-[#B3B3B3] text-sm mt-1 line-clamp-1">{item.review}</p>
        )}
      </div>
      
      <div className="text-[#B3B3B3] text-sm">
        {new Date(item.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function MyRatings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and sort states
  const [filterType, setFilterType] = useState<'all' | 'track' | 'album'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      fetchRatings();
    }
  }, [session, status, router]);
  
  const fetchRatings = async () => {
    try {
      setLoading(true);
      
      // Fetch user ratings from API
      const response = await fetch('/api/user/ratings', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch ratings');
      }
      
      const data = await response.json();
      setRatings(data.ratings || []);
    } catch (err: any) {
      console.error('Error fetching ratings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter ratings based on current filters
  const filteredRatings = ratings.filter(rating => {
    // Filter by type
    if (filterType !== 'all' && rating.item_type !== filterType) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        rating.name?.toLowerCase().includes(query) || 
        rating.artist?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // Sort ratings based on current sort
  const sortedRatings = [...filteredRatings].sort((a, b) => {
    switch (sortBy) {
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'recent':
      default:
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        <motion.h1 
          className="text-3xl font-bold mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          My Ratings
        </motion.h1>
        
        <motion.p 
          className="text-[#B3B3B3] mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {ratings.length > 0 
            ? `You've rated ${ratings.length} ${ratings.length === 1 ? 'item' : 'items'} so far.`
            : "You haven't rated any music yet. Start rating tracks and albums to build your collection!"
          }
        </motion.p>
        
        {/* Filter and Sort Controls */}
        <motion.div 
          className="flex flex-col md:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by title or artist..."
              className="w-full bg-[#282828] text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select
              className="bg-[#282828] text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">All Types</option>
              <option value="track">Tracks</option>
              <option value="album">Albums</option>
            </select>
            
            <select
              className="bg-[#282828] text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="recent">Most Recent</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
        </motion.div>
        
        {/* Ratings List */}
        {error ? (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6">
            Error: {error}
          </div>
        ) : sortedRatings.length > 0 ? (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {sortedRatings.map((item) => (
              <RatingItem 
                key={`${item.item_type}-${item.item_id}`} 
                item={item} 
                type={item.item_type as 'track' | 'album'} 
              />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-[#181818] rounded-lg">
            <p className="text-[#B3B3B3] mb-4">
              {searchQuery || filterType !== 'all' 
                ? "No ratings match your filters."
                : "You haven't rated any music yet."
              }
            </p>
            <Link 
              href="/discover"
              className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full inline-block hover:scale-105 transition-transform"
            >
              Discover Music to Rate
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 