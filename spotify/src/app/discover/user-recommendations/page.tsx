'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import TokenRefresher from '@/app/components/TokenRefresher';

// Types
interface UserRecommendation {
  id: string;
  userId: string;
  userName: string;
  userImage: string;
  title: string;
  description: string;
  items: Array<{
    id: string;
    type: string;
    name: string;
    artists: Array<{ name: string }>;
    image: string;
  }>;
}

// User Recommendation component
function UserRecommendationCard({ recommendation }: { recommendation: UserRecommendation }) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://placehold.co/400x400/1DB954/FFFFFF?text=Music';
  };

  return (
    <div className="bg-[#181818] rounded-lg overflow-hidden p-6">
      <div className="flex items-center mb-4">
        <img 
          src={recommendation.userImage || 'https://placehold.co/100x100/1DB954/FFFFFF?text=User'}
          alt={recommendation.userName}
          className="w-12 h-12 rounded-full mr-4"
          onError={handleImageError}
        />
        <div>
          <h3 className="font-bold text-xl">{recommendation.title}</h3>
          <p className="text-sm text-gray-400">by {recommendation.userName}</p>
        </div>
      </div>
      
      <p className="text-gray-300 mb-6">{recommendation.description}</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {recommendation.items.map(item => (
          <Link 
            key={item.id} 
            href={`/${item.type}/${item.id}`}
            className="flex flex-col bg-[#282828] rounded-md overflow-hidden hover:bg-[#333333] transition-colors"
          >
            <div className="aspect-square">
              <img 
                src={item.image || 'https://placehold.co/400x400/1DB954/FFFFFF?text=Item'}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
              />
            </div>
            <div className="p-3">
              <h4 className="font-medium text-sm truncate">{item.name}</h4>
              <p className="text-xs text-gray-400 truncate">
                {item.artists.map(a => a.name).join(', ')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function UserRecommendations() {
  const [recommendations, setRecommendations] = useState<UserRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        console.log("Fetching user recommendations...");
        const response = await fetch('/api/discover/user-recommendations');
        
        if (!response.ok) {
          throw new Error(`Status: ${response.status}`);
        }
        
        const data = await response.json();
        setRecommendations(data.recommendations || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user recommendations:', error);
        setError('Failed to fetch community recommendations. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, []);
  
  // Loading skeletons
  const renderSkeletons = () => {
    return Array(2).fill(0).map((_, i) => (
      <div key={i} className="bg-[#181818] rounded-lg p-6 animate-pulse">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gray-700 rounded-full mr-4"></div>
          <div>
            <div className="h-5 bg-gray-700 rounded mb-2 w-48"></div>
            <div className="h-3 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        <div className="h-4 bg-gray-700 rounded mb-6 w-3/4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, j) => (
            <div key={j} className="flex flex-col bg-[#282828] rounded-md overflow-hidden">
              <div className="aspect-square bg-gray-700"></div>
              <div className="p-3">
                <div className="h-3 bg-gray-600 rounded mb-1 w-5/6"></div>
                <div className="h-2 bg-gray-600 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  };
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <TokenRefresher />
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center mb-8">
          <Link href="/discover" className="mr-4 text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold">Community Picks</h1>
        </div>
        
        {loading ? (
          <div className="space-y-6">
            {renderSkeletons()}
          </div>
        ) : error ? (
          <div className="bg-[#181818] p-6 rounded-lg text-center">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map(recommendation => (
              <UserRecommendationCard key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 