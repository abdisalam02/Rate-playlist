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
    id: string; // Internal DB ID (UUID)
    spotify_id: string; // Spotify ID
    display_name: string;
    profile_image: string | null;
  };
}

interface UserRating {
  id: string;
  userId: string; // This might be the Supabase ID now
  userName?: string; // Might be stale, prefer user object
  userImage?: string; // Might be stale, prefer user object
  rating: number; // Stored as 0-5, displayed as 0-10
  review?: string;
  createdAt: string;
  replies?: Reply[]; // Nested replies
  user?: { // Populated user object
      id: string; // Internal DB ID (UUID)
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

// Toast notification component (kept for potential future use, but react-hot-toast is primary)
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

// Updated Reply Item Component with Input Form and Delete Button
interface ReplyItemProps {
  reply: Reply;
  allReplies: Reply[];
  onReplyClick: (ratingId: string, parentReplyId: string | null) => void;
  level?: number;
  replyTarget: { ratingId: string; parentReplyId: string | null; parentAuthorName?: string | null; parentText?: string | null } | null;
  currentReplyText: string;
  isSubmittingReply: boolean;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  onReplyTextChange: (text: string) => void;
  onDeleteReply: (replyId: string, ratingId: string) => void; // Prop for delete handler
}

const ReplyItem: React.FC<ReplyItemProps> = ({
    reply,
    allReplies,
    onReplyClick,
    level = 0,
    replyTarget,
    currentReplyText,
    isSubmittingReply,
    onCancelReply,
    onSubmitReply,
    onReplyTextChange,
    onDeleteReply // Destructure delete handler
}) => {
    // --- State for expanding THIS item's children ---
    const [isExpanded, setIsExpanded] = useState(false);
    const INITIAL_REPLY_LIMIT = 1;

    const childReplies = allReplies.filter(r => r.parent_reply_id === reply.id)
                                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const showReplyInput = replyTarget?.parentReplyId === reply.id;
    const parentReply = reply.parent_reply_id
        ? allReplies.find(r => r.id === reply.parent_reply_id)
        : null;

    // --- Logic for limiting child replies ---
    const totalChildReplies = childReplies.length;
    const canExpandChildren = totalChildReplies > INITIAL_REPLY_LIMIT;
    const visibleChildReplies = canExpandChildren && !isExpanded
        ? childReplies.slice(0, INITIAL_REPLY_LIMIT)
        : childReplies;

    const handleToggleExpandChildren = () => {
        setIsExpanded(prev => !prev);
    };
    // --- End child limiting logic ---

    const { data: session } = useSession();

    // --- Corrected Ownership Check --- 
    // Compare the Supabase Auth User ID from the session with the user_id stored with the reply
    const sessionUserId = (session?.user as any)?.id; // Supabase Auth User ID
    
    // --- Add Debug Log --- 
    console.log(`[ReplyItem Check] Reply ID: ${reply.id}, Level: ${level}, Reply User ID: ${reply.user_id}, Session User ID: ${sessionUserId}, Type Reply User ID: ${typeof reply.user_id}, Type Session User ID: ${typeof sessionUserId}`);
    // --- End Debug Log ---
    
    const isOwner = !!sessionUserId && !!reply.user_id && sessionUserId === reply.user_id;
    // Debug log (optional):
    // console.log(`[ReplyItem] Reply ID: ${reply.id}, Session User ID: ${sessionUserId}, Reply Author User ID: ${reply.user_id}, Is Owner: ${isOwner}`);
    // --- End Correction ---

    return (
        <div className={`ml-${level * 6} flex flex-col`} >
             <div className={`${level > 0 ? 'mt-3 pt-3 border-t border-neutral-700/50' : ''} flex flex-col`}>
                 <div className="flex gap-3">
                     <div className="mt-1 shrink-0">
                        <UserAvatar
                           imageUrl={reply.user?.profile_image} // Safe access
                           username={reply.user?.display_name} // Safe access
                           sizeClasses="w-6 h-6"
                        />
                     </div>
                     <div className="flex-1">
                         <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="font-medium text-white">{reply.user?.display_name || 'User'}</span>
                            <span className="text-neutral-500">•</span>
                            <span className="text-neutral-500">
                               {new Date(reply.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {/* --- Delete Button --- */}
                            {isOwner && (
                                <button
                                   onClick={() => onDeleteReply(reply.id, reply.rating_id)} // Call handler passed via props
                                   className="ml-auto text-neutral-500 hover:text-red-500 transition-colors p-0.5 rounded"
                                   title="Delete reply"
                                   aria-label="Delete reply" // Accessibility
                                 >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                 </button>
                            )}
                            {/* --- End Delete Button --- */}
                         </div>

                         {parentReply && (
                            <div className="mb-1.5 p-2 border-l-2 border-neutral-600 bg-neutral-800/40 rounded-r-md relative">
                                 <ChatBubbleOvalLeftEllipsisIcon className="w-3 h-3 absolute -left-1.5 top-2.5 text-neutral-500 transform -translate-x-1/2" />
                                 <p className="text-xs font-medium text-neutral-300 mb-0.5">
                                     {parentReply.user?.display_name || 'User'}
                                 </p>
                                 <p className="text-xs text-neutral-400 italic line-clamp-2">
                                     {parentReply.reply_text}
                                 </p>
                             </div>
                         )}

                         <p className="text-sm text-neutral-300 whitespace-pre-wrap mb-1">{reply.reply_text}</p>
                          <button
                             onClick={() => onReplyClick(reply.rating_id, reply.id)}
                             className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                             title="Reply to this comment"
                           >
                              <ChatBubbleOvalLeftEllipsisIcon className="w-3 h-3" />
                              <span className="text-[11px]">Reply</span>
                           </button>
                     </div>
                 </div>
                  {showReplyInput && (
                     <div className="mt-3 pl-9">
                          {replyTarget?.parentText && (
                              <div className="mb-2 p-2 border-l-2 border-neutral-600 bg-neutral-700/30 rounded-r-md">
                                  <p className="text-xs text-neutral-400 italic line-clamp-2">
                                      {replyTarget.parentText}
                                  </p>
                              </div>
                          )}
                          {replyTarget?.parentAuthorName && (
                              <div className="text-xs text-neutral-500 mb-1 italic">Replying to {replyTarget.parentAuthorName}</div>
                          )}
                          <textarea
                              rows={2}
                              className="w-full bg-[#333] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1DB954] resize-none placeholder-neutral-500"
                              placeholder={`Replying to ${replyTarget?.parentAuthorName || 'this comment'}...`}
                              value={currentReplyText}
                              onChange={(e) => onReplyTextChange(e.target.value)}
                              disabled={isSubmittingReply}
                              autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                              <button
                                 onClick={onCancelReply}
                                 disabled={isSubmittingReply}
                                 className="text-xs text-neutral-400 hover:text-white px-3 py-1 rounded hover:bg-neutral-700 transition-colors"
                               >
                                  Cancel
                              </button>
                              <button
                                 onClick={onSubmitReply}
                                 disabled={!currentReplyText.trim() || isSubmittingReply}
                                 className="flex items-center gap-1 bg-[#1DB954] text-black text-xs font-semibold px-3 py-1 rounded disabled:opacity-60 disabled:cursor-not-allowed hover:bg-opacity-90 transition-colors"
                               >
                                    {isSubmittingReply ? 'Posting...' : (
                                        <>
                                           <PaperAirplaneIcon className="w-3 h-3" /> Post Reply
                                        </>
                                    )}
                              </button>
                          </div>
                     </div>
                 )}
             </div>

             {childReplies.length > 0 && (
                 <div className="mt-1">
                     <AnimatePresence initial={false}>
                         <motion.div
                             key={`children-${reply.id}`}
                             initial="collapsed"
                             animate={isExpanded || !canExpandChildren ? "open" : "collapsed"}
                             exit="collapsed"
                             variants={{
                                 open: { opacity: 1, height: 'auto', marginTop: 0 },
                                 collapsed: { opacity: 0, height: 0, marginTop: 0 }
                             }}
                             transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                             style={{ overflow: 'hidden' }}
                         >
                              {visibleChildReplies.map(childReply => (
                                 <ReplyItem
                                     key={childReply.id}
                                     reply={childReply}
                                     allReplies={allReplies} // Pass full list for nesting checks
                                     onReplyClick={onReplyClick}
                                     level={level + 1}
                                     replyTarget={replyTarget}
                                     currentReplyText={currentReplyText}
                                     isSubmittingReply={isSubmittingReply}
                                     onCancelReply={onCancelReply}
                                     onSubmitReply={onSubmitReply}
                                     onReplyTextChange={onReplyTextChange}
                                     onDeleteReply={onDeleteReply} // Pass delete handler down
                                 />
                             ))}
                         </motion.div>
                     </AnimatePresence>

                     {canExpandChildren && (
                         <button
                             onClick={handleToggleExpandChildren}
                             className="ml-9 mt-1 flex items-center gap-1 text-xs text-neutral-400 hover:text-white font-medium transition-colors"
                         >
                             <span>{isExpanded ? 'Hide replies' : `View ${totalChildReplies - INITIAL_REPLY_LIMIT} more ${totalChildReplies - INITIAL_REPLY_LIMIT === 1 ? 'reply' : 'replies'}`}</span>
                             <motion.div
                                 animate={{ rotate: isExpanded ? 180 : 0 }}
                                 transition={{ duration: 0.2 }}
                             >
                                 <ChevronDownIcon className="w-3 h-3" />
                             </motion.div>
                         </button>
                     )}
                 </div>
             )}
        </div>
    );
};

// Updated User Rating Item Component
interface UserRatingItemProps {
  rating: UserRating;
  onReplyClick: (ratingId: string, parentReplyId?: string | null) => void;
  replyTarget: { ratingId: string; parentReplyId: string | null; parentAuthorName?: string | null; parentText?: string | null } | null;
  currentReplyText: string;
  isSubmittingReply: boolean;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  onReplyTextChange: (text: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void; // Prop to handle expansion toggle
  onDeleteReply: (replyId: string, ratingId: string) => void; // Pass down delete handler
  onDeleteRating: (ratingId: string) => void; // Keep existing prop
}

const UserRatingItem: React.FC<UserRatingItemProps> = ({
    rating,
    onReplyClick,
    replyTarget,
    currentReplyText,
    isSubmittingReply,
    onCancelReply,
    onSubmitReply,
    onReplyTextChange,
    isExpanded,
    onToggleExpand, // Destructure toggle handler
    onDeleteReply, // Destructure delete handler
    onDeleteRating
}) => {
  const INITIAL_REPLY_LIMIT = 1;

  // User and rating details extraction
  const displayRating = rating.rating;
  const fullStars = Math.floor(displayRating / 2);
  const hasHalfStar = displayRating % 2 !== 0;
  const user = rating.user; // User object from rating
  const userName = user?.display_name || rating.userName || 'User';
  const userImage = user?.profile_image || rating.userImage;
  const userProfileLink = user?.id ? `/user/${user.id}` : '#';

  // Determine if the top-level reply input should be shown
  const showTopLevelReplyInput = replyTarget?.ratingId === rating.id && replyTarget?.parentReplyId === null;

  // Calculate replies to display
  const allReplies = rating.replies || []; // All replies for this specific rating
  const topLevelReplies = allReplies.filter(reply => !reply.parent_reply_id)
                                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const totalTopLevelReplies = topLevelReplies.length;
  const canExpand = totalTopLevelReplies > INITIAL_REPLY_LIMIT;

  // Determine which replies are visible based on expansion state
  const visibleTopLevelReplies = canExpand && !isExpanded
      ? topLevelReplies.slice(0, INITIAL_REPLY_LIMIT)
      : topLevelReplies;

  const { data: session } = useSession();

  // --- Corrected Ownership Check for Rating ---
  const sessionSpotifyId = (session?.user as any)?.spotifyId;
  // Ensure rating.user exists before accessing spotify_id
  const isRatingOwner = !!sessionSpotifyId && !!rating.user && sessionSpotifyId === rating.user.spotify_id;
  // Debug log (optional):
  // console.log(`[UserRatingItem] Rating ID: ${rating.id}, Session Spotify ID: ${sessionSpotifyId}, Rating Author Spotify ID: ${rating.user?.spotify_id}, Is Owner: ${isRatingOwner}`);
  // --- End Correction ---
  
  return (
    <div className="bg-[#282828] p-4 rounded-lg shadow-md">
      {/* User Info and Rating Stars */}
      <div className="flex items-center justify-between mb-2">
        <Link href={userProfileLink} className="flex items-center gap-3 group/userlink">
          <UserAvatar imageUrl={userImage} username={userName} sizeClasses="w-8 h-8" />
          <span className="font-medium text-white group-hover/userlink:text-[#1DB954]">{userName}</span>
        </Link>
        <div className="flex items-center gap-1">
          {/* Readonly stars */}
          {[...Array(5)].map((_, index) => (
            <div key={index} className="text-yellow-400">
              {index < fullStars ? (
                 <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
              ) : index === fullStars && hasHalfStar ? (
                 <div className="relative w-4 h-4">
                    <svg className="w-full h-full text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                    <div className="absolute inset-0 overflow-hidden w-1/2"><svg className="w-full h-full text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg></div>
                 </div>
              ) : (
                 <svg className="w-4 h-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
              )}
            </div>
          ))}
          <span className="ml-1 text-xs font-medium text-yellow-400">({(displayRating / 2).toFixed(1)})</span>

          {/* Delete button for rating */}
          {isRatingOwner && (
               <button
                  onClick={() => onDeleteRating(rating.id)} // Call handler passed via props
                  className="ml-2 text-neutral-500 hover:text-red-500 transition-colors p-0.5 rounded"
                  title="Delete rating"
                  aria-label="Delete rating" // Accessibility
                >
                   <TrashIcon className="w-4 h-4" />
                </button>
          )}
        </div>
      </div>

      {/* Review Text */}
      {rating.review && (
        <p className="text-neutral-200 mt-2 mb-3 text-sm whitespace-pre-wrap">{rating.review}</p>
      )}

      {/* Date and Top-level Reply Button */}
      <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-neutral-500">
            {new Date(rating.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <button
            onClick={() => onReplyClick(rating.id, null)} // Open reply input for this rating
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
            title="Reply to this review"
          >
             <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4" />
             <span>Reply</span>
          </button>
      </div>

      {/* Top-Level Reply Input Form */}
      {showTopLevelReplyInput && (
          <div className="mt-4 pl-12">
              {replyTarget?.parentText && (
                  <div className="mb-2 p-2 border-l-2 border-neutral-600 bg-neutral-700/30 rounded-r-md">
                      <p className="text-xs text-neutral-400 italic line-clamp-2">{replyTarget.parentText}</p>
                  </div>
              )}
              {replyTarget?.parentAuthorName && (
                  <div className="text-xs text-neutral-500 mb-1 italic">Replying to {replyTarget.parentAuthorName}</div>
              )}
              {/* Textarea */}
              <textarea
                  rows={2}
                  className="w-full bg-[#333] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1DB954] resize-none placeholder-neutral-500"
                  placeholder={`Replying to ${replyTarget?.parentAuthorName || 'the review'}...`}
                  value={currentReplyText}
                  onChange={(e) => onReplyTextChange(e.target.value)}
                  disabled={isSubmittingReply}
                  autoFocus
              />
              {/* Buttons */}
              <div className="flex justify-end gap-2 mt-2">
                  <button
                     onClick={onCancelReply}
                     disabled={isSubmittingReply}
                     className="text-xs text-neutral-400 hover:text-white px-3 py-1 rounded hover:bg-neutral-700 transition-colors"
                   >
                      Cancel
                  </button>
                  <button
                     onClick={onSubmitReply}
                     disabled={!currentReplyText.trim() || isSubmittingReply}
                     className="flex items-center gap-1 bg-[#1DB954] text-black text-xs font-semibold px-3 py-1 rounded disabled:opacity-60 disabled:cursor-not-allowed hover:bg-opacity-90 transition-colors"
                   >
                       {isSubmittingReply ? 'Posting...' : (<><PaperAirplaneIcon className="w-3 h-3" /> Post Reply</>)}
                  </button>
              </div>
          </div>
      )}

      {/* Replies Section */}
      {(allReplies.length > 0) && (
          <div className="mt-4 border-t border-neutral-700/60 pt-3 space-y-3">
              {/* Map over VISIBLE TOP-LEVEL replies */}
              {visibleTopLevelReplies.map(reply => (
                      <ReplyItem
                        key={reply.id}
                        reply={reply}
                        allReplies={allReplies}
                        onReplyClick={onReplyClick}
                        level={0}
                        replyTarget={replyTarget}
                        currentReplyText={currentReplyText}
                        isSubmittingReply={isSubmittingReply}
                        onCancelReply={onCancelReply}
                        onSubmitReply={onSubmitReply}
                        onReplyTextChange={onReplyTextChange}
                        onDeleteReply={onDeleteReply}
                      />
              ))}

              {/* Show More/Less Button for Top-Level Replies */}
              {canExpand && (
                  <button
                      onClick={onToggleExpand}
                      className="flex items-center gap-1 text-xs text-[#1DB954] hover:text-green-400 font-medium transition-colors pt-1"
                  >
                      <span>{isExpanded ? 'Show less' : `Show all ${totalTopLevelReplies} replies`}</span>
                      <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                  </button>
              )}
          </div>
      )}
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
  const { id: trackId } = useParams();
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
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- State for Reply Input --- 
  const [replyTarget, setReplyTarget] = useState<{
     ratingId: string; 
     parentReplyId: string | null; 
     parentAuthorName?: string | null; 
     parentText?: string | null;
  } | null>(null);
  const [currentReplyText, setCurrentReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // --- MODIFICATION: State for managing expanded replies for each rating ---
  const [expandedRatings, setExpandedRatings] = useState<{ [ratingId: string]: boolean }>({});

  // --- MODIFICATION: Handler to toggle expansion state for a specific rating --- 
  const handleToggleRatingExpansion = (ratingId: string) => {
    setExpandedRatings(prev => ({
      ...prev,
      [ratingId]: !prev[ratingId] // Toggle the boolean value for the specific ID
    }));
  };
  
  const isCurrentTrackPlaying = playingTrack?.id?.toString() === track?.id?.toString() && isGlobalPlaying;
  
  // --- CORRECTED: Moved fetchTrackData inside component, wrapped with useCallback ---
  const fetchTrackData = useCallback(async () => {
    if (!trackId || typeof trackId !== 'string') return;
    // Reset states
        setLoading(true);
    setLoadingFavorite(true);
    setError(null);
    setTrack(null);
    setUserRating(0);
    setUserReview('');
    setAverageRating(0);
    setRatingCount(0);
    setCommunityRatings([]);
    setIsFavorited(false);
    setIsModalOpen(false);
    setReplyTarget(null);
    setCurrentReplyText('');

    try {
      // Fetch in parallel
      const [trackRes, ratingsRes, commRatingsRes, userRatingRes, favoriteStatusRes] = await Promise.all([
        fetch(`/api/tracks/${trackId}`), 
        fetch(`/api/ratings/average?itemId=${trackId}&itemType=track`), 
        fetch(`/api/ratings/item?itemId=${trackId}&itemType=track&limit=10`), 
        // Fetch user's rating if logged in
        session ? fetch(`/api/ratings?itemId=${trackId}&type=track`) : Promise.resolve(null),
        // Fetch favorite status if logged in
        session ? fetch(`/api/favorites/status?trackId=${trackId}`, { cache: 'no-store' }) : Promise.resolve(null)
      ]);

      // Handle Track Data
        if (!trackRes.ok) {
        const errorBody = await trackRes.text();
        console.error(`Failed API fetch for track ${trackId}: ${trackRes.status}`, errorBody);
        if (trackRes.status === 404) throw new Error('Track not found.');
        throw new Error(`Failed to fetch track data: ${trackRes.statusText}`);
        }
      const trackData: Track = await trackRes.json();
        setTrack(trackData);
        
      // Handle Average Ratings
        if (ratingsRes.ok) {
          const ratingsData = await ratingsRes.json();
          setAverageRating(ratingsData.average ? ratingsData.average * 2 : 0);
          setRatingCount(ratingsData.count || 0);
        }
        
      // Handle Community Ratings
        if (commRatingsRes.ok) {
          const ratingsData = await commRatingsRes.json();
        
        // --- Add Debug Log here ---
        console.log("[useEffect Debug] Raw ratingsData from API:", ratingsData);
        // --- End Debug Log ---
        
        const fetchedRatings: UserRating[] = (ratingsData.ratings || []).map((rating: any) => {
           console.log(`[useEffect Debug] Processing rating ID: ${rating.id}`); // Log rating ID
           const mappedReplies = (rating.replies || []).map((reply: any, index: number) => {
                // --- Add Debug Log for raw reply --- 
                console.log(`[useEffect Debug] Raw API reply object (Rating ${rating.id}, Index ${index}):`, reply);
                // --- End Debug Log ---
                
                // --- CORRECTED user_id assignment ---
                // Directly use reply.userId (or equivalent field name from API) 
                // instead of relying on the nested reply.user object.
                const replyAuthorUserId = reply.userId || reply.user_id; // Adjust based on actual API field name
                // Fallback if direct ID is missing, try the nested object (less likely to be correct now)
                const finalUserId = replyAuthorUserId || reply.user?.id;

                if (!finalUserId) {
                  console.warn(`[Data Mapping WARN] Could not determine user_id for reply ID ${reply.id}. Raw reply:`, reply);
                }
                // --- End Correction ---
                
                // Existing mapping logic (keep user object for display purposes if available):
                const userObject = reply.user || {}; // Keep for display name/image
                return {
                     id: reply.id,
                     rating_id: reply.ratingId, 
                     // --- Use the correctly determined user ID --- 
                     user_id: finalUserId || 'unknown-user-id-mapping-failed', // Assign the determined ID
                     parent_reply_id: reply.parentReplyId, 
                     reply_text: reply.replyText, 
                     created_at: reply.createdAt, 
                     updated_at: reply.updatedAt,
                     user: { // Keep the nested user object primarily for display info
                         id: userObject.id || finalUserId || 'unknown-user-id', 
                         spotify_id: userObject.spotify_id || 'unknown-spotify-id',
                         display_name: userObject.display_name || 'Unknown User', 
                         profile_image: userObject.profile_image || null
                     }
                } as Reply;
           });
           return {
             ...rating, // Spread other rating properties from API
             rating: rating.rating * 2, // Keep existing rating conversion
             replies: mappedReplies, // Use the correctly mapped replies
             // Ensure User object is also mapped if needed for UserRating type consistency
             userId: rating.userId,
             userName: rating.userName,
             userImage: rating.userImage,
             user: rating.user // Use the user object from the API rating
           };
        });
        setCommunityRatings(fetchedRatings);
      } else {
          console.warn("Failed to fetch community ratings or invalid format");
          setCommunityRatings([]);
      }

      // --- DEBUG: Handle User Rating --- 
      if (userRatingRes) { // Check if the fetch promise resolved (i.e., user was logged in)
        console.log("[fetchTrackData Debug] User Rating API Response Status:", userRatingRes.status);
        if (userRatingRes.ok) {
          try {
            const userRatingData = await userRatingRes.json();
            console.log("[fetchTrackData Debug] User Rating API Raw Data:", userRatingData);
            
            // Check if the API returned a valid rating value (expecting 0-5)
            if (typeof userRatingData.rating === 'number' && userRatingData.rating >= 0) { 
              const uiRating = userRatingData.rating * 2; // Convert API 0-5 to UI 0-10
              const reviewText = userRatingData.review || '';
              console.log(`[fetchTrackData Debug] Setting User Rating State: ${uiRating}, Review State: "${reviewText}"`);
              setUserRating(uiRating);
              setUserReview(reviewText);
            } else {
              // Handle cases where API response is OK but doesn't contain a rating (e.g., first time user)
              console.log("[fetchTrackData Debug] No valid rating found in API response. Setting state to default (0, '').");
              setUserRating(0); 
              setUserReview(''); 
            }
          } catch (jsonError) {
              console.error("[fetchTrackData Debug] Error parsing User Rating JSON:", jsonError);
              // Set default state on parsing error
              setUserRating(0);
              setUserReview('');
          }
        } else {
           console.warn(`[fetchTrackData Debug] User Rating API request failed: ${userRatingRes.status}`);
           // Set default state if fetch failed
           setUserRating(0);
           setUserReview('');
        }
      } else {
          console.log("[fetchTrackData Debug] User not logged in, skipping user rating fetch.");
          // Ensure defaults are set if no fetch was attempted
          setUserRating(0);
          setUserReview('');
      }
      // --- END DEBUG --- 

      // Handle Favorite Status (if fetched)
      if (favoriteStatusRes && favoriteStatusRes.ok) {
         const favData = await favoriteStatusRes.json();
         setIsFavorited(favData.isFavorited === true);
         console.log(`Track ${trackId} favorite status: ${favData.isFavorited}`);
      } else if (favoriteStatusRes && !favoriteStatusRes.ok) {
          console.warn(`Failed to fetch favorite status for track ${trackId}: ${favoriteStatusRes.status}`);
        }
        
      } catch (error) {
      console.error("Error fetching track detail data:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      setLoadingFavorite(false);
    }
  }, [trackId, session]); // Dependencies for useCallback
  // --- End corrected function placement ---

  // Fetch track data on initial load or when trackId/session changes
  useEffect(() => {
    fetchTrackData(); // Call the function defined above
  }, [fetchTrackData]); // Depend on the memoized fetch function
  
  
  // Submit rating and review
  const handleRatingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const itemIdToSubmit = track?.id;
    if (!session || !itemIdToSubmit) return;
    setIsSubmittingRating(true);
    try {
      console.log("Submitting rating with session:", !!session, "User ID:", session?.user?.id, "Item ID:", itemIdToSubmit);
      
      if (typeof userRating !== 'number' || userRating < 0 || userRating > 10) {
        throw new Error('Invalid rating value');
      }
      
      // Convert rating from UI scale (0-10) to API scale (0-5)
      const apiRating = userRating / 2;
      
      console.log(`Converting rating from ${userRating} (0-10 scale) to ${apiRating} (0-5 scale) for item ${itemIdToSubmit}`);
      
      // --- Call the POST endpoint (Upsert) --- 
      const postResponse = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemIdToSubmit,
          itemType: 'track',
          rating: apiRating, 
          review: userReview
        }),
      });
      
      console.log(`Rating POST response status: ${postResponse.status}`);
      
      if (!postResponse.ok) {
        const errorData = await postResponse.json().catch(() => null);
        const errorMessage = errorData?.error || await postResponse.text();
        console.error("Rating submission/update failed:", errorMessage);
        throw new Error(`Failed to submit/update rating: ${errorMessage}`);
      }
      
      const postResult = await postResponse.json();
      console.log("Rating POST result:", postResult);
      
      // --- REFETCH USER'S OWN RATING TO UPDATE STATE --- 
      console.log("Refetching user's rating after submission...");
      const userRatingRes = await fetch(`/api/ratings?itemId=${itemIdToSubmit}&type=track`);
      if (userRatingRes.ok) {
         const userRatingData = await userRatingRes.json();
         console.log("Refetched user rating data:", userRatingData);
         setUserRating(userRatingData.rating ? userRatingData.rating * 2 : 0); // Update state (convert back to 0-10)
         setUserReview(userRatingData.review || ''); // Update state
      } else {
          console.warn(`Failed to refetch user rating: ${userRatingRes.status}`);
          // Optionally handle refetch failure, though UI might just not update
      }
      // --- END REFETCH --- 
      
      // --- Refetch community/average data (Keep existing logic) --- 
      setSuccessMessage(postResult.message || "Rating saved successfully!"); // Use message from API
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      const avgResponse = await fetch(`/api/ratings/average?itemId=${itemIdToSubmit}&itemType=track`);
      if (avgResponse.ok) {
        const avgData = await avgResponse.json();
        setAverageRating(avgData.average ? avgData.average * 2 : 0);
        setRatingCount(avgData.count || 0);
      }
      
      // Refetch community ratings to potentially show the updated review immediately
      const ratingsResponse = await fetch(`/api/ratings/item?itemId=${itemIdToSubmit}&itemType=track&limit=10`);
      if (ratingsResponse.ok) {
        const ratingsData = await ratingsResponse.json();
        // Re-map community ratings (ensure mapping logic is correct)
        const fetchedRatings: UserRating[] = (ratingsData.ratings || []).map((rating: any) => {
             // Use the existing mapping logic from fetchTrackData's useEffect
             // ... (mapping logic as defined previously) ...
            const mappedReplies = (rating.replies || []).map((reply: any) => {
                const replyAuthorUserId = reply.userId || reply.user_id;
                const finalUserId = replyAuthorUserId || reply.user?.id;
                const userObject = reply.user || {};
                return {
                     id: reply.id,
                     rating_id: reply.ratingId,
                     user_id: finalUserId || 'unknown-user-id-mapping-failed',
                     parent_reply_id: reply.parentReplyId,
                     reply_text: reply.replyText,
                     created_at: reply.createdAt,
                     updated_at: reply.updatedAt,
                     user: { 
                         id: userObject.id || finalUserId || 'unknown-user-id',
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
          console.warn("Failed to refetch community ratings after submission.");
      }
      // --- End Refetch community/average --- 
      
    } catch (err) {
      console.error("Error during rating submission process:", err);
      toast.error("Failed to save rating. Please try again."); // Use toast for error
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

  const handleToggleFavorite = async () => {
    if (!session || !track || loadingFavorite) return;
    const currentIsFavorited = isFavorited;
    setLoadingFavorite(true);
    setIsFavorited(!currentIsFavorited); 
    try {
      const response = await fetch('/api/favorites', {
        method: currentIsFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setIsFavorited(currentIsFavorited); 
        const errorData = await response.json().catch(() => ({ error: 'Failed to update favorite status' }));
        console.error("Favorite toggle failed:", errorData);
        // Add user feedback (e.g., toast)
        alert(`Error: ${errorData.error || 'Could not update favorite status.'}`);
      } else {
         // Success - UI already updated optimistically
         console.log(`Track ${currentIsFavorited ? 'removed from' : 'added to'} favorites`);
          // Optional: Show success feedback (e.g., toast)
      }
    } catch (error) {
      // Revert optimistic update on network error
      setIsFavorited(currentIsFavorited); 
      console.error("Error toggling favorite:", error);
      alert('An error occurred. Please try again.');
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
      if (!session) {
          signIn('spotify');
          return;
      }
      
      let parentAuthorName: string | null = null;
      let parentText: string | null = null;

      const parentRating = communityRatings.find(r => r.id === ratingId);
      if (!parentRating) return;

      if (parentReplyId) {
          const parentReply = parentRating.replies?.find(rep => rep.id === parentReplyId);
          parentAuthorName = parentReply?.user?.display_name || null;
          parentText = parentReply?.reply_text || null;
      } else {
          parentAuthorName = parentRating.user?.display_name || parentRating.userName || null;
          parentText = parentRating.review || null;
      }
      
      setReplyTarget({ ratingId, parentReplyId, parentAuthorName, parentText });
      setCurrentReplyText('');
  };

  const handleCancelReply = () => {
      setReplyTarget(null);
      setCurrentReplyText('');
  };

  const handleReplySubmit = async () => {
      if (!session || !currentReplyText.trim() || !replyTarget) return;
      setIsSubmittingReply(true);
      try {
          console.log(`Submitting reply to rating ${replyTarget.ratingId}, parent reply ${replyTarget.parentReplyId}`);
          const response = await fetch('/api/ratings/replies', {
          method: 'POST',
              headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
                  ratingId: replyTarget.ratingId,
                  replyText: currentReplyText,
                  parentReplyId: replyTarget.parentReplyId // Send correct parent ID
              })
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Failed to post reply (${response.status})`);
          }

          const newReplyResponse = await response.json();
          const newReplyData = newReplyResponse.reply;
          if (!newReplyData || !newReplyData.id) { throw new Error('Invalid reply data received'); }

          // --- FIX: Ensure state update includes parent_reply_id from API --- 
          const formattedNewReply: Reply = {
               id: newReplyData.id,
               rating_id: newReplyData.ratingId, 
               user_id: newReplyData.userId,
               parent_reply_id: newReplyData.parentReplyId, // Use value from API response!
               reply_text: newReplyData.replyText,
               created_at: newReplyData.createdAt,
               updated_at: newReplyData.updatedAt,
                // Ensure user object is structured correctly for Reply type
               user: newReplyData.user ? { // Use user object from API if present
                  id: newReplyData.user.id, 
                  // --- MODIFICATION: Ensure spotify_id is included --- 
                  spotify_id: newReplyData.user.spotify_id,
                  display_name: newReplyData.user.display_name || 'Unknown',
                  profile_image: newReplyData.user.profile_image || null
               } : { // Fallback if user object missing in API response
                  id: newReplyData.userId || 'unknown',
                  spotify_id: 'unknown-spotify-id', // Add fallback spotify_id
                  display_name: newReplyData.userName || 'Unknown',
                  profile_image: newReplyData.userImage || null
               }
           };

          setCommunityRatings(prevRatings => 
              prevRatings.map(rating => {
                  if (rating.id === replyTarget.ratingId) {
                      // Add the new reply to the existing replies array for this rating
                      const updatedReplies = [...(rating.replies || []), formattedNewReply];
                      return {
                          ...rating,
                          replies: updatedReplies 
                      };
                  }
                  return rating;
              })
          );
          toast.success("Reply posted!");
          handleCancelReply();
    } catch (err) {
          console.error("Error submitting reply:", err);
          toast.error(`Failed to post reply: ${err instanceof Error ? err.message : 'Unknown error'}`);
       } 
      finally { setIsSubmittingReply(false); }
  };

  // --- DELETE Reply Handler ---
  const handleDeleteReply = async (replyId: string, ratingId: string) => {
      // Ensure user is logged in
       if (!session) {
          toast.error("You must be logged in to delete a reply.");
          signIn('spotify');
          return;
       }

      console.log(`Attempting to delete reply ${replyId} for rating ${ratingId}`);
      // Find the reply text for confirmation message
      const ratingToDeleteFrom = communityRatings.find(r => r.id === ratingId);
      const replyToDelete = ratingToDeleteFrom?.replies?.find(r => r.id === replyId);
      const confirmText = replyToDelete
          ? `Are you sure you want to delete this reply: "${replyToDelete.reply_text.substring(0, 50)}..."? This cannot be undone.`
          : 'Are you sure you want to delete this reply? This cannot be undone.';

      if (!window.confirm(confirmText)) {
          return; // User cancelled
      }

      try {
          const response = await fetch(`/api/ratings/replies/${replyId}`, {
              method: 'DELETE'
              // No body needed, auth is via session cookie
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              // Provide more specific feedback based on status
              if (response.status === 403) {
                   throw new Error(errorData.error || 'You are not authorized to delete this reply.');
              } else if (response.status === 404) {
                   throw new Error(errorData.error || 'Reply not found.');
      } else {
                  throw new Error(errorData.error || `Failed to delete reply (${response.status})`);
              }
          }

          // Update state locally to remove the reply IMMUTABLY
          setCommunityRatings(prevRatings =>
              prevRatings.map(rating => {
                  if (rating.id === ratingId) {
                      // Filter out the deleted reply from this rating's replies
                      const updatedReplies = (rating.replies || []).filter(r => r.id !== replyId);
                       // Return a new rating object with the filtered replies
                       return {
                           ...rating,
                           replies: updatedReplies
                       };
                  }
                  return rating; // Return other ratings unchanged
              })
          );

          toast.success('Reply deleted');

      } catch (err) {
          console.error("Error deleting reply:", err);
          toast.error(`Failed to delete reply: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
  };

  // --- DELETE Rating Handler (ensure ownership check is correct) ---
  const handleDeleteRating = async (ratingId: string) => {
      // Ensure user is logged in
       if (!session) {
          toast.error("You must be logged in to delete a rating.");
          signIn('spotify');
          return;
       }

      console.log(`Attempting to delete rating ${ratingId}`);
      const ratingToDelete = communityRatings.find(r => r.id === ratingId);
       // --- FIX: Access spotify_id from the nested user object for confirmation ---
       const isOwner = ratingToDelete?.user?.spotify_id === (session.user as any)?.spotifyId;

       // Double-check ownership before confirming (API does final check)
       if (!isOwner) {
           toast.error("You cannot delete a rating you did not create.");
           return;
       }

      const confirmText = ratingToDelete?.review
          ? `Are you sure you want to delete this rating and all its replies: "${ratingToDelete.review.substring(0, 50)}..."? This cannot be undone.`
          : 'Are you sure you want to delete this rating and all its replies? This cannot be undone.';

      if (!window.confirm(confirmText)) {
          return; // User cancelled
      }

      try {
          const response = await fetch(`/api/ratings/delete/${ratingId}`, { // Ensure this endpoint exists and handles auth
              method: 'DELETE'
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
               if (response.status === 403) {
                    throw new Error(errorData.error || 'You are not authorized to delete this rating.');
               } else if (response.status === 404) {
                    throw new Error(errorData.error || 'Rating not found.');
               } else {
                   throw new Error(errorData.error || `Failed to delete rating (${response.status})`);
               }
          }

          toast.success('Rating deleted');

          // Refetch all data to ensure consistency after deletion
          // This is simpler and safer than trying to manually update average/count/user rating state
          await fetchTrackData(); // Call the correctly scoped function

      } catch (err) {
          console.error("Error deleting rating:", err);
          toast.error(`Failed to delete rating: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
  };

  // Loading and Error states handled inside return
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
                         {/* CORRECTED SVG PATH */}
                         <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm6.091 17.168c-.203.323-.604.431-.927.229-2.545-1.571-5.74-1.915-10.087-1.027-.378.08-.704-.163-.784-.54-.08-.377.163-.704.54-.784 4.723-.97 8.267-.578 11.175 1.188.323.202.43.604.229.927zm1.312-3.012c-.272.38-.76.503-1.14.272-2.923-1.788-7.366-2.328-10.78-1.245-.43.108-.897-.108-1.005-.539-.108-.43.108-.897.539-1.005 3.79-.97 8.608-.377 11.938 1.694.378.229.495.717.272 1.1zm.108-3.043c-3.253-2.08-8.64-2.296-12.05-.97-.539.163-1.083-.163-1.246-.659-.163-.539.163-1.083.659-1.246 3.847-1.14 9.813-.897 13.607 1.465.475.272.65.856.378 1.287-.272.43-.857.608-1.287.378z"/>
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
                         <div key={rating.id}>
                             <UserRatingItem
                                rating={rating}
                                onReplyClick={handleOpenReplyInput}
                                replyTarget={replyTarget}
                                currentReplyText={currentReplyText}
                                isSubmittingReply={isSubmittingReply}
                                onCancelReply={handleCancelReply}
                                onSubmitReply={handleReplySubmit}
                                onReplyTextChange={setCurrentReplyText}
                                isExpanded={expandedRatings[rating.id] || false}
                                onToggleExpand={() => handleToggleRatingExpansion(rating.id)}
                                onDeleteReply={handleDeleteReply}
                                onDeleteRating={handleDeleteRating}
                             />
                         </div>
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
                    className="flex items-center hover:bg-[#282828] transition-colors p-2 rounded-lg w-full group/albumlink"
                  >
                    <div className="w-16 h-16 mr-4 shrink-0">
                      <img 
                        src={track.album?.images?.[0]?.url || '/placeholder.png'} 
                        alt={track.album?.name || ''}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-400">From the album</p>
                      <p className="font-bold text-white truncate group-hover/albumlink:text-[#1DB954] transition-colors">{track.album?.name}</p>
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