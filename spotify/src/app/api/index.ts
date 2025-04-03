/**
 * API Routes Index
 * 
 * This file serves as documentation for all API routes in the application.
 * It helps organize and keep track of the various endpoints available.
 */

// User-related endpoints
export const userEndpoints = {
  // Profile endpoints
  profile: '/api/user/profile', // Get user profile
  ratings: '/api/user/ratings', // Get user ratings
  
  // Spotify API proxies
  topItems: '/api/user/top-items', // Get user's top tracks/artists
  recentlyPlayed: '/api/user/recently-played', // Get recently played tracks
  albums: '/api/user/albums', // Get user's saved albums
  
  // Other user endpoints
  stats: '/api/user/stats', // Get user statistics
};

// Community endpoints
export const communityEndpoints = {
  users: '/api/community/users', // Get all users
  activity: '/api/community/activity', // Get community activity
  playlists: '/api/community/playlists', // Get community playlists
  topTracks: '/api/community/top-tracks', // Get top rated tracks in community
  topAlbums: '/api/community/top-albums', // Get top rated albums in community
};

// Ratings endpoints
export const ratingsEndpoints = {
  create: '/api/ratings', // Create a rating
  get: '/api/ratings/[id]', // Get a specific rating
  average: '/api/ratings/average', // Get average rating for an item
  itemRatings: '/api/ratings/item', // Get all ratings for an item
};

// Spotify API proxies
export const spotifyEndpoints = {
  tracks: '/api/tracks/[id]', // Get track details
  albums: '/api/albums/[id]', // Get album details
  search: '/api/spotify/search', // Search Spotify
  lyrics: '/api/lyrics/[id]', // Get lyrics for a track
  playlists: '/api/playlists/[id]', // Get playlist details
};

// Miscellaneous endpoints
export const miscEndpoints = {
  comments: '/api/comments', // Get/post comments
  favorites: '/api/favorites', // Manage favorites
  checkFavorite: '/api/check-favorite', // Check if item is favorited
  discover: '/api/discover', // Get discovery recommendations
};

// Authentication endpoints
export const authEndpoints = {
  callback: '/api/auth/callback', // OAuth callback
  session: '/api/auth/session', // Get current session
};

// Debug endpoints (not for production use)
export const debugEndpoints = {
  session: '/api/debug-session', // Debug session info
  debug: '/api/debug', // General debug info
};

/**
 * Usage example:
 * 
 * import { userEndpoints } from '@/app/api';
 * 
 * // Then in your component
 * fetch(userEndpoints.profile)
 *   .then(res => res.json())
 *   .then(data => console.log(data));
 */ 