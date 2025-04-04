// spotify/src/types/index.ts

import { Session } from 'next-auth';

// Interface for Artist data (used in Track and Album)
export interface Artist {
  id?: string; // Optional as sometimes only name is available
  name: string;
  // Add other artist properties if needed
}

// Interface for Image data (used in Track and Album)
export interface Image {
  url: string;
  height?: number;
  width?: number;
}

// Interface for Album data (used in Track)
export interface Album {
  id?: string;
  name?: string;
  title?: string; // Deezer specific title
  images?: Image[];
  cover_medium?: string; // Deezer specific image URL
  artists?: Artist[];
  release_date?: string;
  // Add other album properties if needed
}

// Consolidated Track Interface
export interface Track {
  id: string | number;
  name?: string; // Spotify uses name
  title?: string; // Deezer uses title
  artists?: Artist[];
  artist?: Artist; // Deezer specific (single artist)
  contributors?: Artist[]; // Deezer specific
  album?: Album;
  duration?: number; // Deezer duration in seconds
  duration_ms?: number; // Spotify duration in milliseconds
  preview?: string; // Deezer preview URL
  preview_url?: string | null; // Can be null (Spotify)
  // Add missing optional fields used in track detail page
  explicit?: boolean;
  external_urls?: {
    spotify?: string;
  };
  requires_auth?: boolean; // If fetching requires Spotify auth
  popularity?: number;
}

// User Profile Interface
export interface UserProfile {
  id: string;
  display_name?: string;
  email?: string;
  images?: Image[];
  followers?: { total: number };
  country?: string;
  product?: string;
  // Add any custom fields you store
  bio?: string;
  created_at?: string;
}

// Rating Interface (generic for track/album)
export interface Rating {
  id?: string; // Optional: may not be present before creation
  user_id: string;
  item_id: string;
  item_type: 'track' | 'album';
  rating: number; // Store rating consistently (e.g., 1-5 or 1-10)
  review?: string;
  created_at?: string; // Handled by database
  user?: { // Include basic user info for display
    name?: string;
    image?: string;
  };
}

// Activity Interface
export interface Activity {
  id: string;
  user_id: string;
  type: 'rating' | 'follow' | 'comment'; // Example types
  target_id?: string; // ID of the track/album/user related to the activity
  target_type?: 'track' | 'album' | 'user';
  content?: string; // e.g., the review text, or "started following X"
  created_at: string;
  user?: UserProfile; // User who performed the activity
  // Optional: Include details about the target item
  track?: Track; 
  album?: Album;
  followed_user?: UserProfile; 
}

// Combined Session Type (if needed)
export interface AppSession extends Session {
  user?: {
    id?: string | null; // Add Supabase user ID if available
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string; // Spotify access token
  refreshToken?: string; // Spotify refresh token
  accessTokenExpires?: number;
  error?: string;
}

// Interface for items that can be rated (Tracks or Albums)
export interface RatableItem {
  id: string | number;
  type: 'track' | 'album';
  name?: string; 
  title?: string; // Allow both name/title
  artists?: Artist[];
  contributors?: Artist[]; 
  artist?: Artist;
  images?: Image[]; // Use Album images if Track images aren't directly available
  album?: Album; // Include album for tracks
  preview_url?: string | null; // For track previews
  preview?: string;
  duration?: number;
  duration_ms?: number;
  release_date?: string; // From album
}

// Add other shared types below (e.g., User, Rating, Activity) if needed 