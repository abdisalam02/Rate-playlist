'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';

interface Mood {
  id?: string;
  mood?: string;
  mood_name?: string;
  color?: string;
  intensity?: number;
  track_name?: string;
  track_image?: string;
  artist_name?: string;
}

export default function UserMoodsPage() {
  const params = useParams();
  const userId = params.userId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [userName, setUserName] = useState('User');
  
  useEffect(() => {
    const fetchUserMoods = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile to get name
        const userRes = await fetch(`/api/users/${userId}`, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.profile && userData.profile.display_name) {
            setUserName(userData.profile.display_name);
          }
        }
        
        // Fetch user moods
        const res = await fetch(`/api/users/${userId}/moods`, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch moods: ${res.status}`);
        }
        
        const data = await res.json();
        setMoods(data.moods || []);
      } catch (err: any) {
        console.error('Error fetching user moods:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserMoods();
  }, [userId]);
  
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
            <Link href={`/user/${userId}`} className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:bg-opacity-90">
              Back to Profile
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
          <Link href={`/user/${userId}`} className="text-gray-400 hover:text-white mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">{userName}'s Music Moods</h1>
        </div>
        
        {moods.length === 0 ? (
          <div className="text-center py-12 bg-[#181818] rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-gray-400 mb-2">No moods found for this user.</p>
            <p className="text-sm text-[#1DB954]">
              Moods will appear here when the user starts creating them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {moods.map((mood, index) => (
              <Link 
                key={mood.id || `mood-${index}`} 
                href={`/user/${userId}/moods/${encodeURIComponent(mood.mood || mood.mood_name)}`}
                className="relative overflow-hidden bg-[#181818] rounded-lg transition-transform hover:scale-[1.02] group"
              >
                <div 
                  className="h-32 bg-gradient-to-br"
                  style={{ 
                    backgroundImage: `linear-gradient(to bottom right, ${mood.color || '#1DB954'}, ${mood.color ? adjustColor(mood.color, -30) : '#0A6E31'})`
                  }}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white">{mood.mood || mood.mood_name}</h3>
                    <div 
                      className="text-xs rounded-full px-2 py-0.5 inline-block bg-black bg-opacity-50 text-white mb-1"
                    >
                      {mood.intensity ? `Intensity: ${Math.round(mood.intensity * 100)}%` : 'Medium Intensity'}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-300 mb-3">
                    {getMoodMessage(mood.mood || mood.mood_name)}
                  </p>
                  
                  {mood.track_name && (
                    <div className="flex items-center mt-2">
                      <div className="w-10 h-10 flex-shrink-0 bg-[#282828] rounded overflow-hidden">
                        <Image 
                          src={mood.track_image || getSampleTrackImage(mood.mood || mood.mood_name)} 
                          alt={mood.track_name || 'Track image'}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-3 min-w-0">
                        <div className="text-sm font-medium truncate">{mood.track_name}</div>
                        <div className="text-xs text-gray-400 truncate">{mood.artist_name || 'Various Artists'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function adjustColor(color: string | undefined, amount: number): string {
  if (!color) return '#1DB954';
  
  return color
    .replace(/^#/, '')
    .replace(/(..)/g, (str) => {
      const num = Math.min(255, Math.max(0, parseInt(str, 16) + amount));
      return num.toString(16).padStart(2, '0');
    });
}

function getSampleTrackImage(mood: string | undefined): string {
  if (!mood) return 'https://i.scdn.co/image/ab67616d0000b273d6d79dd1ef5d83658889873c';
  
  const moodImages: {[key: string]: string} = {
    'Chill': 'https://i.scdn.co/image/ab67616d0000b2734e40d154b19c07fff7e13c92',
    'Energetic': 'https://i.scdn.co/image/ab67616d0000b273bca00ddcd5e1e28888433142',
    'Happy': 'https://i.scdn.co/image/ab67616d0000b273e747c2b16ba58a8dc27bad7e',
    'Sad': 'https://i.scdn.co/image/ab67616d0000b2734cba0568a0c574a1aa0effca',
    'Focused': 'https://i.scdn.co/image/ab67616d0000b273d1f61d1cab994144c67045ed'
  };
  
  const normalizedMood = mood.toLowerCase();
  for (const [key, url] of Object.entries(moodImages)) {
    if (normalizedMood.includes(key.toLowerCase())) {
      return url;
    }
  }
  return 'https://i.scdn.co/image/ab67616d0000b273d6d79dd1ef5d83658889873c';
}

function getMoodMessage(mood: string | undefined): string {
  if (!mood) return 'Curated music for this specific vibe';
  
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
} 