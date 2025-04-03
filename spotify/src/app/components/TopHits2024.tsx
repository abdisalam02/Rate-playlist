'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useVelocity, useSpring } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useInView } from 'react-intersection-observer';

interface Artist {
  id: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
  images: Array<{ url: string; height: number; width: number }>;
}

interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: Album;
  preview_url?: string;
  duration_ms: number;
  popularity: number;
}

interface TopHits2024Props {
  playlistTitle: string;
  playlistImage?: string;
  playlistDescription?: string;
}

const ParallaxText = ({ children, baseVelocity = 100 }: { children: React.ReactNode; baseVelocity?: number }) => {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });
  
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false
  });
  
  const x = useTransform(baseX, (v) => `${v}px`);
  
  const directionFactor = useRef<number>(1);
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const toggleDirection = () => {
      directionFactor.current = -directionFactor.current;
      timeoutId = setTimeout(toggleDirection, 4000);
    };
    
    timeoutId = setTimeout(toggleDirection, 4000);
    return () => clearTimeout(timeoutId);
  }, []);
  
  useEffect(() => {
    let prev = 0;
    let animate = () => {
      const time = Date.now();
      const delta = (time - prev) / 1000;
      prev = time;
      
      baseX.set(baseX.get() + directionFactor.current * baseVelocity * delta);
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(0);
    };
  }, [baseVelocity, baseX]);
  
  return (
    <div className="parallax overflow-hidden m-0 whitespace-nowrap flex flex-nowrap">
      <motion.div className="scroller flex whitespace-nowrap" style={{ x }}>
        {children}
        {children}
      </motion.div>
    </div>
  );
};

const TopHits2024 = forwardRef<
  { playlistId: string }, 
  TopHits2024Props
>(({ playlistTitle, playlistImage, playlistDescription }, ref) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlistId, setPlaylistId] = useState("37i9dQZF1DX1mV82YfYGfj"); // Default playlist ID

  // Expose the playlistId property to the parent component via ref
  useImperativeHandle(ref, () => ({
    get playlistId() {
      return playlistId;
    },
    set playlistId(id: string) {
      setPlaylistId(id);
    }
  }));
  
  useEffect(() => {
    async function fetchTopHits() {
      try {
        setLoading(true);
        const response = await fetch(`/api/spotify/playlist/${playlistId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch playlist');
        }
        
        const data = await response.json();
        
        if (data.tracks && data.tracks.items) {
          // Extract the tracks from the playlist items
          const extractedTracks = data.tracks.items
            .map((item: any) => item.track)
            .filter((track: any) => track && track.id); // Filter out any null tracks
          
          setTracks(extractedTracks.slice(0, 10));
        }
      } catch (error) {
        console.error('Error fetching top hits:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTopHits();
  }, [playlistId]);
  
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  
  const { ref: sectionRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  const playTrack = (track: Track) => {
    if (!track.preview_url) return;
    
    if (audioRef.current) {
      if (playingTrackId === track.id) {
        // Toggle play/pause for current track
        if (audioRef.current.paused) {
          audioRef.current.play()
            .catch(err => console.error("Error playing track:", err));
        } else {
          audioRef.current.pause();
          setPlayingTrackId(null);
        }
      } else {
        // Play a new track
        audioRef.current.src = track.preview_url;
        audioRef.current.play()
          .then(() => setPlayingTrackId(track.id))
          .catch(err => console.error("Error playing track:", err));
      }
    }
  };
  
  const handleAudioEnded = () => {
    setPlayingTrackId(null);
  };
  
  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }
  
  if (tracks.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <p>No tracks found</p>
      </div>
    );
  }
  
  return (
    <section ref={sectionRef} className="bg-gradient-to-b from-black/50 to-transparent py-10 overflow-hidden mb-16 relative">
      <audio 
        ref={audioRef}
        onEnded={handleAudioEnded}
        className="hidden"
      />
      
      {/* Blurred background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {tracks.slice(0, 3).map((track, i) => (
          <div 
            key={track.id} 
            className="absolute blur-3xl opacity-25"
            style={{
              top: `${20 + i * 40}%`,
              left: `${10 + i * 30}%`,
              width: '200px',
              height: '200px',
              backgroundColor: '#1DB954',
              borderRadius: '50%',
              transform: `scale(${1 + i * 0.5})`,
            }}
          ></div>
        ))}
      </div>
      
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 mb-10">
          {playlistImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6 }}
              className="relative w-64 h-64 rounded-lg overflow-hidden shadow-xl shrink-0"
            >
              <Image
                src={playlistImage}
                alt={playlistTitle}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 256px, 256px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-2xl font-bold text-white drop-shadow-md">{playlistTitle}</h3>
              </div>
            </motion.div>
          )}
          
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-center lg:text-left bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-teal-400">
                {playlistTitle || "Top Hits of 2024"}
              </h2>
              
              {playlistDescription && (
                <p className="text-gray-300 mb-6 max-w-2xl text-center lg:text-left">
                  {playlistDescription}
                </p>
              )}
              
              <div className="hidden md:block">
                <ParallaxText baseVelocity={5}>
                  <div className="flex items-center gap-3 px-4">
                    {tracks.map((track) => (
                      <span key={track.id} className="text-lg font-bold text-[#1DB954]/80 mx-2 whitespace-nowrap">
                        {track.name} • {track.artists.map(a => a.name).join(', ')} •
                      </span>
                    ))}
                  </div>
                </ParallaxText>
              </div>
            </motion.div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
          {tracks.slice(0, 6).map((track, index) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { 
                opacity: 1, 
                y: 0,
                transition: { duration: 0.5, delay: index * 0.1 }
              } : { opacity: 0, y: 20 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white/5 backdrop-blur-md rounded-xl overflow-hidden group hover:bg-white/10 transition-all duration-300"
            >
              <div className="flex p-3">
                <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden mr-3">
                  <Image
                    src={track.album.images[0]?.url || '/placeholder-album.png'}
                    alt={track.name}
                    fill
                    className="object-cover rounded-lg hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-album.png";
                    }}
                  />
                  
                  {track.preview_url && (
                    <button
                      onClick={() => playTrack(track)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      {playingTrackId === track.id ? (
                        <svg className="w-8 h-8 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
                        </svg>
                      ) : (
                        <svg className="w-8 h-8 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"></path>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <Link href={`/track/${track.id}`} className="block hover:text-[#1DB954] transition-colors">
                    <h3 className="font-bold text-sm truncate mb-1">{track.name}</h3>
                  </Link>
                  
                  <p className="text-gray-400 text-xs truncate">
                    {track.artists.map((artist) => artist.name).join(', ')}
                  </p>
                  
                  <div className="flex items-center mt-2 text-xs">
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-[#1DB954] h-1.5 rounded-full" 
                        style={{ width: `${(track.popularity || 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-gray-400 ml-2 text-xs">{track.popularity}%</span>
                  </div>
                </div>
              </div>
              
              {index < 3 && (
                <div className="bg-[#1DB954]/10 px-3 py-1 flex items-center justify-center">
                  <span className="text-[#1DB954] text-xs font-bold">#{index + 1} TRENDING</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/discover/playlists/774kUuKDzLa8ieaSmi8IfS" className="inline-block bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] font-semibold px-6 py-2 rounded-full transition-colors">
            View Full Playlist
          </Link>
        </div>
      </div>
    </section>
  );
});

export default TopHits2024; 