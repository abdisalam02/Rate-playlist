'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

// Define our own getApiUrl function instead of importing it
function getApiUrl(path: string) {
  // When running on client side, get the current origin with port
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    console.log(`Activity feed client-side API URL: ${currentOrigin}${path}`);
    return `${currentOrigin}${path}`;
  }
  
  // During SSR, use the host from environment or default to localhost:3001
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log(`Activity feed server-side API URL: ${baseUrl}${path}`);
  return `${baseUrl}${path}`;
}

// Activity feed item types
interface Activity {
  id?: string;
  activity_id?: string; // Support both id formats
  user_id: string;
  user_name: string;
  user_image: string;
  activity_type: 'rating' | 'review' | 'playlist_create' | 'follow';
  item_id: string;
  item_type: 'track' | 'album' | 'playlist' | 'user';
  item_name: string;
  item_image: string;
  item_artists?: string;
  rating?: number;
  review?: string;
  created_at: string;
}

// Utility function for relative time
const getTimeAgo = (date: string) => {
  const now = new Date();
  const activityDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return activityDate.toLocaleDateString();
};

// Star rating display component
const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex text-yellow-400">
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={star} className={`text-xs ${star <= Math.round(rating) ? 'text-[#1DB954]' : 'text-gray-600'}`}>
                  ★
                </span>
              ))}
    <span className="text-xs text-gray-300 ml-1">{rating.toFixed(1)}</span>
  </div>
);

// Individual activity item component
const ActivityItem = ({ activity }: { activity: Activity }) => {
  const getActivityText = () => {
    switch (activity.activity_type) {
      case 'rating':
        return `rated ${activity.item_type === 'track' ? 'the song' : activity.item_type}`;
      case 'review':
        return `reviewed ${activity.item_type === 'track' ? 'the song' : activity.item_type}`;
      case 'playlist_create':
        return 'created a playlist';
      case 'follow':
        return 'followed';
      default:
        return 'interacted with';
    }
  };
    
      return (
    <motion.div
                initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#181818] hover:bg-[#282828] p-4 rounded-lg mb-3 transition-colors"
              >
                <div className="flex items-start gap-3">
        <Link href={`/user/${activity.user_id}`}>
                      <Image
            src={activity.user_image || "/default-avatar.png"}
            alt={`Profile image of ${activity.user_name}`}
            width={40}
            height={40}
            className="rounded-full"
          />
                  </Link>
                  
                  <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1">
            <Link href={`/user/${activity.user_id}`} className="font-semibold hover:underline">
              {activity.user_name}
            </Link>
            <span className="text-gray-400">{getActivityText()}</span>
            <Link href={`/${activity.item_type}/${activity.item_id}`} className="font-medium text-[#1DB954] hover:underline">
              {activity.item_name}
                      </Link>
                    </div>
                    
          {activity.item_artists && (
            <p className="text-gray-400 text-sm truncate mt-1">
              {activity.item_artists}
                    </p>
          )}
                    
          {activity.rating && (
                      <div className="mt-2">
              <StarDisplay rating={activity.rating} />
                      </div>
                    )}
                    
          {activity.review && (
                      <div className="mt-2">
              <p className="text-gray-300 text-sm">{activity.review}</p>
                      </div>
              )}
          
          <p className="text-gray-500 text-xs mt-2">
            {getTimeAgo(activity.created_at)}
          </p>
            </div>
        
        <Link href={`/${activity.item_type}/${activity.item_id}`} className="flex-shrink-0">
          <div className="w-12 h-12 rounded-md overflow-hidden">
            <Image
              src={activity.item_image || "/placeholder-art.png"}
              alt={`${activity.item_type === 'track' ? 'Track' : activity.item_type.charAt(0).toUpperCase() + activity.item_type.slice(1)} artwork for ${activity.item_name}`}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
        </Link>
        </div>
    </motion.div>
  );
};

// Activity skeleton loading component
const ActivitySkeleton = () => (
  <div className="bg-[#181818] p-4 rounded-lg mb-3 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-700"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/3 mt-2"></div>
      </div>
      <div className="w-12 h-12 rounded-md bg-gray-700"></div>
    </div>
    </div>
  );

// Main activity feed component
export default function ActivityFeed({ limit = 5 }: { limit?: number }) {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(getApiUrl(`/api/community/activity?limit=${limit}`), {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch activity');
        }
        
        const data = await response.json();
        
        // Handle both response formats: an array directly or {activities: [...]}
        if (data && data.activities && Array.isArray(data.activities)) {
          setActivities(data.activities);
        } else if (data && Array.isArray(data)) {
          setActivities(data);
        } else {
          console.error('Invalid activity data format:', data);
          setActivities([]);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivities();
  }, [limit]);
  
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => (
          <ActivitySkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (activities.length === 0) {
    return (
      <div className="text-center p-4 bg-[#181818] rounded-lg">
        <p className="text-gray-400">No recent activity</p>
        <Link href="/community" className="text-[#1DB954] hover:underline mt-2 inline-block">
          Explore community
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem 
          key={activity.id || activity.activity_id} 
          activity={activity} 
        />
      ))}
    </div>
  );
} 