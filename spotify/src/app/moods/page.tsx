'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';

export default function AllMoodsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moods, setMoods] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchAllMoods = async () => {
      try {
        setLoading(true);
        
        // Fetch all moods from the API
        const res = await fetch('/api/moods?limit=50', {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch moods: ${res.status}`);
        }
        
        const data = await res.json();
        setMoods(data.moods || []);
      } catch (err: any) {
        console.error('Error fetching moods:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllMoods();
  }, []);
  
  // Helper function to get a description for a mood
  const getMoodMessage = (mood: string) => {
    const moodMessages: {[key: string]: string} = {
      'chill': 'Perfect for relaxation and unwinding',
      'energetic': 'Gets you pumped and ready to move',
      'happy': 'Uplifting music for good vibes',
      'sad': 'For when you need to feel those emotions',
      'focused': 'Helps you concentrate and be productive',
      'romantic': 'Sets the mood for love and connection',
      'angry': 'Channels your frustration and intensity',
      'nostalgic': 'Takes you back to meaningful memories'
    };
    
    const normalizedMood = mood.toLowerCase();
    
    for (const [key, message] of Object.entries(moodMessages)) {
      if (normalizedMood.includes(key)) {
        return message;
      }
    }
    
    return 'Curated music for this specific vibe';
  };
  
  // Group moods by similar types
  const groupedMoods = moods.reduce((acc: {[key: string]: any[]}, mood) => {
    const normalizedMood = mood.mood.toLowerCase();
    let category = 'other';
    
    // Check which category this mood belongs to
    const categories = ['chill', 'energetic', 'happy', 'sad', 'focused', 'romantic', 'angry', 'nostalgic'];
    for (const cat of categories) {
      if (normalizedMood.includes(cat)) {
        category = cat;
        break;
      }
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(mood);
    return acc;
  }, {});
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-12 pt-20">
          <div className="max-w-md mx-auto bg-[#181818] p-6 rounded-lg text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Error Loading Moods</h2>
            <p className="text-[#B3B3B3] mb-6">{error}</p>
            <Link href="/" className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:bg-opacity-90">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center mb-8">
          <h1 className="text-3xl font-bold">Music Moods</h1>
        </div>
        
        <p className="text-gray-300 mb-8 max-w-2xl">
          Discover music based on your mood. Browse through popular moods created by our community or explore specific moods to find new tracks that match exactly how you feel.
        </p>
        
        {moods.length === 0 ? (
          <div className="text-center py-12 bg-[#181818] rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-gray-400 mb-2">No moods found in the database.</p>
            <p className="text-sm text-[#1DB954]">
              Be the first to create a mood!
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(groupedMoods).map(([category, categoryMoods]) => (
              <div key={category} className="mb-8">
                <h2 className="text-2xl font-bold mb-4 capitalize">{category} Moods</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryMoods.map((mood, index) => (
                    <Link 
                      key={mood.id || `mood-${index}`} 
                      href={`/moods/${encodeURIComponent(mood.mood)}`}
                      className="relative overflow-hidden bg-[#181818] rounded-lg transition-transform hover:scale-[1.02] group"
                      style={{
                        borderLeft: `4px solid ${mood.color || '#1DB954'}`
                      }}
                    >
                      <div 
                        className="h-32 bg-gradient-to-br"
                        style={{ 
                          backgroundImage: `linear-gradient(to bottom right, ${mood.color || '#1DB954'}, ${mood.color ? adjustColor(mood.color, -30) : '#0A6E31'})`
                        }}
                      >
                        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-xl font-bold text-white">{mood.mood}</h3>
                          <div 
                            className="text-xs rounded-full px-2 py-0.5 inline-block bg-black bg-opacity-50 text-white mb-1"
                          >
                            {mood.intensity ? `Intensity: ${Math.round(mood.intensity * 100)}%` : 'Medium Intensity'}
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-gray-300 mb-3">
                          {getMoodMessage(mood.mood)}
                        </p>
                        
                        {mood.track_name && (
                          <div className="flex items-center mt-2">
                            <div className="w-10 h-10 flex-shrink-0 bg-[#282828] rounded overflow-hidden">
                              <img 
                                src={mood.track_image || '/placeholder-track.png'} 
                                alt={mood.track_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="ml-3 min-w-0">
                              <div className="text-sm font-medium truncate">{mood.track_name}</div>
                              <div className="text-xs text-gray-400 truncate">{mood.artist_name || 'Various Artists'}</div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-3 text-xs text-gray-400">
                          <Link href={`/user/${mood.user_id}`} className="hover:underline">
                            Created by {mood.username || 'a user'}
                          </Link>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  return color
    .replace(/^#/, '')
    .replace(/(..)/g, (str) => {
      const num = Math.min(255, Math.max(0, parseInt(str, 16) + amount));
      return num.toString(16).padStart(2, '0');
    });
} 