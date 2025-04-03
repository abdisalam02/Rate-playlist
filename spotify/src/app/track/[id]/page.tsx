'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Track {
  id: string;
  name: string;
  preview_url: string | null;
  artists: { name: string }[];
  album?: { 
    id?: string;
    images: { url: string }[];
    name?: string;
    release_date?: string;
  };
  duration_ms?: number;
  explicit?: boolean;
  external_urls?: {
    spotify?: string;
  };
  requires_auth?: boolean;
}

interface UserRating {
  id: string;
  userId: string;
  userName?: string;
  userImage?: string;
  rating: number;
  review?: string;
  createdAt: string;
}

// Star rating component
interface StarRatingProps {
  rating: number;
  onChange: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, readonly = false, size = 'md' }) => {
  // Calculate full and half stars out of 5 stars
  const fullStars = Math.floor(rating / 2);
  const hasHalfStar = rating % 2 !== 0;
  
  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  // Handle star click
  const handleStarClick = (index: number) => {
    if (readonly) return;
    // Convert to rating out of 10 (2 * index + 2)
    onChange((index + 1) * 2);
  };
  
  // Handle double click for half stars
  const handleStarDoubleClick = (index: number) => {
    if (readonly) return;
    // Convert to rating out of 10 (2 * index + 1)
    onChange(index * 2 + 1);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <div 
            key={index}
            onClick={() => handleStarClick(index)}
            onDoubleClick={() => handleStarDoubleClick(index)}
            className={`${!readonly ? 'cursor-pointer hover:scale-110' : ''} transition-transform px-0.5 relative`}
            title={readonly ? '' : `${index + 1} star${index !== 0 ? 's' : ''}`}
          >
            {index < fullStars ? (
              // Full star
              <svg 
                className={`${sizeClasses[size]} text-yellow-400 fill-current transition-colors duration-200`} 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ) : index === fullStars && hasHalfStar ? (
              // Half star - improved visibility with overlay approach
              <div className="relative">
                <svg 
                  className={`${sizeClasses[size]} text-gray-400`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <svg 
                    className={`${sizeClasses[size]} text-yellow-400 fill-current`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
              </div>
            ) : (
              // Empty star
              <svg 
                className={`${sizeClasses[size]} text-gray-400`} 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.5"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            )}
          </div>
        ))}
        {rating > 0 && <span className="ml-2 text-sm font-medium text-yellow-400">{(rating / 2).toFixed(1)}</span>}
      </div>
      {!readonly && (
        <p className="text-xs text-gray-400 mt-1">
          Click for full stars, double-click for half stars
        </p>
      )}
    </div>
  );
};

// Music wave animation for the playing track
function MusicWaveIndicator() {
  return (
    <div className="flex space-x-1 items-end h-6">
      <div className="w-1 bg-[#1DB954] rounded-full h-4 animate-music-wave-1"></div>
      <div className="w-1 bg-[#1DB954] rounded-full h-6 animate-music-wave-2"></div>
      <div className="w-1 bg-[#1DB954] rounded-full h-8 animate-music-wave-3"></div>
      <div className="w-1 bg-[#1DB954] rounded-full h-4 animate-music-wave-4"></div>
      <div className="w-1 bg-[#1DB954] rounded-full h-6 animate-music-wave-5"></div>
    </div>
  );
}

// Toast notification component
interface SuccessToastProps {
  message: string;
}

function SuccessToast({ message }: SuccessToastProps) {
  return (
    <div className="fixed top-20 right-4 bg-[#1DB954] text-black px-4 py-3 rounded-lg shadow-lg animate-fade-in-out z-50 flex items-center">
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span className="font-medium">{message}</span>
    </div>
  );
}

// New User Rating Display component for community reviews
interface UserRatingItemProps {
  rating: UserRating;
}

const UserRatingItem = ({ rating }: UserRatingItemProps) => {
  // Convert to 5 star scale for display
  const displayRating = rating.rating;
  const fullStars = Math.floor(displayRating / 2);
  const hasHalfStar = displayRating % 2 !== 0;
  
  return (
    <div className="bg-[#282828] p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {rating.userImage ? (
            <img 
              src={rating.userImage} 
              alt={rating.userName || 'User'} 
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white">
              {rating.userName && rating.userName.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <span className="font-medium text-white">{rating.userName || 'User'}</span>
        </div>
        <div className="flex">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="text-yellow-400">
              {index < fullStars ? (
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ) : index === fullStars && hasHalfStar ? (
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  <path d="M12 17.27V5" style={{ stroke: '#1f2937', strokeWidth: 6 }} />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
      {rating.review && (
        <p className="text-gray-300 mt-2">{rating.review}</p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        {new Date(rating.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
};

export default function TrackDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // State for track data
  const [track, setTrack] = useState<Track | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communityRatings, setCommunityRatings] = useState<UserRating[]>([]);
  
  const audioRef = useState(null)[1];
  
  // Fetch track data
  useEffect(() => {
    if (!id) return;
    
    const fetchTrackData = async () => {
      try {
        setLoading(true);
        
        // Use the existing tracks API endpoint instead of the non-existent spotify/track endpoint
        const trackRes = await fetch(`/api/tracks/${id}`);
        if (!trackRes.ok) {
          throw new Error("Failed to fetch track data");
        }
        
        const trackData = await trackRes.json();
        setTrack(trackData);
        
        // Fetch user's rating if logged in
        if (session && session.user && session.user.id) {
          const userRatingRes = await fetch(`/api/ratings?itemId=${id}&type=track`);
          if (userRatingRes.ok) {
            const userRatingData = await userRatingRes.json();
            if (userRatingData.rating) {
              // Convert from API scale (0-5) to UI scale (0-10)
              setUserRating(userRatingData.rating * 2);
              setUserReview(userRatingData.review || '');
            }
          }
          
          // Fetch favorite status
          const favoriteRes = await fetch(`/api/check-favorite?itemId=${id}&itemType=track`);
          if (favoriteRes.ok) {
            const favoriteData = await favoriteRes.json();
            setIsFavorite(favoriteData.isFavorite);
          }
        }
        
        // Fetch community ratings
        const ratingsRes = await fetch(`/api/ratings/average?itemId=${id}&itemType=track`);
        if (ratingsRes.ok) {
          const ratingsData = await ratingsRes.json();
          // Convert from API scale (0-5) to UI scale (0-10)
          setAverageRating(ratingsData.average ? ratingsData.average * 2 : 0);
          setRatingCount(ratingsData.count || 0);
        }
        
        // Get community ratings
        const commRatingsRes = await fetch(`/api/ratings/item?itemId=${id}&itemType=track&limit=10`);
        if (commRatingsRes.ok) {
          const ratingsData = await commRatingsRes.json();
          // Convert community ratings from API scale (0-5) to UI scale (0-10)
          const convertedRatings: UserRating[] = (ratingsData.ratings || []).map((rating: UserRating) => ({
            ...rating,
            rating: rating.rating * 2 // Convert from 0-5 to 0-10 scale
          }));
          setCommunityRatings(convertedRatings);
        }
        
      } catch (error) {
        console.error("Error:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrackData();
  }, [id, session]);
  
  // Submit rating and review
  const handleRatingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!session) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Submitting rating with session:", !!session, "User ID:", session?.user?.id);
      
      // The userRating from the StarRating component is on a 0-10 scale
      // But the API expects a 0-5 scale, so we need to convert it
      if (typeof userRating !== 'number' || userRating < 0 || userRating > 10) {
        throw new Error('Invalid rating value');
      }
      
      // Convert from 0-10 scale to 0-5 scale
      const apiRating = userRating / 2;
      
      console.log(`Converting rating from ${userRating} (0-10 scale) to ${apiRating} (0-5 scale)`);
      
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({
          itemId: id,
          itemType: 'track',
          rating: apiRating, // Send the converted rating to the API
          review: userReview
        }),
      });
      
      // Log response status for debugging
      console.log(`Rating submission status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || await response.text();
        console.error("Rating submission failed:", errorMessage);
        throw new Error(`Failed to submit rating: ${errorMessage}`);
      }
      
      // Update the UI
      const result = await response.json();
      console.log("Rating submitted:", result);
      
      // Show success message
      setSuccessMessage("Your rating has been saved!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Refresh average rating
      const avgResponse = await fetch(`/api/ratings/average?itemId=${id}&itemType=track`, {
        credentials: 'include'
      });
      
      if (avgResponse.ok) {
        const avgData = await avgResponse.json();
        // Convert from API scale (0-5) to UI scale (0-10)
        setAverageRating(avgData.average ? avgData.average * 2 : 0);
        setRatingCount(avgData.count || 0);
      }
      
      // Refresh community ratings
      const ratingsResponse = await fetch(`/api/ratings/item?itemId=${id}&itemType=track&limit=10`, {
        credentials: 'include'
      });
      
      if (ratingsResponse.ok) {
        const ratingsData = await ratingsResponse.json();
        // Convert community ratings from API scale (0-5) to UI scale (0-10)
        const convertedRatings: UserRating[] = (ratingsData.ratings || []).map((rating: UserRating) => ({
          ...rating,
          rating: rating.rating * 2 // Convert from 0-5 to 0-10 scale
        }));
        setCommunityRatings(convertedRatings);
      }
      
    } catch (err) {
      console.error("Error submitting rating:", err);
      alert("Failed to save rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle favorite status
  const toggleFavorite = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    
    try {
      if (isFavorite) {
        // Remove from favorites
        await fetch(`/api/favorites?itemId=${id}&itemType=track`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } else {
        // Add to favorites
        await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            itemId: id,
            itemType: 'track'
          }),
        });
      }
      
      // Toggle the UI state
      setIsFavorite(!isFavorite);
      
    } catch (err) {
      console.error("Error toggling favorite:", err);
      alert("Failed to update favorites. Please try again.");
    }
  };
  
  // Toggle play/pause
  const togglePlay = () => {
    const audioPlayer = document.getElementById('audioPlayer') as HTMLAudioElement | null;
    
    if (audioPlayer) {
      if (isPlaying) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
      
      setIsPlaying(!isPlaying);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-[#181818] p-6 rounded-lg max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="mb-4">{error || "Failed to load track"}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] to-[#1e1e1e]">
      <Navbar />
      
      <AnimatePresence>
        {showSuccess && (
          <SuccessToast message={successMessage} />
        )}
      </AnimatePresence>
      
      {track?.requires_auth ? (
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-[#181818] p-6 rounded-lg max-w-md mx-auto mt-16 shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[#1DB954] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="mb-4">Please sign in with your Spotify account to view track details</p>
            <button
              onClick={() => signIn("spotify")}
              className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90 transition-all"
            >
              Sign In with Spotify
            </button>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8 pt-20 max-w-6xl">
          {/* Track Hero Section */}
          <div className="flex flex-col md:flex-row gap-8 mb-12 bg-[#181818] p-6 rounded-lg shadow-xl">
            {/* Track Image */}
            <div className="w-full md:w-1/3 lg:w-1/4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="aspect-square rounded-lg overflow-hidden shadow-xl"
              >
                <img 
                  src={track.album?.images?.[0]?.url || '/placeholder.png'} 
                  alt={track.name}
                  className="w-full h-full object-cover"
                />
                
                {track.preview_url && (
                  <div className="absolute bottom-4 left-4">
                    {isPlaying && <MusicWaveIndicator />}
                  </div>
                )}
              </motion.div>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-4">
                {track.preview_url && (
                  <button
                    onClick={togglePlay}
                    className="bg-[#1DB954] text-black font-bold py-3 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-colors shadow-md"
                  >
                    {isPlaying ? (
                      <><span className="mr-2">Pause Preview</span><span className="sr-only">Pause</span><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg></>
                    ) : (
                      <><span className="mr-2">Play Preview</span><span className="sr-only">Play</span><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg></>
                    )}
                  </button>
                )}
                
                <a 
                  href={track.external_urls?.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1DB954] text-black font-bold py-3 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-colors shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Open in Spotify
                </a>
              </div>
            </div>
            
            {/* Track Info */}
            <div className="flex-1">
              <div className="flex flex-col gap-2">
                <motion.h1 
                  className="text-3xl md:text-4xl lg:text-5xl font-bold text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  {track.name}
                </motion.h1>
                
                <motion.p 
                  className="text-xl text-gray-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {track.artists?.map(artist => artist.name).join(', ')}
                </motion.p>
                
                <motion.p 
                  className="text-gray-400"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                >
                  Album: {track.album?.name}
                </motion.p>
                
                <motion.div 
                  className="flex items-center gap-4 text-sm text-gray-400 mt-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <span>{track.album?.release_date?.substring(0, 4)}</span>
                  <span>•</span>
                  <span>{track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}` : '0:00'}</span>
                  {track.explicit && (
                    <>
                      <span>•</span>
                      <span className="px-1 py-0.5 bg-gray-600 text-xs rounded">E</span>
                    </>
                  )}
                </motion.div>
                
                {/* Community Rating - Only show if there are ratings */}
                {ratingCount > 0 && (
                  <motion.div 
                    className="mt-6 bg-[#282828] p-4 rounded-lg shadow-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <h3 className="text-lg font-medium mb-2 text-white">Community Rating</h3>
                    <div className="flex items-center gap-3">
                      <StarRating rating={averageRating} onChange={() => {}} readonly={true} size="lg" />
                      <span className="text-gray-400">({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          
          {/* Audio Player */}
          {track.preview_url && (
            <audio 
              id="audioPlayer"
              src={track.preview_url}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column */}
            <div className="lg:col-span-2">
              {/* Community Ratings Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="mb-12"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Community Ratings & Reviews</h2>
                  {session && (
                    <button
                      onClick={() => {
                        const element = document.getElementById('user-rating-section');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="bg-[#1DB954]/20 text-[#1DB954] px-4 py-2 rounded-full text-sm hover:bg-[#1DB954]/30 transition-colors"
                    >
                      Add Your Rating
                    </button>
                  )}
                </div>
                
                {communityRatings.length > 0 ? (
                  <div className="space-y-4">
                    {communityRatings.map((rating) => (
                      <UserRatingItem key={rating.id} rating={rating} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#181818] rounded-lg p-8 text-center shadow-md">
                    <p className="text-gray-400 mb-4">No ratings yet. Be the first to rate this track!</p>
                    {!session && (
                      <Link 
                        href="/login"
                        className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full inline-block hover:scale-105 transition-transform"
                      >
                        Sign In to Rate
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          
            {/* Right column */}
            <div>
              {/* Your Rating Section */}
              <motion.div 
                id="user-rating-section"
                className="bg-[#181818] p-6 rounded-lg shadow-xl mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <h3 className="text-xl font-bold mb-4 text-white">Your Rating & Review</h3>
                
                {!session ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 mb-4">Sign in to rate and review this track</p>
                    <Link 
                      href="/login"
                      className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full inline-block hover:bg-opacity-90 transition-colors"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleRatingSubmit}>
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2 text-white">Your Rating</label>
                      <StarRating 
                        rating={userRating} 
                        onChange={setUserRating} 
                        size="lg"
                      />
                    </div>
                    
                    <div className="mb-6">
                      <label htmlFor="review" className="block text-sm font-medium mb-2 text-white">Your Review (Optional)</label>
                      <textarea
                        id="review"
                        rows={4}
                        className="w-full bg-[#282828] text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                        placeholder="Share your thoughts about this track..."
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <button
                        type="submit"
                        disabled={isSubmitting || userRating === 0}
                        className={`bg-[#1DB954] text-black font-bold py-3 px-8 rounded-full ${isSubmitting || userRating === 0 ? 'opacity-70 cursor-not-allowed' : 'hover:bg-opacity-90 transition-colors'}`}
                      >
                        {isSubmitting ? 'Saving...' : userRating ? 'Update Rating' : 'Save Rating'}
                      </button>
                      
                      {userRating > 0 && (
                        <p className="text-sm text-gray-400">
                          {new Date().toLocaleDateString()} • {session?.user?.name}
                        </p>
                      )}
                    </div>
                    
                    {/* Success message */}
                    <AnimatePresence>
                      {showSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-4 bg-[#1DB954]/20 text-[#1DB954] p-2 rounded-md text-center"
                        >
                          {successMessage}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                )}
              </motion.div>
              
              {/* Album Link */}
              {track.album && (
                <motion.div 
                  className="bg-[#181818] p-4 rounded-lg shadow-md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Link 
                    href={`/album/${track.album?.id ?? ''}`}
                    className="inline-flex items-center hover:bg-[#282828] transition-colors p-4 rounded-lg w-full"
                  >
                    <div className="w-16 h-16 mr-4 shrink-0">
                      <img 
                        src={track.album?.images?.[0]?.url || '/placeholder.png'} 
                        alt={track.album?.name || ''}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">See full album</p>
                      <p className="font-bold text-white">{track.album?.name}</p>
                    </div>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 