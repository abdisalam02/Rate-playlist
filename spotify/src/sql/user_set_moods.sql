-- USER SET MOODS FEATURE
-- This file contains schema definitions for the user moods feature

-- Table for user moods
CREATE TABLE user_set_moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  mood_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  track_id TEXT NOT NULL, -- Spotify track ID (primary track)
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  track_image TEXT, -- Album cover image URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row-level security
ALTER TABLE user_set_moods ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "User set moods are viewable by everyone" 
  ON user_set_moods FOR SELECT USING (true);
  
CREATE POLICY "Users can create their own set moods" 
  ON user_set_moods FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
  
CREATE POLICY "Users can update their own set moods" 
  ON user_set_moods FOR UPDATE USING (auth.uid()::text = user_id::text);
  
CREATE POLICY "Users can delete their own set moods" 
  ON user_set_moods FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create indexes for performance
CREATE INDEX idx_user_set_moods_user_id ON user_set_moods(user_id);

-- Function to track mood activity
CREATE OR REPLACE FUNCTION log_set_mood_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new activity record when a mood is added
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_activities (
      user_id, 
      activity_type, 
      item_id, 
      item_type, 
      created_at
    ) VALUES (
      NEW.user_id, 
      'set_mood_add', 
      NEW.track_id, 
      'track', 
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for set mood activities
CREATE TRIGGER trigger_set_mood_activity
AFTER INSERT ON user_set_moods
FOR EACH ROW
EXECUTE FUNCTION log_set_mood_activity();

/* Example mood data (commented out to prevent errors)
INSERT INTO user_set_moods (user_id, mood_name, description, track_id, track_name, artist_name, track_image)
VALUES 
  ('user-uuid-here', 'Late Night Drive', 'Perfect for cruising after dark', '4iV5W9uYEdYUVa79Axb7Rh', 'Starboy', 'The Weeknd, Daft Punk', 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452'),
  ('user-uuid-here', 'Throwback Thursday', 'Nostalgia from 2017', '7qiZfU4dY1lWllzX7mPBI3', 'Shape of You', 'Ed Sheeran', 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96'),
  ('user-uuid-here', 'Morning Motivation', 'Start your day right', '0VjIjW4GlUZAMYd2vXMi3b', 'Blinding Lights', 'The Weeknd', 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36');
*/ 