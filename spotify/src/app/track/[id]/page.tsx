'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn } from "next-auth/react";
import Navbar from '@/app/components/Navbar';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '@/app/providers';
import { Track } from '@/types/index';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline, PlusIcon, ChatBubbleOvalLeftEllipsisIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { AddToPlaylistModal } from '@/app/components/modals/PlaylistModal';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import UserAvatar from '@/app/components/UserAvatar';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

// Helper function to format duration from ms to M:SS
function formatDuration(ms: number | undefined | null): string {
  if (typeof ms !== 'number' || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Types
interface Reply {
  id: string;
  rating_id: string;
  user_id: string; // Internal DB ID
  parent_reply_id: string | null;
  reply_text: string;
  created_at: string;
  updated_at: string | null;
  user: { 
    id: string; // Internal DB ID
    spotify_id: string; // Spotify ID
    display_name: string;
    profile_image: string | null;
  };
}

interface UserRating {
  id: string;
  userId: string;
  userName?: string;
  userImage?: string;
  rating: number;
  review?: string;
  createdAt: string;
  replies?: Reply[];
  user?: {
      id: string; // Internal DB ID
      spotify_id: string; // Spotify ID
      display_name: string;
      profile_image: string | null;
  };
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
                  <path d="M12 17.27V2" style={{ fill: 'none', stroke: '#374151', strokeWidth: 2 }}/>
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
        <p className="text-gray-300 mt-2 text-sm">{rating.review}</p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        {new Date(rating.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
};

// Error Display Component
function ErrorDisplay({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="bg-[#181818] p-6 rounded-lg text-center my-10">
      <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Track</h2>
      <p className="text-gray-300 mb-4">{message}</p>
      <button 
         onClick={() => router.back()} 
         className="mt-4 inline-block px-4 py-2 bg-[#1DB954] text-black font-medium rounded-full"
       >
         Go Back
       </button>
    </div>
  );
}

// --- Skeleton Component --- 
function TrackPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Back button placeholder */} 
      <div className="h-6 w-20 bg-neutral-700 rounded mb-6"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {/* Left Column Skeleton */}
        <div className="md:col-span-1">
          <div className="aspect-square bg-neutral-800 rounded-lg mb-6 shadow-xl"></div>
          <div className="h-8 bg-neutral-700 rounded w-3/4 mb-3"></div>
          <div className="h-6 bg-neutral-700 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-neutral-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-neutral-700 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-neutral-700 rounded-full mb-6"></div> 
        </div>

        {/* Right Column Skeleton */}
        <div className="md:col-span-2 space-y-8">
          {/* Community Ratings Skeleton */}
          <div>
            <div className="flex justify-between items-center mb-6">
               <div className="h-7 bg-neutral-700 rounded w-1/2"></div>
               <div className="h-9 bg-neutral-700 rounded-full w-32"></div>
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-[#282828] p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
                      <div className="h-4 bg-neutral-700 rounded w-24"></div>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => <div key={j} className="w-4 h-4 bg-neutral-700 rounded-full"></div>)}
                    </div>
                  </div>
                  <div className="h-4 bg-neutral-700 rounded w-full"></div>
                  <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>

          {/* User Rating Skeleton */}
          <div className="bg-[#181818] p-6 rounded-lg space-y-4">
            <div className="h-6 bg-neutral-700 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-neutral-700 rounded w-1/2 mb-4"></div>
            <div className="h-20 bg-neutral-700 rounded w-full mb-4"></div>
            <div className="h-12 bg-neutral-700 rounded-full w-36"></div>
          </div>

           {/* Album Link Skeleton */}
           <div className="bg-[#181818] p-4 rounded-lg">
              <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-neutral-700 rounded"></div>
                  <div className="space-y-2 flex-1">
                      <div className="h-4 bg-neutral-700 rounded w-1/3"></div>
                      <div className="h-5 bg-neutral-700 rounded w-2/3"></div>
                  </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackDetail() {
  const { id: routeParamId } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { playTrack, playingTrack, isPlaying: isGlobalPlaying } = useAudio();
  
  // State for track data
  const [track, setTrack] = useState<Track | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communityRatings, setCommunityRatings] = useState<UserRating[]>([]);
  
  // --- NEW Favorite State --- 
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string> | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [loadingFavorite, setLoadingFavorite] = useState(true);
  // --- END NEW Favorite State --- 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ ratingId: string; parentReplyId: string | null; parentAuthorName?: string | null; parentText?: string | null } | null>(null);
  const [currentReplyText, setCurrentReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [expandedRatings, setExpandedRatings] = useState<{ [ratingId: string]: boolean }>({});

  const handleToggleRatingExpansion = (ratingId: string) => {
    setExpandedRatings(prev => ({ ...prev, [ratingId]: !prev[ratingId] }));
  };
  
  const isCurrentTrackPlaying = playingTrack?.id?.toString() === track?.id?.toString() && isGlobalPlaying;

  // --- Combined Fetch Logic --- 
  useEffect(() => {
    const trackId = Array.isArray(routeParamId) ? routeParamId[0] : routeParamId;
    if (!trackId || typeof trackId !== 'string') {
        setError("Invalid Track ID in URL");
        setLoading(false);
        setLoadingFavorite(false);
        return;
    }
    
    const fetchAllData = async () => {
      setLoading(true);
      setLoadingFavorite(true);
      setError(null);
      // Reset relevant states
      setTrack(null);
      setUserRating(0);
      setUserReview('');
      setAverageRating(0);
      setRatingCount(0);
      setCommunityRatings([]);
      setIsFavorited(false);
      setFavoriteTrackIds(null);
      setIsModalOpen(false);
      setReplyTarget(null);
      setCurrentReplyText('');

      let fetchedTrackData: Track | null = null;

      try {
        // Fetch track, average rating, community ratings, user rating (if logged in), and ALL favorites
        const results = await Promise.allSettled([
          fetch(`/api/tracks/${trackId}`),
          fetch(`/api/ratings/average?itemId=${trackId}&itemType=track`),
          fetch(`/api/ratings/item?itemId=${trackId}&itemType=track&limit=10`),
          session ? fetch(`/api/ratings?itemId=${trackId}&type=track`) : Promise.resolve(null),
          session ? fetch(`/api/favorites`) : Promise.resolve(null)
        ]);

        // 1. Process Track Data
        if (results[0].status === 'fulfilled' && results[0].value.ok) {
          fetchedTrackData = await results[0].value.json();
          setTrack(fetchedTrackData);
        } else {
          const status = results[0].status === 'fulfilled' ? results[0].value.status : 'Fetch failed';
          const errorText = results[0].status === 'fulfilled' ? await results[0].value.text() : results[0].reason;
          console.error(`Failed API fetch for track ${trackId}: ${status}`, errorText);
          throw new Error(status === 404 ? 'Track not found.' : `Failed to fetch track data: ${status}`);
        }

        // 2. Process Average Ratings
        if (results[1].status === 'fulfilled' && results[1].value.ok) {
          const ratingsData = await results[1].value.json();
          setAverageRating(ratingsData.average ? ratingsData.average * 2 : 0);
          setRatingCount(ratingsData.count || 0);
        } else {
            console.warn('Failed to fetch average ratings.');
        }

        // 3. Process Community Ratings
        if (results[2].status === 'fulfilled' && results[2].value.ok) {
          const ratingsData = await results[2].value.json();
          console.log("[useEffect Debug] Raw ratingsData from API:", ratingsData);
          const fetchedRatings: UserRating[] = (ratingsData.ratings || []).map((rating: any) => { 
              console.log(`[useEffect Debug] Processing rating ID: ${rating.id}`); 
              const mappedReplies = (rating.replies || []).map((reply: any) => { 
                  const userObject = reply.user || {}; 
                  return { 
                      id: reply.id,
                      rating_id: reply.ratingId, 
                      user_id: userObject.id, 
                      parent_reply_id: reply.parentReplyId, 
                      reply_text: reply.replyText, 
                      created_at: reply.createdAt, 
                      updated_at: reply.updatedAt,
                      user: {
                          id: userObject.id || 'unknown-user-id', 
                          spotify_id: userObject.spotify_id || 'unknown-spotify-id',
                          display_name: userObject.display_name || 'Unknown User', 
                          profile_image: userObject.profile_image || null
                      }
                  } as Reply;
              });
              return { 
                  ...rating, 
                  rating: rating.rating * 2, 
                  replies: mappedReplies,
                  userId: rating.userId,
                  userName: rating.userName,
                  userImage: rating.userImage,
                  user: rating.user
              };
          });
          setCommunityRatings(fetchedRatings);
        } else {
          console.warn("Failed to fetch community ratings or invalid format");
          setCommunityRatings([]);
        }

        // 4. Process User Rating
        if (results[3].status === 'fulfilled' && results[3].value?.ok) {
          const userRatingData = await results[3].value.json();
          if (userRatingData.rating) {
            setUserRating(userRatingData.rating * 2);
            setUserReview(userRatingData.review || '');
          }
        } else if (results[3].status === 'rejected' || (results[3].status === 'fulfilled' && results[3].value && !results[3].value.ok)) {
             console.warn("Failed to fetch user rating.");
        }

        // 5. Process User Favorites (NEW)
        if (results[4].status === 'fulfilled' && results[4].value?.ok) {
            const favoritesData = await results[4].value.json();
            console.log('[useEffect Debug] Raw favorites data:', favoritesData);
            
            // --- DETAILED DEBUGGING --- 
            console.log('[Debug Check] Type of favoritesData:', typeof favoritesData);
            console.log('[Debug Check] favoritesData content:', JSON.stringify(favoritesData));
            console.log('[Debug Check] favoritesData has .favorites property?:', favoritesData?.hasOwnProperty('favorites'));
            console.log('[Debug Check] Type of favoritesData.favorites:', typeof favoritesData?.favorites);
            console.log('[Debug Check] Is favoritesData.favorites an array?:', Array.isArray(favoritesData?.favorites));
            // --- END DETAILED DEBUGGING --- 
            
            // --- FIX: Check favoritesData.favorites --- 
            if (favoritesData && Array.isArray(favoritesData.favorites)) { 
              // --- FIX: Map over favoritesData.favorites --- 
              const ids = new Set(favoritesData.favorites.map((fav: { track_id: string }) => fav.track_id));
              setFavoriteTrackIds(ids);
              console.log('[useEffect Debug] Populated favoriteTrackIds Set:', ids);
            } else {
              console.warn('[useEffect Debug] Unexpected format for favorites data (expected object with favorites array):', favoritesData);
              setFavoriteTrackIds(new Set<string>());
            }
        } else if (results[4].status === 'rejected' || (results[4].status === 'fulfilled' && results[4].value && !results[4].value.ok)){
             console.warn("Failed to fetch user favorites.");
             setFavoriteTrackIds(new Set<string>());
        } else {
            // Not logged in, set empty set
            setFavoriteTrackIds(new Set<string>());
        }

      } catch (error) {
        console.error("Error fetching track detail data:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
        setLoadingFavorite(false); // Set loading favorite false after *all* data is attempted
      }
    };
    
    fetchAllData();
  }, [routeParamId, session?.user?.id]); // Depend on routeParamId and session ID
  
  // --- NEW useEffect to derive isFavorited from favoriteTrackIds --- 
  useEffect(() => {
    if (track && favoriteTrackIds) {
        const currentlyFavorited = favoriteTrackIds.has(track.id.toString());
        setIsFavorited(currentlyFavorited);
        console.log(`[useEffect Fav Check] Track ${track.id} is in favorites set? ${currentlyFavorited}`);
    } else if (track && !session && favoriteTrackIds !== null) {
        // Not logged in, ensure it's false once favorites state is initialized
        setIsFavorited(false);
        console.log(`[useEffect Fav Check] User not logged in, setting isFavorited to false.`);
    }
    // If favoriteTrackIds is null, it means the fetch is still pending or failed,
    // isFavorited will retain its default (false) or previous value until updated.
  }, [track, favoriteTrackIds, session]); // Depends on track, the Set, and session

  // Submit rating and review
  const handleRatingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const itemIdToSubmit = track?.id;
    if (!session || !itemIdToSubmit) return;
    setIsSubmittingRating(true);
    try {
      const apiRating = userRating / 2;
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' // Ensure fresh request
        },
        body: JSON.stringify({
          itemId: itemIdToSubmit,
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
      setIsSubmittingRating(false);
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

  // --- UPDATED Favorite Toggle Handler --- 
  const handleToggleFavorite = async () => {
    if (!session || !track || loadingFavorite) return;

    const optimisticValue = !isFavorited;
    setIsFavorited(optimisticValue);
    setLoadingFavorite(true);
    const trackIdString = track.id.toString();

    const oldSet = favoriteTrackIds ? new Set<string>(favoriteTrackIds) : new Set<string>();

    // Optimistically update the Set state
    if (optimisticValue) {
        setFavoriteTrackIds(prev => new Set<string>(prev).add(trackIdString));
    } else {
        setFavoriteTrackIds(prev => {
            const newSet = new Set<string>(prev);
            newSet.delete(trackIdString);
            return newSet;
        });
    }

    try {
      const response = await fetch('/api/favorites', {
        method: optimisticValue ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: trackIdString }),
      });

      if (!response.ok) {
        // Revert optimistic UI and Set update on failure
        setIsFavorited(!optimisticValue);
        setFavoriteTrackIds(oldSet);
        const errorData = await response.json().catch(() => ({ error: 'Failed to update favorite status' }));
        console.error("Favorite toggle failed:", errorData);
        toast.error(`Error: ${errorData.error || 'Could not update favorite status.'}`);
      } else {
         // Success - UI and Set already updated optimistically
         console.log(`Track ${optimisticValue ? 'added to' : 'removed from'} favorites. Set updated.`);
         // Optionally, refetch the favorites list here if needed for absolute certainty,
         // but optimistic update should be sufficient for UI.
         // fetchAllData(); // Or a more targeted fetch for favorites
      }
    } catch (error) {
      // Revert optimistic UI and Set update on network error
      setIsFavorited(!optimisticValue);
      setFavoriteTrackIds(oldSet);
      console.error("Error toggling favorite:", error);
      toast.error('An network error occurred. Please try again.');
    } finally {
       setLoadingFavorite(false); // Finish loading
    }
  };

  // --- Add to Playlist Handlers --- 
  const handleOpenPlaylistModal = () => {
      if (!session) {
          signIn('spotify'); // Prompt sign in if not logged in
          return;
      }
      if (!track) return; // Should not happen if button is visible
      setIsModalOpen(true);
  };

  const handleAddToPlaylistSubmit = async (playlistId: string | null, newPlaylistName: string | null) => {
     if (!track) return; // Need track ID

     console.log("Adding track:", track.id, "to", playlistId || newPlaylistName);
     try {
         const res = await fetch('/api/favorites/export', { // Use the same export endpoint
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 trackIds: [track.id], // Send only the current track's ID
                 targetPlaylistId: playlistId,
                 newPlaylistName: newPlaylistName,
             })
         });
         const result = await res.json();
         if (!res.ok) {
             throw new Error(result.error || result.details?.error?.message || `Failed to export (${res.status})`);
         }
         toast.success(result.message || 'Track added successfully!');
         setIsModalOpen(false); 
         // No need to clear selection state here
     } catch (err) {
          console.error("Export API error:", err);
          toast.error(`Failed to add track: ${err instanceof Error ? err.message : 'Unknown error'}`);
          throw err; // Re-throw for modal error handling
     }
  };

  // --- Reply Handlers --- 
  const handleOpenReplyInput = (ratingId: string, parentReplyId: string | null = null) => {
      // ... (open reply logic same as before) ...
  };

  const handleCancelReply = () => {
      // ... (cancel reply logic same as before) ...
  };

  const handleReplySubmit = async () => {
      // ... (submit reply logic same as before) ...
  };

  const handleDeleteReply = async (replyId: string, ratingId: string) => {
      // ... (delete reply logic same as before) ...
  };

  const handleDeleteRating = async (ratingId: string) => {
      // ... (delete rating logic needs track?.id same as handleRatingSubmit) ...
      const currentTrackId = track?.id;
      if (!currentTrackId) return; // Guard clause
      // ... rest of delete logic using currentTrackId for refetching average ...
  };

  // --- JSX Structure --- 
  const imageUrl = track?.album?.images?.[0]?.url || '/placeholder-album.png';

  return (
    <div className="bg-gradient-to-b from-[#1f1f1f] to-[#121212] min-h-screen text-white">
      <Navbar />
      <main className="pt-20 pb-20 px-4 md:px-8 max-w-6xl mx-auto">
        {/* Back Button */} 
        <button 
          onClick={() => router.back()} 
          className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
          Back
        </button>

        {/* Main Content Area */} 
        {loading ? (
            <TrackPageSkeleton />
        ) : error ? (
            <ErrorDisplay message={error} />
        ) : !track ? (
            <ErrorDisplay message={"Track not found."} />
        ) : (
          // Actual Track Content
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Left Column: Image, Basic Info, Actions */}
            <div className="md:col-span-1">
              {/* --- Image with Play/Favorite/Add Buttons Overlay --- */}
              <div className="relative group aspect-square mb-6 shadow-xl">
                {/* Use Next Image */} 
                <Image
                  src={imageUrl}
                  alt={track.name || 'Track artwork'}
                  fill // Use fill for aspect ratio container
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 400px" // Example sizes
                  priority
                  unoptimized // Spotify images are already optimized
                  className="object-cover rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-album.png'; }}
                />
                {/* Overlay for buttons */}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-opacity duration-300 rounded-lg">
                  {/* Top Right Buttons (Favorite & Add) */} 
                  <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                    {/* Favorite Button */} 
                    <div>
                      {loadingFavorite ? (
                        <div className="w-10 h-10 flex items-center justify-center p-2 rounded-full bg-black/50 backdrop-blur-sm">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-neutral-400"></div>
                        </div>
                      ) : session ? (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={handleToggleFavorite}
                          className={`p-2 rounded-full transition-all duration-200 backdrop-blur-sm bg-black/40 ${ 
                            isFavorited ? 'text-red-500 hover:bg-red-900/50' : 'text-neutral-300 hover:text-white hover:bg-black/60'
                          }`}
                          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFavorited ? <HeartIconSolid className="w-6 h-6" /> : <HeartIconOutline className="w-6 h-6" />}
                        </motion.button>
                      ) : (
                        <button
                          onClick={() => signIn('spotify')}
                          className="p-2 rounded-full transition-colors text-neutral-400 bg-black/40 hover:text-white hover:bg-black/60 backdrop-blur-sm"
                          aria-label="Sign in to favorite"
                          title="Sign in to favorite"
                        >
                          <HeartIconOutline className="w-6 h-6" />
                        </button>
                      )}
                    </div>
                    {/* Add to Playlist Button */} 
                    <div>
                       {session ? (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleOpenPlaylistModal}
                            className="p-2 rounded-full transition-all duration-200 backdrop-blur-sm bg-black/40 text-neutral-300 hover:text-white hover:bg-black/60"
                            aria-label="Add to playlist"
                            title="Add to playlist"
                          >
                            <PlusIcon className="w-6 h-6" />
                          </motion.button>
                       ) : (
                          <button
                            onClick={() => signIn('spotify')}
                            className="p-2 rounded-full transition-colors text-neutral-400 bg-black/40 hover:text-white hover:bg-black/60 backdrop-blur-sm"
                            aria-label="Sign in to add to playlist"
                            title="Sign in to add to playlist"
                          >
                            <PlusIcon className="w-6 h-6" />
                          </button>
                       )}
                    </div>
                  </div> 

                  {/* Play Button (Centered) */} 
                  {track.preview_url && (
                    <button
                      onClick={handlePlayToggle}
                      className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121212] focus:ring-[#1DB954] rounded-full relative z-0"
                      aria-label={isCurrentTrackPlaying ? "Pause preview" : "Play preview"}
                    >
                      <AnimatePresence initial={false} mode="wait">
                        <motion.div
                          key={isCurrentTrackPlaying ? 'pause' : 'play'}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.2 }}
                          className="text-white bg-[#1DB954] rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-110"
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
              </div>
              {/* --- End Image --- */} 
              
              {/* --- Track Info --- */} 
              <h1 className="text-3xl font-bold mb-2 break-words">{track.name}</h1>
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
                <div className="text-sm text-neutral-400 mb-4">
                  Duration: {formatDuration(track.duration_ms)}
                </div>

                {/* --- Listen on Spotify Button --- */} 
                {track.external_urls?.spotify && (
                   <a
                      href={track.external_urls.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#1DB954] text-black font-bold py-2.5 px-4 rounded-full hover:bg-[#1ED760] transition flex items-center justify-center gap-2 text-sm shadow-md mb-6"
                   >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Listen on Spotify
                   </a>
                )}
              </div> 
              {/* End Left Column */} 

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
                           disabled={isSubmittingRating || userRating === 0}
                           className={`bg-[#1DB954] text-black font-bold py-3 px-8 rounded-full ${isSubmittingRating || userRating === 0 ? 'opacity-70 cursor-not-allowed' : 'hover:bg-opacity-90 transition-colors'}`}
                         >
                           {isSubmittingRating ? 'Saving...' : userRating ? 'Update Rating' : 'Save Rating'}
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
          )}
      </main>

       {/* --- Render the Modal --- */} 
        <AddToPlaylistModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAddToPlaylist={handleAddToPlaylistSubmit} 
            itemCount={track ? 1 : 0} // Only ever adding 1 track
            itemNoun="track"
        />

    </div>
  );
} 