import "next-auth";
import { User } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    user?: User;
  }
  
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: string;
    user?: User;
  }
}

export type Track = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  userRating?: number;
};

export type Mood = {
  id: string;
  name: string;
  description?: string;
  track_id?: string;
  track_name?: string;
  artist_name?: string;
  track_image?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string | null;
  is_staple?: boolean;
};

export type MoodCardProps = {
  mood: Mood;
  onUpdate: (moodData: Mood) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export type MoodSearchModalProps = {
  show: boolean;
  onClose: () => void;
  onSelect: (track: Track) => Promise<void>;
  moodId: string;
};

export type Album = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  images: Array<{ url: string }>;
  release_date?: string;
  userRating?: number;
};

export type Artist = {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  genres?: string[];
};

export type UserProfile = {
  id: string;
  display_name: string;
  images: Array<{ url: string }>;
  followers: { total: number };
  external_urls: { spotify: string };
};

export type Playlist = {
  id: string;
  name: string;
  images: Array<{ url: string }>;
  tracks: { total: number };
  owner: { display_name: string };
  public: boolean;
  collaborative: boolean;
}; 