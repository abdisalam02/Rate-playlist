# Spotify App Pages Map

This document provides an overview of all pages and routes in the application, describing their functionality and purpose.

## Main Pages

### `/app/page.tsx`
- **Home Page**: Main landing page displaying:
  - Featured tracks from popular playlists
  - Trending tracks
  - Top-rated albums
  - New releases
  - Community activity feed
- Uses real-time data fetching with fallback to mock data
- Includes audio preview functionality

### `/app/discover/page.tsx`
- **Discover Page**: Showcases various music discovery sections:
  - New releases
  - Popular albums
  - Popular tracks  
  - User recommendations
  - Top streamed tracks
- Implements responsive grid layouts and animations
- Handles loading states and errors gracefully

### `/app/community/activity/page.tsx`
- **Community Activity**: Displays user activity across the platform:
  - Ratings
  - Reviews
  - Playlist creation
  - Follow actions
- Includes user carousel and filtering options
- Implements virtual scrolling for performance

### `/app/my-ratings/page.tsx`
- **My Ratings**: Shows the user's ratings history:
  - Rated tracks and albums
  - Sort and filter options
  - Rating statistics and history
- Allows users to manage their ratings

### `/app/setup/page.tsx`
- **Setup Page**: Application setup and maintenance:
  - Database configuration
  - Initial data import
  - Mood presets configuration
- Admin-only access for system setup

## Music Content Pages

### `/app/track/[id]/page.tsx`
- **Track Detail**: Shows detailed information about a specific track:
  - Track metadata
  - Audio preview
  - Rating/review functionality
  - Comments and community ratings
  - Artist info and related tracks

### `/app/album/[id]/page.tsx`
- **Album Detail**: Displays album information:
  - Track listing
  - Album metadata
  - Rating functionality
  - Release info and artist details

### `/app/playlist/[id]/page.tsx`
- **Playlist Detail**: Shows playlist contents:
  - Track listing with playback controls
  - Playlist metadata
  - Creator info
  - Follow/save functionality

### `/app/artist/[id]/page.tsx`
- **Artist Detail**: Displays artist information:
  - Top tracks
  - Albums
  - Related artists
  - Follow functionality

### `/app/playlists/page.tsx`
- **Playlists Library**: Shows all available playlists:
  - User's playlists
  - Featured playlists
  - Community playlists
  - Playlist filtering and search

### `/app/lyrics/[id]/page.tsx`
- **Lyrics View**: Displays lyrics for a track:
  - Synced lyrics when available
  - Track playback controls
  - Related track information

## Game/Interactive Pages

### `/app/guess/page.tsx`
- **Guess the Song**: Interactive game:
  - Audio clip playback
  - Multiple choice selection
  - Scoring and leaderboard
  - Difficulty settings

### `/app/versus/page.tsx`
- **Versus Mode**: Song comparison game:
  - Track vs. track voting
  - Tournament brackets
  - Community results

### `/app/rate/page.tsx`
- **Quick Rate**: Rapid rating interface:
  - Swipe interface for quick ratings
  - Personalized track suggestions
  - Rating streaks and rewards

## User Pages

### `/app/profile/page.tsx`
- **User Profile**: Shows authenticated user's profile:
  - Recent activity
  - Favorite tracks/albums
  - Created playlists
  - Following/followers
  
### `/app/user/[id]/page.tsx`
- **Public User Profile**: Displays public profile for any user:
  - Public activity
  - Public playlists
  - Rating history

### `/app/login/page.tsx`
- **Login Page**: Authentication entry point:
  - Spotify OAuth login
  - Session management
  - User onboarding

### `/app/add-playlist/page.tsx`
- **Add Playlist**: Interface for adding playlists:
  - Spotify playlist import
  - Custom playlist creation
  - Track selection

## API Routes

### `/app/api/spotify/`
- **Spotify API Routes**: Proxies for Spotify Web API
  - `/track/[id]`: Get track details
  - `/album/[id]`: Get album details
  - `/playlist/[id]`: Get playlist details
  - `/search`: Search Spotify catalog

### `/app/api/community/`
- **Community API Routes**: Handles community data
  - `/users`: Get community users
  - `/activity`: Get community activity feed
  - `/top-rated`: Get top-rated tracks/albums

### `/app/api/discover/`
- **Discovery API Routes**: Handles discovery features
  - `/new-releases`: Get new releases
  - `/featured-playlists`: Get featured playlists
  - `/popular-tracks`: Get popular tracks
  - `/popular-albums`: Get popular albums
  - `/user-recommendations`: Get personalized recommendations
  - `/top-streamed`: Get top streamed tracks

### `/app/api/user/`
- **User API Routes**: Handles user-specific data
  - `/profile`: Get user profile
  - `/ratings`: Get user ratings
  - `/top-items`: Get user's top items
  - `/recently-played`: Get recently played tracks
  - `/stats`: Get user statistics

### `/app/api/ratings/`
- **Ratings API Routes**: Handles rating functionality
  - `/`: Create/get ratings
  - `/[id]`: Get specific rating
  - `/average`: Get average rating for an item
  - `/item`: Get all ratings for an item

### `/app/api/setup/`
- **Setup API Routes**: System setup and maintenance
  - `/db/apply-sql`: Apply SQL migrations to database
  - `/moods/simple`: Set up simple mood presets
  - `/moods/direct`: Direct mood configuration

### `/app/api/diagnostic/`
- **Diagnostic API Routes**: System diagnostics
  - `/status`: Check system status
  - `/performance`: System performance metrics

### `/app/api/favicon/` & `/app/api/icons/`
- **Resource API Routes**: Serve application resources
  - Dynamic icon and favicon handling
  - Asset optimization

## Authentication

### `/app/api/auth/`
- **Auth Routes**: Handles authentication
  - `/callback`: OAuth callback
  - `/session`: Get current session
  - `/spotify-client-token`: Get Spotify client token

## Components and Providers

### `/app/components/`
- **Shared Components**: Reusable UI components
  - `Navbar.tsx`: Main navigation
  - `ActivityFeed.tsx`: Activity feed component
  - `TopHits2024.tsx`: Featured top hits component
  - `AuthNav.tsx`: Authentication-aware navigation
  - `TokenRefresher.tsx`: Automatic token refresh component
  - `SpeechBubble.tsx`: Speech bubble UI component
  - Various UI components (cards, buttons, etc.)

### `/app/providers.tsx`
- **Providers**: Context providers for the application
  - Audio context for music playback
  - Theme context
  - Other global state management

## Utility Functions

### `/app/utils/`
- **Utility Functions**: Helper functions
  - `api.ts`: API helpers
  - `formatters.ts`: Data formatting utilities
  - Other utility functions

## Configuration

### `/app/index.ts`
- **API Routes Index**: Central file for API endpoint definitions
- Organizes all API routes into categories for easy reference 