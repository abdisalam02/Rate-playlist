'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import { PlusIcon, PencilIcon, XMarkIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import { getUserId } from '@/lib/session';

type Track = {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
};

type StapleMood = {
  id: string;
  mood_name: string;
  description: string;
  default_track_id?: string;
  default_track_name?: string;
  default_artist_name?: string;
  default_track_image?: string;
};

type StapleMoodTrack = {
  id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  track_image: string;
  added_at: string;
  staple_mood_id: string;
  staple_moods: {
    id: string;
    mood_name: string;
    description: string;
  };
};

type UserMood = {
  id: string;
  mood_name: string;
  description: string | null;
  user_id: string;
  created_at: string;
};

type MoodTrack = {
  id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  track_image: string;
  added_at: string;
};

// Component for the search modal
function TrackSearchModal({ 
  isOpen, 
  onClose, 
  onTrackSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onTrackSelect: (track: Track) => void; 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Make sure we're using a relative URL that works on any port/host
      const url = `/api/spotify/search?q=${encodeURIComponent(searchQuery)}`;
      console.log('Searching tracks with URL:', url);
      
      const response = await fetch(url);
      const responseText = await response.text(); // Get text first to debug
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse search response:', responseText);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        // Handle error responses
        const errorMessage = data?.error || 'Search failed';
        console.error('Search error:', errorMessage, data);
        throw new Error(errorMessage);
      }
      
      // Check if we have the expected data structure
      if (!data.tracks?.items) {
        console.error('Unexpected response format:', data);
        throw new Error('Unexpected response format');
      }
      
      setSearchResults(data.tracks.items || []);
    } catch (error) {
      console.error('Error searching tracks:', error);
      setError(error instanceof Error ? error.message : 'Failed to search tracks');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSearchResults([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#121212] rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Add a Track</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex mb-4">
          <input
            type="text"
            placeholder="Search for a track..."
            className="flex-1 bg-[#2a2a2a] rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={handleSearch}
            className="bg-[#1DB954] text-black px-4 py-2 rounded-r-lg font-medium hover:bg-opacity-90"
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {/* Display error message if present */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-md p-3 mb-4 text-sm">
            <p className="text-red-200">{error}</p>
          </div>
        )}
        
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((track) => (
                <div 
                  key={track.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-[#282828] cursor-pointer transition-colors"
                  onClick={() => {
                    onTrackSelect(track);
                    onClose();
                  }}
                >
                  <div className="flex-shrink-0">
                    <Image 
                      src={track.album.images[0]?.url || '/placeholder.png'} 
                      alt={track.name}
                      width={48}
                      height={48}
                      className="rounded-md"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-medium text-sm truncate">{track.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {track.artists.map(artist => artist.name).join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <p className="text-gray-400 text-center py-4">
              {error ? 'Try searching for something else' : 'No results found'}
            </p>
          ) : (
            <p className="text-gray-400 text-center py-4">Search for a track to add to your mood</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Component for creating a new user mood
function CreateMoodModal({ 
  isOpen, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: { mood_name: string; description?: string; track?: Track }) => Promise<void>;
}) {
  const [moodName, setMoodName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMoodName('');
      setDescription('');
      setError(null);
      setLoading(false);
      // Focus the name input when modal opens
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate inputs
    if (!moodName.trim()) {
      setError('Please enter a mood name');
      return;
    }
    
    if (moodName.length > 30) {
      setError('Mood name must be 30 characters or less');
      return;
    }
    
    try {
      setLoading(true);
      await onSave({ 
        mood_name: moodName.trim(), 
        description: description.trim() || `My ${moodName} mood`
      });
      toast.success(`Created mood "${moodName}"`);
      onClose();
    } catch (error) {
      console.error('Failed to create mood:', error);
      setError('Failed to create mood. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-xl font-bold mb-4">Create New Mood</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="mood-name" className="block text-sm font-medium text-gray-300 mb-1">
              Mood Name*
            </label>
            <input
              ref={nameInputRef}
              id="mood-name"
              type="text"
              value={moodName}
              onChange={(e) => setMoodName(e.target.value)}
              placeholder="e.g., Workout, Chill Vibes, Study"
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              maxLength={30}
            />
            <p className="text-xs text-gray-400 mt-1">
              {30 - moodName.length} characters remaining
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what kind of tracks you'll add to this mood"
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
              rows={3}
              maxLength={100}
            ></textarea>
            <p className="text-xs text-gray-400 mt-1">
              {100 - description.length} characters remaining
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-2 bg-red-900/30 border border-red-800 rounded-md text-red-300 text-sm">
              {error}
                </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1DB954] text-black rounded-full font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Mood'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Component for a staple mood card
function StapleMoodCard({ 
  mood, 
  track, 
  onAddTrack, 
  onRemoveTrack 
}: { 
  mood: StapleMood; 
  track?: StapleMoodTrack | null; 
  onAddTrack: (mood: StapleMood) => void; 
  onRemoveTrack: (track: StapleMoodTrack) => Promise<void>; 
}) {
  // Check if we have a user-selected track or should show the default track
  const hasUserTrack = !!track;
  
  return (
    <div className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-lg overflow-hidden shadow-lg flex flex-col relative">
      {hasUserTrack ? (
        // User has added a track to this staple mood
        <>
          <div className="relative h-48">
            <Image 
              src={track.track_image || '/placeholder.png'} 
              alt={track.track_name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <button 
              onClick={() => onAddTrack(mood)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white transition-colors"
              aria-label="Change track"
              title="Change track"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 flex-grow flex flex-col">
            <h3 className="text-lg font-bold mb-1">{mood.mood_name}</h3>
            <p className="text-sm text-gray-300 mb-3">{mood.description}</p>
            <div className="mt-auto">
              <h4 className="text-sm font-medium">Current Track:</h4>
              <p className="text-sm text-gray-300">{track.track_name}</p>
              <p className="text-xs text-gray-400">{track.artist_name}</p>
              <button
                onClick={() => onAddTrack(mood)}
                className="mt-3 w-full px-3 py-1.5 bg-[#1DB954] text-black text-sm font-medium rounded-full flex items-center justify-center hover:bg-opacity-90 transition-colors"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Change Track
              </button>
            </div>
          </div>
        </>
      ) : (
        // No user track - simplified display
        <div className="flex flex-col items-center justify-center p-6 h-64 text-center">
          <div className="bg-[#2e2e2e] p-4 rounded-full mb-4">
            <MusicalNoteIcon className="h-8 w-8 text-[#1DB954]" />
          </div>
          <h3 className="text-lg font-bold mb-1">{mood.mood_name}</h3>
          <p className="text-sm text-gray-300 mb-4">{mood.description}</p>
          <button
            onClick={() => onAddTrack(mood)}
            className="px-4 py-2 bg-[#1DB954] text-black font-medium rounded-full flex items-center hover:bg-opacity-90 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Add Track
          </button>
        </div>
      )}
    </div>
  );
}

// Updated UserMoodCard component with improved mobile layout and grid of track images
function UserMoodCard({ 
  mood, 
  tracks, 
  onEdit, 
  onDelete, 
  onAddTrack 
}: { 
  mood: UserMood; 
  tracks: MoodTrack[]; 
  onEdit: (mood: UserMood) => void; 
  onDelete: (mood: UserMood) => Promise<void>; 
  onAddTrack: (mood: UserMood) => void; 
}) {
  // ADDED FOR DEBUGGING
  console.log(`UserMoodCard Render: Mood=${mood.mood_name}, Tracks Received=${tracks?.length ?? 0}`);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const hasTracks = tracks && tracks.length > 0;
  
  // Determine grid layout based on number of tracks
  const getGridLayout = () => {
    if (!hasTracks) return null;

    if (tracks.length === 1) {
  return (
        <div className="relative h-48 w-full">
          <Image 
            src={tracks[0].track_image || '/placeholder.png'}
            alt={tracks[0].track_name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        </div>
      );
    } else if (tracks.length === 2) {
      return (
        <div className="grid grid-cols-2 h-48 gap-1">
          {tracks.slice(0, 2).map((track, index) => (
            <div key={index} className="relative h-full w-full">
              <Image 
                src={track.track_image || '/placeholder.png'}
                alt={track.track_name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 16.5vw, 12.5vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      );
    } else if (tracks.length === 3) {
      return (
        <div className="grid grid-cols-2 h-48 gap-1">
          <div className="relative h-full w-full">
            <Image 
              src={tracks[0].track_image || '/placeholder.png'}
              alt={tracks[0].track_name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 16.5vw, 12.5vw"
              className="object-cover"
            />
          </div>
          <div className="grid grid-rows-2 h-full gap-1">
            {tracks.slice(1, 3).map((track, index) => (
              <div key={index} className="relative h-full w-full">
                <Image 
                  src={track.track_image || '/placeholder.png'}
                  alt={track.track_name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 16.5vw, 12.5vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // 4 or more tracks
      return (
        <div className="grid grid-cols-2 grid-rows-2 h-48 gap-1">
          {tracks.slice(0, 4).map((track, index) => (
            <div key={index} className="relative h-full w-full">
              <Image 
                src={track.track_image || '/placeholder.png'}
                alt={track.track_name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 16.5vw, 12.5vw"
                className="object-cover"
              />
              {index === 3 && tracks.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">+{tracks.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-lg overflow-hidden shadow-lg flex flex-col">
      {/* Display the grid of track images if available */}
      {hasTracks ? (
        <div className="relative">
          {getGridLayout()}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"></div>
        </div>
      ) : (
        <div className="h-36 flex items-center justify-center bg-gradient-to-r from-[#2e2e2e] to-[#3e3e3e]">
          <MusicalNoteIcon className="h-12 w-12 text-[#1DB954]/50" />
        </div>
      )}
      
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold">{mood.mood_name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(mood)}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete(mood)}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-800"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {mood.description && (
          <p className="text-sm text-gray-300 mb-3">{mood.description}</p>
        )}
        
        {/* Track list section */}
        {hasTracks ? (
          <>
            <div className="flex items-center justify-between mb-2 mt-2">
              <h4 className="text-sm font-medium">Tracks {tracks.length > 0 && `(${tracks.length})`}</h4>
              {tracks.length > 2 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-[#1DB954] hover:underline"
                >
                  {isExpanded ? 'Show Less' : 'Show All'}
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              {(isExpanded ? tracks : tracks.slice(0, 2)).map((track) => (
                <div key={track.id} className="flex items-center gap-2 bg-[#2a2a2a] p-2 rounded-md">
                  {track.track_image && (
                    <Image 
                      src={track.track_image}
                      alt={track.track_name}
                      width={40}
                      height={40}
                      className="rounded-md"
                    />
                  )}
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium truncate">{track.track_name}</p>
                    <p className="text-xs text-gray-400 truncate">{track.artist_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-[#2a2a2a] p-4 rounded-md text-center my-3">
            <p className="text-sm text-gray-400 mb-2">No tracks added yet</p>
          </div>
        )}
        
        {/* Add track button */}
        <div className="mt-3">
          <button
            onClick={() => onAddTrack(mood)}
            className="w-full px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-md text-sm font-medium transition-colors flex items-center justify-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Track
          </button>
        </div>
      </div>
    </div>
  );
}

// Find the getBaseUrl function and replace it with this
function getBrowserUrl() {
  // Just return empty string for relative URLs - this is the preferred approach
  // as it automatically uses whatever host/port the site is running on
  return '';
}

export default function MoodManager() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [stapleMoods, setStapleMoods] = useState<StapleMood[]>([]);
  const [stapleMoodTracks, setStapleMoodTracks] = useState<StapleMoodTrack[]>([]);
  const [userMoods, setUserMoods] = useState<UserMood[]>([]);
  const [moodTracks, setMoodTracks] = useState<Record<string, MoodTrack[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [addingTrack, setAddingTrack] = useState(false);
  const [creatingMood, setCreatingMood] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  
  // Modal states
  const [showTrackSearch, setShowTrackSearch] = useState(false);
  const [selectedMood, setSelectedMood] = useState<{id: string; type: 'staple' | 'user'} | null>(null);
  const [showCreateMood, setShowCreateMood] = useState(false);

  // After a user mood is created, load its tracks
  useEffect(() => {
    // Load tracks for each user mood when the userMoods list changes
    if (userMoods.length > 0) {
      userMoods.forEach(mood => {
        if (!moodTracks[mood.id]) {
          loadUserMoodTracks(mood.id);
        }
      });
    }
  }, [userMoods]);
  
  // Load all mood data
  const loadMoodData = async () => {
    console.log("MoodManager: Loading mood data");
    setLoading(true);
    setError(null);
    
    let moodsLoaded = false;
    let stapleMoodsLoaded = false;
    let stapleMoodTracksLoaded = false;
    
    try {
      // 1. First try to fetch staple moods
      console.log(`MoodManager: Fetching staple moods`);
      const stapleMoodsResponse = await fetch(`/api/moods/staple-moods`);
      const stapleMoodsData = await stapleMoodsResponse.json();
      console.log("MoodManager: Staple moods API response:", stapleMoodsResponse.status, stapleMoodsData);
      
      if (!stapleMoodsResponse.ok) {
        console.error("MoodManager: Failed to fetch staple moods:", stapleMoodsData);
        throw new Error(`Failed to fetch staple moods: ${stapleMoodsResponse.statusText}`);
      }
      
      if (stapleMoodsData.success && stapleMoodsData.data) {
        setStapleMoods(stapleMoodsData.data);
        stapleMoodsLoaded = true;
        console.log(`MoodManager: Loaded ${stapleMoodsData.data.length} staple moods`);
      } else {
        console.warn("MoodManager: No staple moods returned:", stapleMoodsData);
        setStapleMoods([]);
      }
      
      // 2. Then try to fetch staple mood tracks - Using user-specific endpoint
      if (session?.user?.id) {
        console.log(`MoodManager: Fetching user-specific staple mood tracks for user: ${session.user.id}`);
        const stapleMoodTracksResponse = await fetch(`/api/users/${session.user.id}/moods/staple-tracks`);
        const stapleMoodTracksData = await stapleMoodTracksResponse.json();
        console.log("MoodManager: User staple mood tracks API response:", stapleMoodTracksResponse.status, stapleMoodTracksData);
        
        if (!stapleMoodTracksResponse.ok) {
          console.error("MoodManager: Failed to fetch user staple mood tracks:", stapleMoodTracksData);
          console.warn("MoodManager: Continuing without user staple mood tracks");
        } else {
          const tracks = stapleMoodTracksData?.tracks || [];
          setStapleMoodTracks(tracks);
          stapleMoodTracksLoaded = true;
          console.log(`MoodManager: Set user staple mood tracks state with ${tracks.length} tracks.`);
        }
      } else {
        console.warn("MoodManager: No user ID available to fetch staple mood tracks");
        // Fallback to non-user-specific endpoint if user ID is not available
        console.log(`MoodManager: Fetching generic staple mood tracks`);
      const stapleMoodTracksResponse = await fetch(`/api/moods/staple-tracks`);
      const stapleMoodTracksData = await stapleMoodTracksResponse.json();
      console.log("MoodManager: Staple mood tracks API response:", stapleMoodTracksResponse.status, stapleMoodTracksData);
      
      if (!stapleMoodTracksResponse.ok) {
        console.error("MoodManager: Failed to fetch staple mood tracks:", stapleMoodTracksData);
        console.warn("MoodManager: Continuing without staple mood tracks");
      } else {
        if (stapleMoodTracksData.success && stapleMoodTracksData.data) {
          setStapleMoodTracks(stapleMoodTracksData.data);
          stapleMoodTracksLoaded = true;
          console.log(`MoodManager: Loaded ${stapleMoodTracksData.data.length} staple mood tracks`);
        } else {
          console.warn("MoodManager: No staple mood tracks returned:", stapleMoodTracksData);
          setStapleMoodTracks([]);
          }
        }
      }
      
      // 3. Finally, fetch user moods
      console.log(`MoodManager: Fetching user moods`);
      const userMoodsResponse = await fetch(`/api/moods/user-moods`);
      const userMoodsData = await userMoodsResponse.json();
      console.log("MoodManager: User moods API response:", userMoodsResponse.status, userMoodsData);
      
      if (!userMoodsResponse.ok) {
        console.error("MoodManager: Failed to fetch user moods:", userMoodsData);
        console.warn("MoodManager: Continuing without user moods");
      } else {
        if (userMoodsData.success && userMoodsData.data) {
          setUserMoods(userMoodsData.data);
          moodsLoaded = true;
          console.log(`MoodManager: Loaded ${userMoodsData.data.length} user moods`);
        } else {
          console.warn("MoodManager: No user moods returned:", userMoodsData);
          setUserMoods([]);
        }
      }
    } catch (error) {
      console.error("MoodManager: Error loading mood data:", error);
      setError(`Failed to load mood data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log("MoodManager: Finished loading mood data");
      setLoading(false);
    }
    
    // Set a debug message if we couldn't load any moods
    if (!stapleMoodsLoaded && !moodsLoaded) {
      console.error("MoodManager: No mood data was loaded successfully");
      setDebugMessage("No mood data loaded. Check console for details.");
    } else {
      setDebugMessage(null);
    }
    
    return { stapleMoodsLoaded, moodsLoaded, stapleMoodTracksLoaded };
  };
  
  // Load data on component mount
  useEffect(() => {
    if (session) {
      loadMoodData();
    }
  }, [session]);
  
  // Handle adding a track to a mood
  const handleAddTrack = (mood: StapleMood | UserMood, type: 'staple' | 'user') => {
    setSelectedMood({ id: mood.id, type });
    setShowTrackSearch(true);
  };
  
  // Handle when a track is selected from the search modal
  const handleTrackSelect = async (track: Track) => {
    if (!selectedMood || !session) return;
    
    const trackData = {
      track_id: track.id,
      track_name: track.name,
      artist_name: track.artists.map(a => a.name).join(', '),
      track_image: track.album.images[0]?.url
    };
    
    try {
      if (selectedMood.type === 'staple') {
        // First check if this staple mood already has a track
        const existingTrack = stapleMoodTracks.find(t => t.staple_mood_id === selectedMood.id);
        
        // If there's an existing track, remove it first
        if (existingTrack) {
          console.log('Removing existing track from staple mood before adding new one');
          try {
            const deleteUrl = `/api/moods/staple-moods/${selectedMood.id}/track`;
            const deleteResponse = await fetch(deleteUrl, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ track_id: existingTrack.track_id })
            });
            
            if (!deleteResponse.ok) {
              console.warn('Could not remove existing track, but will continue with adding new track');
            }
          } catch (error) {
            console.warn('Error removing existing track:', error);
            // Continue with adding the new track even if deleting failed
          }
        }
        
        // Now add the new track
        const url = `/api/moods/staple-moods/${selectedMood.id}/track`;
        console.log('Adding track to staple mood URL:', url);
        
        // Use replace=true query parameter to replace any existing track
        const urlWithReplace = `${url}?replace=true`;
        
        const response = await fetch(urlWithReplace, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trackData)
        });
        
        // Log the full response for debugging
        let responseText = '';
        try {
          responseText = await response.text();
          console.log('Response from add track:', responseText);
        } catch (e) {
          console.error('Failed to read response text:', e);
        }
        
        if (!response.ok) {
          console.error('Failed to add track to staple mood', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            response: responseText
          });
          throw new Error(`Failed to add track to staple mood: ${response.statusText}`);
        }
        
        // Refresh staple mood tracks
        loadMoodData();
        toast.success(existingTrack ? 'Track changed for mood' : 'Track added to mood');
      } else {
        // Similar changes for user mood...
        // Use relative URL paths
        const url = `/api/moods/user-moods/${selectedMood.id}/tracks`;
        console.log('Adding track to user mood URL:', url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trackData)
        });
        
        if (!response.ok) {
          console.error('Failed to add track to user mood', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            response: await response.text() // Log the response body for debugging
          });
          throw new Error(`Failed to add track to user mood: ${response.statusText}`);
        }
        
        // Refresh user mood tracks
        const tracksUrl = `/api/moods/user-moods/${selectedMood.id}/tracks`;
        console.log('Refreshing tracks for user mood URL:', tracksUrl);
        
        const tracksRes = await fetch(tracksUrl);
        if (tracksRes.ok) {
          const tracksData = await tracksRes.json();
          setMoodTracks(prev => ({ ...prev, [selectedMood.id]: tracksData.data || [] }));
        }
        
        toast.success('Track added to mood');
      }
    } catch (error) {
      console.error('Error adding track to mood:', error);
      toast.error('Failed to add track to mood');
    }
  };
  
  // Handle removing a track from a staple mood
  const handleRemoveTrack = async (track: any) => {
    if (!session || !track) return;
    
    try {
      if (track.staple_mood_id) {
        const response = await fetch(`/api/moods/staple-moods/${track.staple_mood_id}/track`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track_id: track.track_id })
        });
        
        if (!response.ok) {
          console.error('Failed to remove track from staple mood', response);
          throw new Error('Failed to remove track from mood');
        }
      } else if (track.user_mood_id) {
        const response = await fetch(`/api/moods/user-moods/${track.user_mood_id}/tracks`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track_id: track.track_id })
        });
        
        if (!response.ok) {
          console.error('Failed to remove track from user mood', response);
          throw new Error('Failed to remove track from mood');
        }
      }
      
      toast.success('Track removed from mood');
      loadMoodData();
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error('Failed to remove track');
    }
  };
  
  // Function to create a new user mood
  const handleCreateMood = async (moodData: { mood_name: string; description?: string; track?: Track }) => {
    console.log('Creating mood with data:', moodData);
    
    if (!session) {
      toast.error('You must be logged in to create a mood');
      return;
    }
    
    try {
      toast.loading('Creating your mood...', { id: 'create-mood' });
      
      const url = `/api/moods/user-moods`;
      console.log('Creating mood at URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mood_name: moodData.mood_name,
          description: moodData.description || `My ${moodData.mood_name} mood`
        })
      });
      
      console.log('Create mood response status:', response.status);
      
      // Get response data
      let responseText;
      try {
        responseText = await response.text();
        console.log('Create mood response text:', responseText);
      } catch (e) {
        console.error('Failed to read response text:', e);
        toast.error('Failed to create mood', { id: 'create-mood' });
        return;
      }

      // Parse the response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Create mood response data:', data);
      } catch (e) {
        console.error('Failed to parse response JSON:', e);
        toast.error('Failed to create mood', { id: 'create-mood' });
        return;
      }
      
      if (!response.ok) {
        toast.error(data.message || 'Failed to create mood', { id: 'create-mood' });
        return;
      }
      
      // If there's a track, add it to the newly created mood
      if (moodData.track && data.data?.id) {
        console.log('Adding track to newly created mood:', moodData.track);
        toast.loading('Adding track to mood...', { id: 'create-mood' });
        
        const trackData = {
          track_id: moodData.track.id,
          track_name: moodData.track.name,
          artist_name: moodData.track.artists.map(a => a.name).join(', '),
          track_image: moodData.track.album.images[0]?.url || ''
        };
        
        const trackUrl = `/api/moods/user-moods/${data.data.id}/tracks`;
        console.log('Adding track to mood at URL:', trackUrl);
        
        try {
        const trackResponse = await fetch(trackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(trackData)
        });
        
        if (!trackResponse.ok) {
          console.warn('Failed to add track to new mood, but mood was created');
        } else {
          // Load the track data for this mood immediately
          await loadUserMoodTracks(data.data.id);
          }
        } catch (error) {
          console.error('Error adding track to new mood:', error);
        }
      }
      
      // Reload moods after creating a new one
      await loadMoodData();
      toast.success(`Created mood "${moodData.mood_name}"`, { id: 'create-mood' });
      
      // Switch to the "Your Moods" tab to show the newly created mood
      setActiveTab(1);
    } catch (error) {
      console.error('Error creating mood:', error);
      toast.error('Failed to create mood', { id: 'create-mood' });
    }
  };
  
  // Replace handleEditMood function with this implementation
  const handleEditMood = async (mood: UserMood) => {
    // Show a modal for editing the mood
    const newName = prompt('Enter new mood name:', mood.mood_name);
    if (!newName) return; // User cancelled
    
    const newDescription = prompt('Enter new description (optional):', mood.description || '');
    
    try {
      const response = await fetch(`/api/moods/user-moods/${mood.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mood_name: newName,
          description: newDescription
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update mood', response);
        toast.error('Failed to update mood');
        return;
      }
      
      toast.success(`Updated mood "${newName}"`);
      loadMoodData();
    } catch (error) {
      console.error('Error updating mood:', error);
      toast.error('Failed to update mood');
    }
  };
  
  // Handle deleting a user mood
  const handleDeleteMood = async (mood: any) => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/moods/user-moods/${mood.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        console.error('Failed to delete mood', response);
        throw new Error('Failed to delete mood');
      }
      
      toast.success(`Deleted mood "${mood.mood_name}"`);
      loadMoodData();
    } catch (error) {
      console.error('Error deleting mood:', error);
      toast.error('Failed to delete mood');
    }
  };

  // Function to add a track to a user mood
  const handleAddTrackToMood = async (moodName: string, track: Track) => {
    console.log('Adding track to mood:', { moodName, track });
    
    if (!session?.user?.id) {
      console.error('No user ID found in session');
      return;
    }
    
    try {
      const url = `/api/moods/user-moods/track-by-name`;
      console.log('Adding track at URL:', url);
      
      const trackData = {
        mood_name: moodName,
        track_id: track.id,
        track_name: track.name,
        artist_name: track.artists.map(a => a.name).join(', '),
        track_image: track.album.images[0]?.url || '' // Changed from image_url to track_image
      };
      
      console.log('Track data being sent:', trackData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trackData)
      });
      
      console.log('Add track response status:', response.status);
      const data = await response.json();
      console.log('Add track response data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to add track to mood');
      }
      
      // Reload moods to show updated tracks
      await loadMoodData();
      toast.success(`Added "${track.name}" to "${moodName}" mood`);
    } catch (error) {
      console.error('Error adding track to mood:', error);
      toast.error('Failed to add track to mood');
      throw error;
    }
  };

  // Add a track to a mood (staple or user)
  const addTrackToMood = async (moodId: string, trackId: string, isStapleMood = false) => {
    console.log(`MoodManager: Adding track ${trackId} to ${isStapleMood ? 'staple' : 'user'} mood ${moodId}`);
    setAddingTrack(true);
    
    try {
      // For debugging - log session status
      console.log('MoodManager: Session status when adding track:', 
        session ? 'authenticated' : 'not authenticated', 
        session?.user?.email ? `User: ${session.user.email}` : 'No user email');
      
      // Construct URL based on mood type
      const url = isStapleMood 
        ? `/api/moods/staple-moods/${moodId}/track` 
        : `/api/moods/user-moods/${moodId}/tracks`;
      
      console.log('Adding track to mood URL:', url);
      
      // Get the track data from the selected track
      const track = selectedTrack;
      if (!track) {
        console.error('No track selected for adding to mood');
        setAddingTrack(false);
        return;
      }
      
      // Prepare the track data to send
      const trackData = {
        track_id: track.id,
        track_name: track.name,
        artist_name: track.artists.map(a => a.name).join(', '),
        track_image: track.album.images[0]?.url || ''
      };
      
      console.log('Track data being sent:', trackData);
      
      // Make the API request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(trackData)
      });
      
      // Get the response data for better logging
      let responseData;
      try {
        const responseText = await response.text();
        console.log('Response text:', responseText);
        responseData = JSON.parse(responseText);
        console.log('Response from add track:', responseData);
      } catch (e) {
        console.error('Failed to parse response:', e);
        responseData = { error: 'Failed to parse response' };
      }
      
      // Show success or error based on response
      if (response.ok) {
        toast.success(`Added "${track.name}" to mood`);
        
        // Reload the mood data to show the new track
        await loadMoodData();
      } else {
        console.error('Failed to add track to mood', response.status, responseData);
        toast.error('Failed to add track to mood');
      }
    } catch (error) {
      console.error('Error adding track to mood:', error);
      toast.error('Failed to add track to mood');
    } finally {
      setAddingTrack(false);
      setShowTrackSearch(false);
    }
  };

  // Load track data for a specific user mood
  const loadUserMoodTracks = async (moodId: string) => {
    console.log(`MoodManager: Loading tracks for user mood ${moodId}`);

    try {
      // Use relative URL path
      const url = `/api/moods/user-moods/${moodId}/tracks`;
      
      console.log(`MoodManager: Fetching user mood tracks from ${url}`);
      const response = await fetch(url);
      
      // Log the raw response for debugging
      let responseText;
      try {
        responseText = await response.text();
        console.log(`MoodManager: Raw response for mood tracks: ${responseText.substring(0, 200)}...`);
      } catch (e) {
        console.error('Failed to read tracks response text:', e);
        return;
      }
      
      // Parse the response
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("MoodManager: User mood tracks API response:", response.status, {
          success: data.success,
          trackCount: data.data?.length || 0
        });
      } catch (e) {
        console.error('Failed to parse tracks response JSON:', e);
        return;
      }
      
      if (!response.ok) {
        console.error("MoodManager: Failed to fetch user mood tracks:", data);
        return;
      }
      
      if (data.success && data.data) {
        // Update the tracks for this specific mood
        setMoodTracks(prev => ({ ...prev, [moodId]: data.data }));
        console.log(`MoodManager: Loaded ${data.data.length} tracks for user mood ${moodId}`);
      } else {
        console.warn("MoodManager: No user mood tracks returned:", data);
        setMoodTracks(prev => ({ ...prev, [moodId]: [] }));
      }
    } catch (error) {
      console.error(`MoodManager: Error loading tracks for mood ${moodId}:`, error);
    }
  };

  // Display debugging information if needed
  const DebugInfo = () => (
    <>
      {debugMessage && (
        <div className="p-2 bg-blue-100 text-blue-800 rounded mb-4">
          {debugMessage}
        </div>
      )}
      {error && (
        <div className="p-2 bg-red-100 text-red-800 rounded mb-4">
          Error: {error}
        </div>
      )}
    </>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 my-4">
        <p className="text-red-300 mb-3">{error}</p>
        <button 
          onClick={loadMoodData}
          className="px-4 py-2 bg-red-900/30 hover:bg-red-800/40 rounded-full text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-4 sm:mb-6">Your Moods</h1>
      
      <DebugInfo />
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-4 sm:mb-6">
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-2">
            <Tab className={({ selected }) => 
              `py-2 sm:py-3 px-3 sm:px-5 font-medium text-sm transition-colors focus:outline-none ${
                selected 
                  ? 'text-white border-b-2 border-[#1DB954]' 
                  : 'text-gray-400 hover:text-white'
              }`
            }>
              Staple Moods
            </Tab>
            <Tab className={({ selected }) => 
              `py-2 sm:py-3 px-3 sm:px-5 font-medium text-sm transition-colors focus:outline-none ${
                selected 
                  ? 'text-white border-b-2 border-[#1DB954]' 
                  : 'text-gray-400 hover:text-white'
              }`
            }>
              Your Moods
            </Tab>
          </Tab.List>
        </Tab.Group>
      </div>
      
      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 0 ? (
          /* Staple Moods Tab */
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stapleMoods.length > 0 ? (
                stapleMoods.map(mood => (
                  <StapleMoodCard
                    key={mood.id}
                    mood={mood}
                    track={stapleMoodTracks.find(track => track.staple_mood_id === mood.id)}
                    onAddTrack={() => handleAddTrack(mood, 'staple')}
                    onRemoveTrack={handleRemoveTrack}
                  />
                ))
              ) : (
                <div className="col-span-full bg-gray-800/30 p-6 rounded-lg text-center">
                  <p className="text-gray-400">No staple moods available</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Your Moods Tab (renamed from Custom Moods) */
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
              <h2 className="text-xl font-semibold">Your Moods</h2>
              <button
                onClick={() => setShowCreateMood(true)}
                className="w-full sm:w-auto px-4 py-2 bg-[#1DB954] text-black rounded-full font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center sm:justify-start"
              >
                <PlusIcon className="h-5 w-5 mr-1" />
                Create New Mood
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userMoods.length > 0 ? (
                userMoods.map(mood => (
                  <UserMoodCard
                    key={mood.id}
                    mood={mood}
                    tracks={moodTracks[mood.id] || []}
                    onEdit={handleEditMood}
                    onDelete={handleDeleteMood}
                    onAddTrack={() => handleAddTrack(mood, 'user')}
                  />
                ))
              ) : (
                <div className="col-span-full bg-gray-800/30 p-6 rounded-lg text-center">
                  <p className="text-gray-400 mb-3">You haven't created any moods yet</p>
                  <button
                    onClick={() => setShowCreateMood(true)}
                    className="px-4 py-2 bg-[#1DB954] text-black rounded-full font-medium hover:bg-opacity-90 transition-colors inline-flex items-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-1" />
                    Create Your First Mood
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TrackSearchModal
        isOpen={showTrackSearch}
        onClose={() => setShowTrackSearch(false)}
        onTrackSelect={handleTrackSelect}
      />
      
      <CreateMoodModal
        isOpen={showCreateMood}
        onClose={() => setShowCreateMood(false)}
        onSave={handleCreateMood}
      />
    </div>
  );
} 