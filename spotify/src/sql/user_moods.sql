-- USER MOODS FEATURE
-- This file contains schema definitions for the user moods feature

-- Table for staple moods (shared mood types)
CREATE TABLE staple_moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mood_name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row-level security for staple_moods
ALTER TABLE staple_moods ENABLE ROW LEVEL SECURITY;

-- Create policies for staple_moods RLS
CREATE POLICY "Staple moods are viewable by everyone" 
  ON staple_moods FOR SELECT USING (true);

-- Table for user moods
CREATE TABLE user_moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staple_mood_id UUID REFERENCES staple_moods(id),
  track_id TEXT NOT NULL, -- Spotify track ID
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  track_image TEXT, -- Album cover image URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row-level security
ALTER TABLE user_moods ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "User moods are viewable by everyone" 
  ON user_moods FOR SELECT USING (true);
  
CREATE POLICY "Users can create their own moods" 
  ON user_moods FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
  
CREATE POLICY "Users can update their own moods" 
  ON user_moods FOR UPDATE USING (auth.uid()::text = user_id::text);
  
CREATE POLICY "Users can delete their own moods" 
  ON user_moods FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create indexes for performance
CREATE INDEX idx_user_moods_user_id ON user_moods(user_id);
CREATE INDEX idx_user_moods_staple_mood_id ON user_moods(staple_mood_id);

-- Function to track mood activity
CREATE OR REPLACE FUNCTION log_mood_activity()
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
      'mood_add', 
      NEW.track_id, 
      'track', 
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mood activities
CREATE TRIGGER trigger_mood_activity
AFTER INSERT ON user_moods
FOR EACH ROW
EXECUTE FUNCTION log_mood_activity();

-- Insert sample staple moods
INSERT INTO staple_moods (mood_name, description)
VALUES 
  ('Happy', 'Upbeat and joyful mood'),
  ('Sad', 'Melancholic and reflective mood'),
  ('Energetic', 'High energy for workouts and motivation'),
  ('Relaxed', 'Calm and peaceful vibes'),
  ('Focus', 'Concentration and productivity')
ON CONFLICT (mood_name) DO NOTHING;

-- Sample mood data for demo purposes
INSERT INTO user_moods (user_id, staple_mood_id, track_id, track_name, artist_name, track_image)
VALUES 
  ((SELECT id FROM users LIMIT 1), (SELECT id FROM staple_moods WHERE mood_name = 'Happy'), '4iV5W9uYEdYUVa79Axb7Rh', 'Starboy', 'The Weeknd, Daft Punk', 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452'),
  ((SELECT id FROM users LIMIT 1), (SELECT id FROM staple_moods WHERE mood_name = 'Relaxed'), '7qiZfU4dY1lWllzX7mPBI3', 'Shape of You', 'Ed Sheeran', 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96'),
  ((SELECT id FROM users LIMIT 1), (SELECT id FROM staple_moods WHERE mood_name = 'Energetic'), '0VjIjW4GlUZAMYd2vXMi3b', 'Blinding Lights', 'The Weeknd', 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36'); 