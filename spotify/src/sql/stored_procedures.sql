-- First drop the existing function
DROP FUNCTION IF EXISTS get_top_rated_items(text,integer,integer);
DROP FUNCTION IF EXISTS get_community_activity(integer,integer);

-- Get top rated items (tracks or albums)
CREATE OR REPLACE FUNCTION get_top_rated_items(
  item_type_param TEXT,
  limit_param INTEGER DEFAULT 10,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  item_id TEXT,
  item_type TEXT,
  average_rating DECIMAL,
  rating_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.item_id,
    r.item_type,
    AVG(r.rating)::DECIMAL AS average_rating,
    COUNT(r.id) AS rating_count
  FROM 
    ratings r
  WHERE 
    r.item_type = item_type_param
  GROUP BY 
    r.item_id, r.item_type
  HAVING 
    COUNT(r.id) > 0
  ORDER BY 
    average_rating DESC, rating_count DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Check and add target_user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_activities' 
    AND column_name = 'target_user_id'
  ) THEN
    ALTER TABLE user_activities ADD COLUMN target_user_id UUID NULL;
  END IF;
END $$;

-- Get user compatibility
CREATE OR REPLACE FUNCTION get_user_compatibility(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  compatibility_score DECIMAL,
  common_ratings INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_ratings AS (
    SELECT item_id, item_type, rating
    FROM ratings
    WHERE user_id = user_id_param
  ),
  other_users AS (
    SELECT DISTINCT user_id
    FROM ratings
    WHERE user_id != user_id_param
  ),
  common_ratings AS (
    SELECT 
      r.user_id,
      COUNT(*) AS rating_count,
      1 - (SUM(ABS(r.rating - ur.rating)) / (COUNT(*) * 5.0)) AS similarity_score
    FROM 
      ratings r
    JOIN 
      user_ratings ur ON r.item_id = ur.item_id AND r.item_type = ur.item_type
    WHERE 
      r.user_id != user_id_param
    GROUP BY 
      r.user_id
    HAVING 
      COUNT(*) >= 3
  )
  SELECT 
    u.id AS user_id,
    cr.similarity_score * 100 AS compatibility_score,
    cr.rating_count AS common_ratings
  FROM 
    common_ratings cr
  JOIN 
    users u ON cr.user_id = u.id
  ORDER BY 
    compatibility_score DESC, common_ratings DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Get community activity feed
CREATE OR REPLACE FUNCTION get_community_activity(
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  user_name TEXT,
  user_image TEXT,
  activity_type TEXT,
  item_id TEXT,
  item_type TEXT,
  target_user_id UUID,
  target_user_name TEXT,
  target_user_image TEXT,
  rating DECIMAL,
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id AS activity_id,
    ua.user_id,
    u.display_name AS user_name,
    u.profile_image AS user_image,
    ua.activity_type,
    ua.item_id,
    ua.item_type,
    ua.target_user_id,
    tu.display_name AS target_user_name,
    tu.profile_image AS target_user_image,
    ua.rating,
    ua.review,
    ua.created_at
  FROM 
    user_activities ua
  JOIN 
    users u ON ua.user_id = u.id
  LEFT JOIN 
    users tu ON ua.target_user_id = tu.id
  WHERE
    ua.activity_type IN ('rating', 'review', 'playlist_create', 'follow')
    AND (
      ua.activity_type IN ('rating', 'review', 'playlist_create') AND ua.item_id IS NOT NULL
    )
  ORDER BY 
    ua.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Log activity when a rating is created or updated
CREATE OR REPLACE FUNCTION log_rating_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is a new rating or an update
  IF TG_OP = 'INSERT' THEN
    -- Insert a new activity record
    INSERT INTO user_activities (
      user_id, 
      activity_type, 
      item_id, 
      item_type, 
      rating, 
      review, 
      created_at
    ) VALUES (
      NEW.user_id, 
      'rating', 
      NEW.item_id, 
      NEW.item_type, 
      NEW.rating,
      NEW.review,
      NOW()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log an update if the rating or review changed
    IF NEW.rating != OLD.rating OR NEW.review != OLD.review THEN
      INSERT INTO user_activities (
        user_id, 
        activity_type, 
        item_id, 
        item_type, 
        rating, 
        review, 
        created_at
      ) VALUES (
        NEW.user_id, 
        'rating', 
        NEW.item_id, 
        NEW.item_type, 
        NEW.rating,
        NEW.review,
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating activities
DROP TRIGGER IF EXISTS trigger_rating_activity ON ratings;
CREATE TRIGGER trigger_rating_activity
AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW
EXECUTE FUNCTION log_rating_activity();

-- Log activity when a user follows another user
CREATE OR REPLACE FUNCTION log_follow_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new activity record
  INSERT INTO user_activities (
    user_id, 
    activity_type, 
    target_user_id, 
    created_at
  ) VALUES (
    NEW.follower_id, 
    'follow', 
    NEW.followed_id, 
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follow activities (assuming a user_follows table exists)
DROP TRIGGER IF EXISTS trigger_follow_activity ON user_follows;
CREATE TRIGGER trigger_follow_activity
AFTER INSERT ON user_follows
FOR EACH ROW
EXECUTE FUNCTION log_follow_activity();

-- Add sample ratings data if the tables are empty
DO $$
DECLARE
  rating_count INTEGER;
  activity_count INTEGER;
BEGIN
  -- Check if we have any meaningful activities
  SELECT COUNT(*) INTO activity_count 
  FROM user_activities 
  WHERE activity_type IN ('rating', 'review', 'playlist_create')
    AND item_id IS NOT NULL;
  
  -- Check if we have any ratings
  SELECT COUNT(*) INTO rating_count FROM ratings;
  
  -- If no activities of the right type, add sample activities
  IF activity_count = 0 THEN
    -- First add some sample ratings if there are none
    IF rating_count = 0 THEN
      -- Sample track ratings
      INSERT INTO ratings (user_id, item_id, item_type, rating, review)
      VALUES 
        -- User's tracks
        ((SELECT id FROM users LIMIT 1), '4iV5W9uYEdYUVa79Axb7Rh', 'track', 4.5, 'Great song with awesome vocals!'),
        ((SELECT id FROM users LIMIT 1), '7qiZfU4dY1lWllzX7mPBI3', 'track', 3.5, NULL),
        ((SELECT id FROM users LIMIT 1), '0VjIjW4GlUZAMYd2vXMi3b', 'track', 5, 'Absolute masterpiece!'),
        -- User's albums
        ((SELECT id FROM users LIMIT 1), '4aawyAB9vmqN3uQ7FjRGTy', 'album', 4.5, 'Incredible concept album'),
        ((SELECT id FROM users LIMIT 1), '2noRn2Aes5aoNVsU6iWThc', 'album', 5, 'A classic');
    END IF;
    
    -- Now create activities for those ratings
    INSERT INTO user_activities (user_id, activity_type, item_id, item_type, rating, review, created_at)
    SELECT 
      user_id, 
      CASE WHEN review IS NOT NULL THEN 'review' ELSE 'rating' END,
      item_id,
      item_type,
      rating,
      review,
      NOW() - (random() * interval '2 days')
    FROM ratings
    LIMIT 5;
  END IF;
END $$; 