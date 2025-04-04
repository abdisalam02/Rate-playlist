'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';

export default function MoodPage() {
  const params = useParams();
  const moodName = params.moodName as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moodData, setMoodData] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [similarMoods, setSimilarMoods] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchMoodData = async () => {
      try {
        setLoading(true);
        
        // Fetch all moods to find this specific mood and similar ones
        const moodsRes = await fetch('/api/moods?limit=50', {
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
          (m.mood || '').toLowerCase() === decodedMoodName.toLowerCase()
        );
        
        if (!matchedMood) {
          throw new Error('Mood not found');
        }
        
        setMoodData(matchedMood);
        
        // Find similar moods (moods with a partially matching name)
        const similar = moodsData.moods
          .filter((m: any) => 
            m.id !== matchedMood.id && 
            (m.mood || '').toLowerCase().includes(decodedMoodName.toLowerCase().split(' ')[0])
          )
          .slice(0, 5); // Get up to 5 similar moods
          
        setSimilarMoods(similar);
        
        // Fetch tracks for this mood from Spotify API or from database
        try {
          // Try to get tracks from the database based on this mood name
          const tracksRes = await fetch(`/api/moods/${encodeURIComponent(decodedMoodName)}/tracks`, {
            credentials: 'include',
            cache: 'no-store'
          });
          
          if (tracksRes.ok) {
            const tracksData = await tracksRes.json();
            if (tracksData.tracks && tracksData.tracks.length > 0) {
              setTracks(tracksData.tracks);
            } else {
              // If no results, try to get recommendations from Spotify
              await fetchSpotifyRecommendations(decodedMoodName);
            }
          } else {
            // If the API route doesn't exist or fails, try to get recommendations from Spotify
            await fetchSpotifyRecommendations(decodedMoodName);
          }
        } catch (err) {
          console.error('Error fetching mood tracks:', err);
          await fetchSpotifyRecommendations(decodedMoodName);
        }
      } catch (err: any) {
        console.error('Error fetching mood data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // Helper function to fetch recommendations from Spotify
    const fetchSpotifyRecommendations = async (mood: string) => {
      try {
        // Try to get recommendations based on mood from the Spotify API
        const recommendationsRes = await fetch(`/api/spotify/recommendations?seed_genres=${encodeURIComponent(mood.toLowerCase())}&limit=15`, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (recommendationsRes.ok) {
          const recommendationsData = await recommendationsRes.json();
          if (recommendationsData.tracks && recommendationsData.tracks.length > 0) {
            setTracks(recommendationsData.tracks);
          } else {
            // If no results, fetch samples
            setTracks(getSampleTracksForMood(mood));
          }
        } else {
          // Fallback to sample tracks
          setTracks(getSampleTracksForMood(mood));
        }
      } catch (err) {
        console.error('Error fetching mood recommendations:', err);
        setTracks(getSampleTracksForMood(mood));
      }
    };
    
    if (moodName) {
      fetchMoodData();
    }
  }, [moodName]);
  
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
  
  if (error || !moodData) {
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
            <Link href="/moods" className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full hover:bg-opacity-90">
              Back to Moods
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const moodTitle = moodData.mood;
  const moodColor = moodData.color || '#1DB954';
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <Navbar />
      
      <div 
        className="pt-16 pb-20 px-4 bg-gradient-to-b"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, ${moodColor}80, ${moodColor}20, transparent)` 
        }}
      >
        <div className="container mx-auto pt-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Link href="/moods" className="flex items-center text-white hover:text-[#1DB954] mb-4 md:mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Moods</span>
            </Link>
          </div>
          
          <div className="mt-6 md:mt-10 flex flex-col md:flex-row items-center gap-8">
            <div 
              className="w-48 h-48 rounded-lg shadow-2xl flex items-center justify-center"
              style={{ backgroundColor: moodColor }}
            >
              {moodData.track_image ? (
                <img 
                  src={moodData.track_image} 
                  alt={moodTitle}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              )}
            </div>
            
            <div className="text-center md:text-left">
              <div className="text-sm font-bold uppercase tracking-wider mb-2">MOOD</div>
              <h1 className="text-5xl font-bold mb-4">{moodTitle}</h1>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span 
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ 
                    backgroundColor: `${moodColor}80`,
                    color: 'white'
                  }}
                >
                  {moodData.intensity ? `Intensity: ${Math.round(moodData.intensity * 100)}%` : 'Medium Intensity'}
                </span>
                
                {moodData.track_name && (
                  <>
                    <span className="text-white opacity-60">•</span>
                    <span className="text-white opacity-80">{moodData.track_name} by {moodData.artist_name}</span>
                  </>
                )}
              </div>
              <p className="text-white opacity-80 max-w-2xl">
                {moodData.description || getMoodDescription(moodTitle)}
              </p>
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
                <div 
                  key={track.id || `track-${index}`}
                  className="relative border-b border-[#282828] last:border-b-0 hover:bg-[#282828] transition-colors p-4 flex items-center"
                >
                  <div className="w-10 text-center text-gray-400 mr-4">{index + 1}</div>
                  
                  <Link 
                    href={`/track/${track.id}`}
                    className="flex-shrink-0 w-12 h-12 mr-4 relative group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <img 
                      src={track.album?.images?.[0]?.url || '/placeholder-track.png'} 
                      alt={track.name}
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center transition-opacity">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </Link>
                  
                  <div className="min-w-0 flex-1">
                    <Link 
                      href={`/track/${track.id}`}
                      className="font-medium truncate block hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {track.name}
                    </Link>
                    <div className="text-sm text-gray-400 truncate">
                      {track.artists?.map((artist: any) => artist.name).join(', ')}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 text-right ml-4 hidden md:block">
                    {formatDuration(track.duration_ms)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {similarMoods.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Similar Moods</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {similarMoods.map((mood, index) => (
                <Link 
                  key={`similar-${index}`}
                  href={`/moods/${encodeURIComponent(mood.mood)}`}
                  className="bg-[#181818] rounded-lg p-4 hover:bg-[#282828] transition-colors"
                  style={{ borderLeft: `4px solid ${mood.color}` }}
                >
                  <h3 className="font-bold mb-2">{mood.mood}</h3>
                  <div 
                    className="text-xs rounded-full px-2 py-0.5 inline-block mb-2"
                    style={{ 
                      backgroundColor: `${mood.color}80`,
                      color: 'white'
                    }}
                  >
                    Similar Mood
                  </div>
                  
                  {mood.track_name && (
                    <div className="flex items-center mt-2">
                      <div className="w-8 h-8 flex-shrink-0 bg-[#282828] rounded overflow-hidden">
                        <img 
                          src={mood.track_image || '/placeholder-track.png'} 
                          alt={mood.track_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-2 min-w-0">
                        <div className="text-xs font-medium truncate">{mood.track_name}</div>
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
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