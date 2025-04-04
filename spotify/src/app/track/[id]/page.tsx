'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '@/app/providers';
import { Track } from '@/types/index';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

// Helper function to format duration from ms to M:SS
function formatDuration(ms: number): string {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Types
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
  const { playTrack, playingTrack, isPlaying: isGlobalPlaying } = useAudio();
  
  // State for track data
  const [track, setTrack] = useState<Track | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communityRatings, setCommunityRatings] = useState<UserRating[]>([]);
  
  // Determine if the current track detail page's track is the one playing globally
  const isCurrentTrackPlaying = playingTrack?.id?.toString() === track?.id?.toString() && isGlobalPlaying;

  // Fetch track data
  useEffect(() => {
    if (!id) return;
    
    const fetchTrackData = async () => {
      try {
        setLoading(true);
        
        // Fetch from the consolidated tracks endpoint
        const trackRes = await fetch(`/api/tracks/${id}`); 
        if (!trackRes.ok) {
           const errorBody = await trackRes.text();
           console.error(`Failed API fetch for track ${id}: ${trackRes.status}`, errorBody);
          throw new Error(`Failed to fetch track data: ${trackRes.statusText}`);
        }
        
        const trackData: Track = await trackRes.json();
        console.log("Fetched Track Data:", trackData); // Log to check preview_url
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
        console.error("Error fetching track detail data:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrackData();
  }, [id, session]);
  
  // Fetch community ratings & user's rating/favorite status
  useEffect(() => {
    // ... existing community fetch logic ...
  }, [id, session?.user?.id]);

  // Submit rating and review
  const handleRatingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Use the track ID from the fetched track state, not from params
    const itemIdToSubmit = track?.id; 

    if (!session) {
      // Handle not logged in
      console.warn("User not logged in, cannot submit rating.");
      // Optionally redirect to login or show message
      return;
    }

    if (!itemIdToSubmit) {
      console.error("Cannot submit rating: Track ID is missing from state.");
      alert("Error: Could not determine track ID.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Submitting rating with session:", !!session, "User ID:", session?.user?.id, "Item ID:", itemIdToSubmit);
      
      if (typeof userRating !== 'number' || userRating < 0 || userRating > 10) {
        throw new Error('Invalid rating value');
      }
      
      // Convert rating from UI scale (0-10) to API scale (0-5)
      const apiRating = userRating / 2;
      
      console.log(`Converting rating from ${userRating} (0-10 scale) to ${apiRating} (0-5 scale) for item ${itemIdToSubmit}`);
      
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Ensure fresh request
        },
        // credentials: 'include', // May not be needed if using NextAuth session
        body: JSON.stringify({
          itemId: itemIdToSubmit, // *** USE TRACK ID FROM STATE ***
          itemType: 'track',
          rating: apiRating, 
          review: userReview
        }),
      });
      
      console.log(`Rating submission status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || await response.text();
        console.error("Rating submission failed:", errorMessage);
        throw new Error(`Failed to submit rating: ${errorMessage}`);
      }
      
      const result = await response.json();
      console.log("Rating submitted:", result);
      
      setSuccessMessage("Your rating has been saved!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      const avgResponse = await fetch(`/api/ratings/average?itemId=${itemIdToSubmit}&itemType=track`, {
        credentials: 'include'
      });
      
      if (avgResponse.ok) {
        const avgData = await avgResponse.json();
        setAverageRating(avgData.average ? avgData.average * 2 : 0);
        setRatingCount(avgData.count || 0);
      }
      
      const ratingsResponse = await fetch(`/api/ratings/item?itemId=${itemIdToSubmit}&itemType=track&limit=10`, {
        credentials: 'include'
      });
      
      if (ratingsResponse.ok) {
        const ratingsData = await ratingsResponse.json();
        const convertedRatings: UserRating[] = (ratingsData.ratings || []).map((rating: UserRating) => ({
          ...rating,
          rating: rating.rating * 2 
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
  
  const handlePlayToggle = () => {
    console.log("[TrackDetail] handlePlayToggle called"); // Log start
    if (!track) {
      console.log("[TrackDetail] No track data, returning.");
      return;
    }
    
    console.log(`[TrackDetail] Checking preview_url: ${track.preview_url}`); // Log the URL
    if (!track.preview_url) {
      console.log("[TrackDetail] No preview_url found, showing alert.");
      alert('Preview not available for this track.');
      return;
    }
    
    console.log("[TrackDetail] Preview URL found, calling playTrack..."); // Log before calling playTrack
    playTrack({
      id: track.id.toString(),
      name: track.name || 'Unknown Track',
      preview_url: track.preview_url,
      artists: track.artists?.map(a => ({ name: a.name })) || [],
      album: {
        name: track.album?.name || 'Unknown Album',
        images: track.album?.images?.map(img => ({ url: img.url })) || [],
      }
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">Error: {error}</div>;
  }

  if (!track) {
    return <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">Track not found.</div>;
  }

  const imageUrl = track.album?.images?.[0]?.url || 'https://placehold.co/600x600/1DB954/FFFFFF?text=Track';

  return (
    <div className="bg-gradient-to-b from-[#1f1f1f] to-[#121212] min-h-screen text-white">
      <Navbar />
      <main className="pt-20 pb-20 px-4 md:px-8 max-w-6xl mx-auto">
        <AnimatePresence>
          {showSuccess && <SuccessToast message={successMessage} />}
        </AnimatePresence>
        
        {/* Back Button */}
        <button 
          onClick={() => router.back()} 
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
          Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Left Column: Image, Basic Info */}
          <div className="md:col-span-1">
             {/* --- Image with Play Button Overlay --- */}
            <div className="relative group aspect-square mb-6">
              <img 
                src={imageUrl}
                alt={track.name || 'Track artwork'}
                className="w-full h-full object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = 'https://placehold.co/600x600/1DB954/FFFFFF?text=Track';
                }}
              />
              {track.preview_url && (
                <button
                  onClick={handlePlayToggle}
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                  aria-label={isCurrentTrackPlaying ? "Pause preview" : "Play preview"}
                >
                  <AnimatePresence initial={false} mode="wait">
                    <motion.div
                      key={isCurrentTrackPlaying ? 'pause' : 'play'}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                      className="text-white bg-[#1DB954] rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      {isCurrentTrackPlaying ? (
                        <PauseIcon className="w-8 h-8 md:w-10 md:h-10" />
                      ) : (
                        <PlayIcon className="w-8 h-8 md:w-10 md:h-10" />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </button>
              )}
            </div>
            {/* --- End Image --- */}
            
            {/* Original Play Preview Button (now redundant, consider removing or keeping as secondary) */}
            {track.preview_url && (
              <button 
                onClick={handlePlayToggle}
                className="w-full bg-[#1DB954] text-black font-bold py-3 px-4 rounded-full hover:bg-[#1ED760] transition flex items-center justify-center gap-2 mb-4"
              >
                 {isCurrentTrackPlaying ? (
                   <>
                     <PauseIcon className="w-5 h-5" /> Pause Preview
                     <MusicWaveIndicator /> 
                   </>
                 ) : (
                   <>
                     <PlayIcon className="w-5 h-5" /> Play Preview
                   </>
                 )}
              </button>
            )}
             {/* --- End Original Button --- */}

            <h1 className="text-3xl font-bold mb-2">{track.name}</h1>
            <div className="text-lg text-neutral-400 mb-4">
              {track.artists?.map((artist, index) => (
                <span key={artist.id}>
                  <Link href={`/artist/${artist.id}`} className="hover:underline">
                    {artist.name}
                  </Link>
                  {index < track.artists!.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
            <div className="text-sm text-neutral-500">
              <span>Album: </span> 
              <Link href={`/album/${track.album?.id}`} className="hover:underline">
                {track.album?.name}
              </Link> 
              <span> • {track.album?.release_date?.substring(0, 4)}</span>
            </div>
            <div className="text-sm text-neutral-500">
              Duration: {formatDuration(track.duration_ms || 0)}
            </div>
          </div>

          {/* Right Column: Rating, Review, Community */}
          <div className="md:col-span-2">
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
      </main>
    </div>
  );
} 