-- Table: user_mood_tracks

-- This table stores multiple tracks for each user's mood
-- It allows users to associate multiple tracks with the same mood name
-- Each mood can have multiple tracks, organized by category (primary, secondary, etc.)

CREATE TABLE IF NOT EXISTS user_mood_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood_id UUID REFERENCES user_moods(id) ON DELETE CASCADE,
  track_id VARCHAR(255) NOT NULL,
  track_name VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  track_image VARCHAR(255),
  position INTEGER DEFAULT 1,  -- Order of the track within the mood (1-4)
  category VARCHAR(50) DEFAULT 'primary',  -- Can be 'primary', 'secondary', 'tertiary', 'alternative'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mood_tracks_user_id ON user_mood_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mood_tracks_mood_id ON user_mood_tracks(mood_id);

-- Add unique constraint to prevent duplicate tracks for the same position in a mood
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_mood_tracks_unique_position 
ON user_mood_tracks(mood_id, position);

/* 
-- Example insertions - commented out to prevent errors
-- When actually inserting data, replace with actual UUIDs from your database
-- Example valid UUID format: 123e4567-e89b-12d3-a456-426614174000

INSERT INTO user_mood_tracks (user_id, mood_id, track_id, track_name, artist_name, track_image, position, category)
VALUES 
  ('actual-user-id', '123e4567-e89b-12d3-a456-426614174001', '4cluDES4hQEUhmXj6TXkSo', 'Heat Waves', 'Glass Animals', 'https://example.com/heatwaves.jpg', 1, 'primary'),
  ('actual-user-id', '123e4567-e89b-12d3-a456-426614174001', '2JPLbjOn0wPCngEot2STUS', 'Blinding Lights', 'The Weeknd', 'https://example.com/blindinglights.jpg', 2, 'secondary'),
  ('actual-user-id', '123e4567-e89b-12d3-a456-426614174001', '4ZtFanR9U6ndgddUvNcjcG', 'Good 4 U', 'Olivia Rodrigo', 'https://example.com/good4u.jpg', 3, 'tertiary'),
  ('actual-user-id', '123e4567-e89b-12d3-a456-426614174001', '0k4d0YWVWlYQQ7sW94F4RM', 'Stay', 'The Kid LAROI, Justin Bieber', 'https://example.com/stay.jpg', 4, 'alternative');
*/

-- Create a view to get all tracks for each mood
CREATE OR REPLACE VIEW view_user_mood_with_tracks AS
SELECT 
  um.id AS mood_id,
  um.user_id,
  sm.mood_name,
  COALESCE(sm.description, '') as description,
  um.created_at,
  CASE 
    WHEN umt.id IS NULL THEN '[]'::json
    ELSE json_agg(
      json_build_object(
        'id', umt.id,
        'track_id', umt.track_id,
        'track_name', umt.track_name,
        'artist_name', umt.artist_name,
        'track_image', umt.track_image,
        'position', umt.position,
        'category', umt.category
      ) ORDER BY umt.position
    )
  END AS tracks
FROM user_moods um
JOIN staple_moods sm ON um.staple_mood_id = sm.id
LEFT JOIN user_mood_tracks umt ON um.id = umt.mood_id
GROUP BY um.id, um.user_id, sm.mood_name, sm.description, um.created_at; 