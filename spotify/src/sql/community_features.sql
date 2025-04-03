-- PLAYLIST THEME SYSTEM

-- Table for playlist themes/categories
CREATE TABLE playlist_themes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'mood', 'activity', 'time', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for community playlists
CREATE TABLE community_playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES playlist_themes(id) ON DELETE SET NULL,
  is_collaborative BOOLEAN DEFAULT FALSE,
  votes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracks within playlists
CREATE TABLE playlist_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES community_playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL, -- Spotify track ID
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for playlist upvotes/downvotes
CREATE TABLE playlist_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES community_playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_upvote BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, user_id)
);

-- SOCIAL FEATURES

-- Table for following relationships
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Table for user activity feed
CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'rating', 'review', 'playlist_create', 'follow', etc.
  item_id TEXT, -- ID of the affected item (track, album, playlist, etc.)
  item_type TEXT, -- 'track', 'album', 'playlist', etc.
  rating NUMERIC(3,1), -- Used for rating activities
  review TEXT, -- Used for review activities
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REAL-TIME FEATURES

-- Enable row-level security for all tables
ALTER TABLE playlist_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Playlist themes - anyone can read, only authenticated users can create
CREATE POLICY "Playlist themes are viewable by everyone" 
  ON playlist_themes FOR SELECT USING (true);
  
CREATE POLICY "Authenticated users can create playlist themes" 
  ON playlist_themes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Community playlists - anyone can read, only owner can update/delete
CREATE POLICY "Community playlists are viewable by everyone" 
  ON community_playlists FOR SELECT USING (true);
  
CREATE POLICY "Users can create their own playlists" 
  ON community_playlists FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);
  
CREATE POLICY "Users can update their own playlists" 
  ON community_playlists FOR UPDATE USING (auth.uid()::text = creator_id::text);
  
CREATE POLICY "Users can delete their own playlists" 
  ON community_playlists FOR DELETE USING (auth.uid()::text = creator_id::text);

-- Similar policies for other tables...

-- Create index for performance
CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON user_activities(created_at);
CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);

-- Sample data for playlist themes
INSERT INTO playlist_themes (name, description, type) VALUES
('Morning Coffee', 'Gentle tunes to start your day right', 'time'),
('Late Night Vibes', 'Perfect for those after-hours sessions', 'time'),
('Coding Session', 'Focus-enhancing tracks for programming', 'activity'),
('Highway Cruising', 'Music for the open road', 'activity'),
('Melancholy Monday', 'When you need to feel those feelings', 'mood'),
('Feel-Good Friday', 'Upbeat tracks to celebrate the weekend', 'mood'),
('Post-Breakup Healing', 'Soothing songs for broken hearts', 'mood'),
('Workout Intensity', 'High-energy tracks to power your exercise', 'activity'); 