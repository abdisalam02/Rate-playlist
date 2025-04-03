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
  topTracks: '/api/community/top-rated?type=track', // Get top rated tracks in community
  topAlbums: '/api/community/top-rated?type=album', // Get top rated albums in community
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
  tracks: '/api/spotify/track/[id]', // Get track details
  albums: '/api/spotify/album/[id]', // Get album details
  search: '/api/spotify/search', // Search Spotify
  lyrics: '/api/lyrics/[id]', // Get lyrics for a track
  playlists: '/api/spotify/playlist/[id]', // Get playlist details
};

// Discover endpoints
export const discoverEndpoints = {
  newReleases: '/api/discover/new-releases',
  featuredPlaylists: '/api/discover/featured-playlists',
  popularTracks: '/api/discover/popular-tracks',
  popularAlbums: '/api/discover/popular-albums',
  userRecommendations: '/api/discover/user-recommendations',
  topStreamed: '/api/discover/top-streamed',
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
  spotifyClientToken: '/api/auth/spotify-client-token', // Get Spotify client token
};

// Debug endpoints (not for production use)
export const debugEndpoints = {
  session: '/api/debug-session', // Debug session info
  debug: '/api/debug', // General debug info
};

// Setup and maintenance endpoints
export const setupEndpoints = {
  database: '/api/setup/db', // Database setup and management
  moods: '/api/setup/moods', // Initial moods setup
};

// Resource endpoints
export const resourceEndpoints = {
  favicon: '/api/favicon', // Serve favicon assets
  icons: '/api/icons', // Serve icon assets
};

// Diagnostic endpoints
export const diagnosticEndpoints = {
  status: '/api/diagnostic/status', // Check system status
  performance: '/api/diagnostic/performance', // System performance metrics
};

/**
 * Usage example:
 * 
 * import { userEndpoints, spotifyEndpoints } from '@/app/index';
 * 
 * // Then in your component
 * fetch(userEndpoints.profile)
 *   .then(res => res.json())
 *   .then(data => console.log(data));
 * 
 * // Or for Spotify data
 * fetch(`${spotifyEndpoints.playlists.replace('[id]', playlistId)}`)
 *   .then(res => res.json())
 *   .then(data => console.log(data));
 */ 