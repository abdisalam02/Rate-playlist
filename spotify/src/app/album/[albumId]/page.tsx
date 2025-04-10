'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

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

// --- ADD Type Definitions ---
interface AlbumArtist {
  name: string;
  // Add other artist fields if needed (e.g., id)
}

interface AlbumImage {
  url: string;
  height?: number;
  width?: number;
}

interface AlbumTrack {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
  // Add other track fields if needed (e.g., artists, preview_url)
}

interface Album {
  id: string;
  name: string;
  images?: AlbumImage[];
  artists?: AlbumArtist[];
  release_date?: string;
  total_tracks?: number;
  external_urls?: { spotify?: string };
  tracks?: { items: AlbumTrack[] };
}
// --- END Type Definitions ---

// New User Rating Display component for community reviews
interface UserRating {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  review?: string;
  updatedAt: string;
}

interface UserRatingItemProps {
  rating: UserRating;
}

function UserRatingItem({ rating }: UserRatingItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg overflow-hidden mb-4 shadow-md"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Link href={`/user/${rating.userId}`}>
            <Image 
              src={rating.userImage || "/default-avatar.png"} 
              alt={rating.userName || 'User Avatar'} 
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#1DB954]"
            />
          </Link>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <Link href={`/user/${rating.userId}`} className="font-medium hover:underline text-white">
                {rating.userName}
              </Link>
              <StarRating rating={rating.rating} onChange={() => {}} readonly={true} size="sm" />
            </div>
            
            {rating.review && (
              <div className="mt-2">
                <p className="text-gray-300">{rating.review}</p>
              </div>
            )}
            
            <p className="text-gray-500 text-xs mt-2">
              {new Date(rating.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AlbumDetail() {
  // --- DEBUG: Log hook results ---
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const albumId = params?.albumId as string | undefined;
  console.log("[AlbumDetail Debug] Initial Hook Values:", { params, routerExists: !!router, sessionStatus: status, id: albumId });
  // --- END DEBUG ---
  
  // State for album data - ADD TYPES
  const [album, setAlbum] = useState<Album | null>(null); // Use Album type
  const [tracks, setTracks] = useState<AlbumTrack[]>([]); // Use AlbumTrack[] type
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Type error state
  const [communityRatings, setCommunityRatings] = useState<UserRating[]>([]); // Use UserRating[] type
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Fetch album data
  useEffect(() => {
    // --- DEBUG: Log useEffect entry and id value ---
    console.log(`[AlbumDetail Debug] useEffect triggered. ID: ${albumId}, Status: ${status}`);
    // --- END DEBUG ---

    if (!albumId) {
        console.log("[AlbumDetail Debug] useEffect returning early: No ID found.");
        setLoading(false); // Ensure loading stops if no ID
        setError("Album ID not found in URL.");
        return;
    }
    
    const fetchAlbumData = async () => {
        // --- DEBUG: Log fetchAlbumData start ---
        console.log(`[AlbumDetail Debug] fetchAlbumData called for ID: ${albumId}`);
        // --- END DEBUG ---
      try {
        setLoading(true);
        console.log("[useEffect Debug] Inside try block, before Promise.all");

        // Fetch in parallel
        const [albumRes, ratingsAvgRes, commRatingsRes, userRatingRes, favoriteStatusRes] = await Promise.all([
          fetch(`/api/albums/${albumId}`),
          fetch(`/api/ratings/average?itemId=${albumId}&itemType=album`),
          fetch(`/api/ratings/item?itemId=${albumId}&itemType=album&limit=10`),
          session ? fetch(`/api/ratings?itemId=${albumId}&type=album`) : Promise.resolve(null),
          session ? fetch(`/api/check-favorite?itemId=${albumId}&itemType=album`) : Promise.resolve(null)
        ]);

        console.log("[useEffect Debug] Promise.all finished. Processing responses...");

        // --- FIX: Process each response individually --- 

        // 1. Handle Album Data
        if (!albumRes.ok) {
          const errorBody = await albumRes.text();
          console.error(`Failed API fetch for album ${albumId}: ${albumRes.status}`, errorBody);
          if (albumRes.status === 404) throw new Error('Album not found.');
          throw new Error(`Failed to fetch album data: ${albumRes.statusText}`);
        }
        const albumData = await albumRes.json();
        setAlbum(albumData as Album); 
        setTracks(albumData.tracks?.items || []);
        console.log("[useEffect Debug] Album data processed.");

        // 2. Handle Average Ratings
        if (ratingsAvgRes.ok) {
          const avgData = await ratingsAvgRes.json();
          setAverageRating(avgData.average ? avgData.average * 2 : 0);
          setRatingCount(avgData.count || 0);
          console.log("[useEffect Debug] Average rating processed:", avgData);
        } else {
            console.warn(`Failed to fetch average ratings: ${ratingsAvgRes.status}`);
        }

        // 3. Handle Community Ratings
        if (commRatingsRes.ok) {
          const ratingsData = await commRatingsRes.json();
          const convertedRatings = (ratingsData.ratings || []).map((rating: any) => ({
            ...rating,
            rating: rating.rating * 2 
          }));
          setCommunityRatings(convertedRatings);
          console.log("[useEffect Debug] Community ratings processed:", convertedRatings);
        } else {
            console.warn(`Failed to fetch community ratings: ${commRatingsRes.status}`);
        }

        // 4. Handle User Rating (if fetched)
        if (userRatingRes && userRatingRes.ok) {
          const userRatingData = await userRatingRes.json();
          if (userRatingData.rating !== undefined) { // Check if rating property exists
            setUserRating(userRatingData.rating * 2);
            setUserReview(userRatingData.review || '');
            console.log("[useEffect Debug] User rating processed:", userRatingData);
          } else {
              console.log("[useEffect Debug] User rating response OK, but no rating field found.");
          }
        } else if (userRatingRes) { // Log status if response exists but not ok
            console.warn(`Failed to fetch user rating: ${userRatingRes.status}`);
        }

        // 5. Handle Favorite Status (if fetched)
        if (favoriteStatusRes && favoriteStatusRes.ok) {
           const favData = await favoriteStatusRes.json();
           setIsFavorite(favData.isFavorite === true); // Explicit boolean check
           console.log("[useEffect Debug] Favorite status processed:", favData);
        } else if (favoriteStatusRes) { // Log status if response exists but not ok
            console.warn(`Failed to fetch favorite status: ${favoriteStatusRes.status}`);
        }

      } catch (err) {
        console.error("Error in fetchAlbumData:", err);
        setError((err as Error).message); 
        // setLoading(false) is handled by finally
      } finally {
        console.log(`[AlbumDetail Debug] Entering finally block. Setting loading to false.`);
        setLoading(false);
      }
    };
    
    fetchAlbumData();
  }, [albumId, session, status]);
  
  // Submit rating and review
  const handleRatingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Use the album ID from the fetched album state
    const itemIdToSubmit = album?.id; 

    if (!session) {
      console.warn("User not logged in, cannot submit rating.");
      return;
    }
    
    if (!itemIdToSubmit) {
      console.error("Cannot submit rating: Album ID is missing from state.");
      alert("Error: Could not determine album ID.");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log("Submitting album rating for ID:", itemIdToSubmit);
      
      // Convert rating from UI scale (0-10) to API scale (0-5)
      const apiRating = userRating / 2;
      
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          itemId: itemIdToSubmit, // *** USE ALBUM ID FROM STATE ***
          itemType: 'album',
          rating: apiRating,
          review: userReview
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit rating');
      }
      
      const result = await response.json();
      console.log("Rating submitted:", result);
      
      setSuccessMessage("Your rating has been saved!");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
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
        // await fetch(`/api/favorites?itemId=${id}&itemType=album`, {
        //   method: 'DELETE',
        //   credentials: 'include',
        //   cache: 'no-store',
        //   headers: {
        //     'Cache-Control': 'no-cache'
        //   }
        // });
      } else {
        // Add to favorites
        // await fetch('/api/favorites', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Cache-Control': 'no-cache'
        //   },
        //   credentials: 'include',
        //   body: JSON.stringify({
        //     itemId: id,
        //     itemType: 'album'
        //   }),
        //   cache: 'no-store',
        // });
      }
      
      // Toggle the UI state
      setIsFavorite(!isFavorite);
      
    } catch (err) {
      console.error("Error toggling favorite:", err);
      alert("Failed to update favorites. Please try again.");
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

  if (error || !album) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <Navbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-[#181818] p-6 rounded-lg max-w-md mx-auto shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2 text-white">Error</h2>
            <p className="mb-4 text-gray-300">{error || "Failed to load album"}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#1DB954] text-black font-bold py-2 px-4 rounded-full hover:bg-opacity-90 transition-all"
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
      
      <div className="container mx-auto px-4 py-8 pt-20 max-w-6xl">
        {/* Album Hero Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-12 bg-[#181818] p-6 rounded-lg shadow-xl">
          {/* Album Cover */}
          <div className="w-full md:w-1/3 lg:w-1/4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="aspect-square rounded-lg overflow-hidden shadow-xl"
            >
              <img 
                src={album.images?.[0]?.url || '/placeholder.png'} 
                alt={album.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-4">
              <a 
                href={album.external_urls?.spotify}
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
          
          {/* Album Info */}
          <div className="flex-1">
            <div className="flex flex-col gap-2">
              <motion.h1 
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {album.name}
              </motion.h1>
              
              <motion.p 
                className="text-xl text-gray-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {album.artists?.map((artist: AlbumArtist) => artist.name).join(', ')}
              </motion.p>
              
              <motion.div 
                className="flex items-center gap-4 text-sm text-gray-400 mt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <span>{album.release_date?.substring(0, 4)}</span>
                <span>•</span>
                <span>{album.total_tracks} tracks</span>
                <span>•</span>
                <span>{Math.floor((album.tracks?.items ?? []).reduce((acc: number, track: AlbumTrack) => acc + track.duration_ms, 0) / 60000) || 0} min</span>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Tracklist & Ratings */}
          <div className="lg:col-span-2">
            {/* Tracklist */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold mb-4 text-white">Tracklist</h2>
              <div className="bg-[#181818] rounded-lg overflow-hidden shadow-md">
                {tracks.map((track, index) => (
                  <div 
                    key={track.id} 
                    className={`flex items-center p-4 ${index !== tracks.length - 1 ? 'border-b border-gray-800' : ''} hover:bg-[#282828] transition-colors`}
                  >
                    <div className="w-8 text-center text-gray-400">{track.track_number}</div>
                    <div className="flex-1 ml-4">
                      <h3 className="font-medium text-white">{track.name}</h3>
                      <p className="text-sm text-gray-400">
                        {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                      </p>
                    </div>
                    <Link 
                      href={`/track/${track.id}`}
                      className="bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] px-3 py-1 rounded-full text-sm transition-colors"
                    >
                      View Track
                    </Link>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Community Ratings Section - Show message when there are no ratings */}
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
                  <p className="text-gray-400 mb-4">No ratings yet. Be the first to rate this album!</p>
                  {!session && (
                    <Link 
                      href="/login"
                      className="bg-[#1DB954] text-black font-bold py-2 px-6 rounded-full inline-block hover:bg-opacity-90 transition-colors"
                    >
                      Sign In to Rate
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          </div>
          
          {/* Right Column - User Rating */}
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
                  <p className="text-gray-400 mb-4">Sign in to rate and review this album</p>
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
                      placeholder="Share your thoughts about this album..."
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
          </div>
        </div>
      </div>
    </div>
  );
} 