'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';

export default function MoodPage() {
  const params = useParams();
  const userId = params.userId as string;
  const moodName = params.moodName as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [userName, setUserName] = useState('User');
  const [similarMoods, setSimilarMoods] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchMoodData = async () => {
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
        const moodsRes = await fetch(`/api/users/${userId}/moods`, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!moodsRes.ok) {
          throw new Error(`Failed to fetch moods: ${moodsRes.status}`);
        }
        
        const moodsData = await moodsRes.json();
        const decodedMoodName = decodeURIComponent(moodName);
        
        // Find the specific mood
        const matchedMood = moodsData.moods.find((m: any) => 
          (m.mood || m.mood_name || '').toLowerCase() === decodedMoodName.toLowerCase()
        );
        
        if (!matchedMood) {
          throw new Error('Mood not found');
        }
        
        setMood(matchedMood);
        
        // Find similar moods from the same user (excluding current mood)
        const otherMoods = moodsData.moods.filter((m: any) => 
          (m.mood || m.mood_name || '').toLowerCase() !== decodedMoodName.toLowerCase()
        );
        
        // Limit to 4 similar moods
        setSimilarMoods(otherMoods.slice(0, 4));
        
        // Fetch recommended tracks for this mood
        try {
          // Try to get recommendations based on mood from the Spotify API
          const recommendationsRes = await fetch(`/api/spotify/recommendations?seed_genres=${encodeURIComponent(decodedMoodName.toLowerCase())}&limit=10`, {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (recommendationsRes.ok) {
            const recommendationsData = await recommendationsRes.json();
            if (recommendationsData.tracks && recommendationsData.tracks.length > 0) {
              setTracks(recommendationsData.tracks);
            } else {
              // If no results, fetch samples
              setTracks(getSampleTracksForMood(decodedMoodName));
            }
          } else {
            // Fallback to sample tracks
            setTracks(getSampleTracksForMood(decodedMoodName));
          }
        } catch (recError) {
          console.error('Error fetching mood recommendations:', recError);
          setTracks(getSampleTracksForMood(decodedMoodName));
        }
      } catch (err: any) {
        console.error('Error fetching mood data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId && moodName) {
      fetchMoodData();
    }
  }, [userId, moodName]);
  
  // Function to get sample tracks for a specific mood
  const getSampleTracksForMood = (mood: string) => {
    const normalizedMood = mood.toLowerCase();
    
    // Default tracks (will be used if no specific mood matches)
    const defaultTracks = [
      {
        id: '4iV5W9uYEdYUVa79Axb7Rh',
        name: 'Starboy',
        artists: [{ name: 'The Weeknd' }, { name: 'Daft Punk' }],
        album: { 
          name: 'Starboy',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452' }] 
        },
        duration_ms: 230453
      },
      {
        id: '7qiZfU4dY1lWllzX7mPBI3',
        name: 'Shape of You',
        artists: [{ name: 'Ed Sheeran' }],
        album: { 
          name: 'Divide',
          images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96' }] 
        },
        duration_ms: 233713
      }
    ];
    
    // Mood-specific tracks
    const moodTracks: {[key: string]: any[]} = {
      'chill': [
        {
          id: '0bYg9bo50gSsH3LtXe2SQn',
          name: 'All I Need',
          artists: [{ name: 'Radiohead' }],
          album: { 
            name: 'In Rainbows',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c5e994a54d93877da606a9bc' }] 
          },
          duration_ms: 228293
        },
        {
          id: '1eVdLq9H4EQ10Hn5l0Y1JP',
          name: 'Nights',
          artists: [{ name: 'Frank Ocean' }],
          album: { 
            name: 'Blonde',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2737004645168bbae16b5c043ad' }] 
          },
          duration_ms: 305280
        }
      ],
      'energetic': [
        {
          id: '5hTpnNvgxAQo56EtETG7uU',
          name: 'Blinding Lights',
          artists: [{ name: 'The Weeknd' }],
          album: { 
            name: 'After Hours',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36' }] 
          },
          duration_ms: 200040
        },
        {
          id: '6DCZcSspjsKoFjzjrWoCdn',
          name: "God's Plan",
          artists: [{ name: 'Drake' }],
          album: { 
            name: 'Scorpion',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2739416ed64daf84936d89e671c' }] 
          },
          duration_ms: 198973
        }
      ],
      'happy': [
        {
          id: '3MZsBdqDrRTJihTHQrO6Dq',
          name: 'Levitating',
          artists: [{ name: 'Dua Lipa' }, { name: 'DaBaby' }],
          album: { 
            name: 'Future Nostalgia (The Moonlight Edition)',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2739e495fb707973f3390850eea' }] 
          },
          duration_ms: 203064
        },
        {
          id: '4j3VX80C4KhAa0w8CpV2Co',
          name: 'Uptown Funk',
          artists: [{ name: 'Mark Ronson' }, { name: 'Bruno Mars' }],
          album: { 
            name: 'Uptown Special',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b2737794d7a2a82522a04f3a38de' }] 
          },
          duration_ms: 270213
        }
      ],
      'sad': [
        {
          id: '1XIkAtmAGzP4eRb9Q35cJT',
          name: 'All I Want',
          artists: [{ name: 'Kodaline' }],
          album: { 
            name: 'In A Perfect World',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273c3408d9a01c177c7d8f41126' }] 
          },
          duration_ms: 307435
        },
        {
          id: '4RCWB3V8V0dignt99LZ8vH',
          name: 'Let It Go',
          artists: [{ name: 'James Bay' }],
          album: { 
            name: 'Chaos And The Calm',
            images: [{ url: 'https://i.scdn.co/image/ab67616d0000b273d301758907a5cb8506164761' }] 
          },
          duration_ms: 250546
        }
      ]
    };
    
    // Check for mood matches
    for (const [key, tracks] of Object.entries(moodTracks)) {
      if (normalizedMood.includes(key)) {
        return tracks;
      }
    }
    
    // Return default tracks if no match
    return defaultTracks;
  };
  
  // Function to get a description based on the mood name
  const getMoodDescription = (mood: string) => {
    const normalizedMood = mood.toLowerCase();
    
    const descriptions: {[key: string]: string} = {
      'chill': 'Relaxed, laid-back vibes for unwinding and creating a peaceful atmosphere.',
      'energetic': 'Upbeat, high-energy tracks that get you moving and boost your motivation.',
      'happy': 'Feel-good music that lifts your spirits and brings positive energy.',
      'sad': 'Emotional tracks that help you process feelings and connect with deeper emotions.',
      'focused': 'Music designed to enhance concentration and productivity without distraction.',
      'romantic': 'Intimate sounds perfect for special moments and setting a loving atmosphere.',
      'nostalgic': 'Tracks that take you back in time and evoke warm memories.',
      'angry': 'Intense music that helps channel frustration and powerful emotions.'
    };
    
    for (const [key, description] of Object.entries(descriptions)) {
      if (normalizedMood.includes(key)) {
        return description;
      }
    }
    
    return 'A curated selection of music matching this specific vibe and emotional state.';
  };
  
  // Extract image URLs from tracks for the moodboard
  const getMoodboardImages = () => {
    if (!tracks || tracks.length === 0) return [];
    
    return tracks
      .filter(track => track.album?.images?.[0]?.url)
      .map(track => track.album.images[0].url)
      .slice(0, 8); // Limit to 8 images
  };
  
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
  
  if (error || !mood) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-12 pt-20">
          <div className="max-w-md mx-auto bg-[#181818] p-6 rounded-lg text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Mood Not Found</h2>
            <p className="text-[#B3B3B3] mb-6">{error}</p>
            <Link href={`/user/${userId}/moods`} className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:bg-opacity-90">
              Back to Moods
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const moodTitle = mood.mood || mood.mood_name;
  const moodColor = mood.color || '#1DB954';
  const moodboardImages = getMoodboardImages();
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      {/* Moodboard Background */}
      <div className="relative">
        {/* Track Images Moodboard */}
        <div className="absolute inset-0 overflow-hidden opacity-20 flex flex-wrap">
          {moodboardImages.map((image, index) => (
            <div key={`moodboard-${index}`} className="w-1/4 h-1/2 overflow-hidden">
              <img 
                src={image} 
                alt="" 
                className="w-full h-full object-cover filter blur-sm"
              />
            </div>
          ))}
          {/* If no track images, show color blocks */}
          {moodboardImages.length === 0 && (
            <>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, 30) }}></div>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, -20) }}></div>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, 50) }}></div>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, -40) }}></div>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, -10) }}></div>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, 40) }}></div>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, -30) }}></div>
              <div className="w-1/4 h-1/2" style={{ backgroundColor: adjustColor(moodColor, 20) }}></div>
            </>
          )}
        </div>
        
        {/* Gradient overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-b"
          style={{ 
            backgroundImage: `linear-gradient(to bottom, ${moodColor}90, ${moodColor}60, rgba(18, 18, 18, 0.95))` 
          }}
        ></div>
        
        {/* Content */}
        <div className="relative pt-28 pb-20 px-4">
          <div className="container mx-auto pt-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Link href={`/user/${userId}/moods`} className="flex items-center text-white hover:text-[#1DB954] mb-4 md:mb-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Moods</span>
              </Link>
            </div>
            
            <div className="mt-6 md:mt-10 flex flex-col md:flex-row items-center gap-8">
              <div 
                className="w-48 h-48 rounded-lg shadow-2xl flex items-center justify-center backdrop-blur-lg"
                style={{ backgroundColor: `${moodColor}80` }}
              >
                {mood.track_image ? (
                  <img 
                    src={mood.track_image} 
                    alt={moodTitle}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                )}
              </div>
              
              <div className="text-center md:text-left text-white">
                <div className="text-sm font-bold uppercase tracking-wider mb-2">MOOD</div>
                <h1 className="text-5xl font-bold mb-4">{moodTitle}</h1>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <Link href={`/user/${userId}`} className="text-white opacity-80 hover:opacity-100 hover:underline flex items-center">
                    {userName}
                  </Link>
                  <span className="text-white opacity-60">•</span>
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{ 
                      backgroundColor: `${moodColor}95`,
                      color: 'white'
                    }}
                  >
                    {mood.intensity ? `Intensity: ${Math.round(mood.intensity * 100)}%` : 'Medium Intensity'}
                  </span>
                </div>
                <p className="text-white opacity-80 max-w-2xl">
                  {mood.description || getMoodDescription(moodTitle)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Tracks for This Mood</h2>
          
          {tracks.length === 0 ? (
            <div className="text-center py-12 bg-[#181818] rounded-lg">
              <p className="text-gray-400">No tracks found for this mood.</p>
            </div>
          ) : (
            <div className="bg-[#181818] rounded-lg overflow-hidden">
              {tracks.map((track, index) => (
                <Link 
                  key={track.id || `track-${index}`}
                  href={`/track/${track.id}`}
                  className="flex items-center p-4 hover:bg-[#282828] border-b border-[#282828] last:border-b-0 transition-colors"
                >
                  <div className="w-10 text-center text-gray-400 mr-4">{index + 1}</div>
                  <div className="flex-shrink-0 w-12 h-12 mr-4">
                    <img 
                      src={track.album?.images?.[0]?.url || '/placeholder-track.png'} 
                      alt={track.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{track.name}</div>
                    <div className="text-sm text-gray-400 truncate">
                      {track.artists?.map((artist: any) => artist.name).join(', ')}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 text-right ml-4 hidden md:block">
                    {formatDuration(track.duration_ms)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Similar Moods</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {similarMoods.length > 0 ? (
              similarMoods.map((similarMood, index) => {
                const moodName = similarMood.mood || similarMood.mood_name;
                const moodUrlName = encodeURIComponent(moodName || 'unknown-mood');
                const moodColorValue = similarMood.color || '#1DB954';
                
                return (
                  <Link
                    key={`similar-${index}`}
                    href={`/user/${userId}/moods/${moodUrlName}`}
                  >
                    <div 
                      className="bg-[#181818] rounded-lg p-4 hover:bg-[#282828] transition-colors cursor-pointer"
                      style={{ borderLeft: `4px solid ${moodColorValue}` }}
                    >
                      <h3 className="font-bold mb-2">{moodName}</h3>
                      <div 
                        className="text-xs rounded-full px-2 py-0.5 inline-block mb-2"
                        style={{ 
                          backgroundColor: `${moodColorValue}80`,
                          color: 'white'
                        }}
                      >
                        Similar Mood
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              // If no similar moods, show generated ones based on current mood
              Array.from({ length: 4 }).map((_, index) => {
                const generatedMoods = [
                  { name: `${moodTitle} Mix`, color: adjustColor(moodColor, 30) },
                  { name: `Deep ${moodTitle}`, color: adjustColor(moodColor, -30) },
                  { name: `${moodTitle} Vibes`, color: adjustColor(moodColor, 60) },
                  { name: `${moodTitle} Focus`, color: adjustColor(moodColor, -60) }
                ];
                
                return (
                  <div 
                    key={`similar-${index}`}
                    className="bg-[#181818] rounded-lg p-4 hover:bg-[#282828] transition-colors cursor-pointer"
                    style={{ borderLeft: `4px solid ${generatedMoods[index].color}` }}
                  >
                    <h3 className="font-bold mb-2">{generatedMoods[index].name}</h3>
                    <div 
                      className="text-xs rounded-full px-2 py-0.5 inline-block mb-2"
                      style={{ 
                        backgroundColor: `${generatedMoods[index].color}80`,
                        color: 'white'
                      }}
                    >
                      Generated Mood
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function adjustColor(color: string, amount: number): string {
  return color
    .replace(/^#/, '')
    .replace(/(..)/g, (str) => {
      const num = Math.min(255, Math.max(0, parseInt(str, 16) + amount));
      return num.toString(16).padStart(2, '0');
    });
} 