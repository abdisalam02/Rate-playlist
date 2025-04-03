-- Create table for staple moods (predefined moods)
CREATE TABLE IF NOT EXISTS staple_moods (
  id UUID PRIMARY KEY,
  mood_name VARCHAR(100) NOT NULL,
  description TEXT,
  default_track_id VARCHAR(50),
  default_track_name VARCHAR(255),
  default_artist_name VARCHAR(255),
  default_track_image VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for user moods (custom moods)
CREATE TABLE IF NOT EXISTS user_moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mood_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for mood tracks (connects tracks to either staple or user moods)
CREATE TABLE IF NOT EXISTS mood_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  staple_mood_id UUID REFERENCES staple_moods(id) ON DELETE CASCADE,
  user_mood_id UUID REFERENCES user_moods(id) ON DELETE CASCADE,
  track_id VARCHAR(50) NOT NULL,
  track_name VARCHAR(255) NOT NULL,
  artist_name VARCHAR(255) NOT NULL,
  track_image VARCHAR(255),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mood_track_belongs_to_one_mood_type CHECK (
    (staple_mood_id IS NOT NULL AND user_mood_id IS NULL) OR
    (staple_mood_id IS NULL AND user_mood_id IS NOT NULL)
  ),
  CONSTRAINT unique_staple_mood_track_per_user UNIQUE (user_id, staple_mood_id),
  CONSTRAINT unique_user_mood_track UNIQUE (user_mood_id, track_id)
);

-- Insert the specified staple moods
INSERT INTO staple_moods (id, mood_name, description, default_track_id, default_track_name, default_artist_name, default_track_image, created_at) VALUES
  ('988fd3a9-0173-4de7-bc80-dbafd6d37147', 'Late Night Drive', 'Perfect tracks for cruising through the city after dark', '4MJyxKkYLZ3eGGCXUGHadJ', 'Dreams', 'Fleetwood Mac', 'https://i.scdn.co/image/ab67616d0000b273e52a59eb13be11ca6f8aca66', '2025-03-24 16:26:24.882641+00'),
  ('7da5bfc2-216c-4b52-b8df-2428af926822', 'Summer Jam', 'Upbeat tracks that feel like sunshine and good times', '1rqqCSm0Qe4I9rUvWncaom', 'High', 'Lighthouse Family', 'https://i.scdn.co/image/ab67616d0000b273731731446f99d23a3535bd3f', '2025-03-24 16:26:24.882641+00'),
  ('042c7736-c8f0-42ca-a77b-c79a763f74d2', 'In My Feelings', 'Emotional songs for when you need to feel all the feelings', '4h9wh7iOZ0GGn8QVp4RAOB', 'I Will Always Love You', 'Whitney Houston', 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f', '2025-03-24 16:26:24.882641+00'),
  ('2004a78b-1a61-47e6-97fb-88ef5f993b3b', 'Guilty Pleasure', 'Those songs you secretly love but might not admit', '6ZFbXIJkuI1dVNWvzJzown', 'Never Gonna Give You Up', 'Rick Astley', 'https://i.scdn.co/image/ab67616d0000b2738399047ff71200928f5b4be2', '2025-03-24 16:26:24.882641+00'); 