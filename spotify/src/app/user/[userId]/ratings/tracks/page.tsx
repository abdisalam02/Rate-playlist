import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { enrichItems, RatingItem, SpotifyItem } from '@/lib/enrichUtils';
import { getClientCredentialsToken } from '@/lib/spotify'; // Needed for enrichment fallback
import RatedTrackCard from '@/app/components/RatedTrackCard'; // Import the new client component

// Helper to get user display name (consider moving to a shared util)
async function getUserDisplayName(userId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('display_name')
    .or(`id.eq.${userId},spotify_id.eq.${userId}`)
    .single();
  if (error || !user) {
    console.error(`[UserTracksPage] Error fetching user display name for ${userId}:`, error);
    return 'User';
  }
  return user.display_name || 'User';
}

// Function to fetch all track ratings for a user
async function getAllTrackRatings(userId: string): Promise<RatingItem[]> {
  // Find the UUID associated with the potentially non-UUID userId
  const { data: userData, error: userLookupError } = await supabase
    .from('users')
    .select('id')
    .or(`id.eq.${userId},spotify_id.eq.${userId}`)
    .single();

  if (userLookupError || !userData) {
    console.error(`[UserTracksPage] Could not find user UUID for ${userId}:`, userLookupError);
    notFound(); // Trigger 404 if user doesn't exist
  }

  const userUUID = userData.id;

  console.log(`[UserTracksPage] Fetching all track ratings for user UUID: ${userUUID}`);
  const { data, error } = await supabase
    .from('ratings')
    .select('*') // Select all rating fields
    .eq('user_id', userUUID)
    .eq('item_type', 'track')
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[UserTracksPage] Error fetching track ratings:', error);
    throw new Error('Failed to fetch track ratings.'); // Let error boundary handle this
  }
  console.log(`[UserTracksPage] Found ${data?.length || 0} raw track ratings.`);
  return data || [];
}

// Simple Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-neutral-800 rounded-lg p-4 animate-pulse">
          <div className="aspect-square bg-neutral-700 rounded mb-3"></div>
          <div className="h-4 bg-neutral-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-neutral-700 rounded w-1/2 mb-3"></div>
          <div className="h-5 bg-neutral-700 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );
}

// Metadata generation
export async function generateMetadata({ params }: { params: { userId: string } }): Promise<Metadata> {
  const userId = params.userId;
  const userName = await getUserDisplayName(userId);
  return {
    title: `${userName}'s Top Rated Tracks | MusicBoxd`,
    description: `Explore all tracks rated by ${userName}, sorted by rating. Discover their favorite music.`,
  };
}

// The Page Component
export default async function UserTracksPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;
  const userNamePromise = getUserDisplayName(userId);
  const rawRatingsPromise = getAllTrackRatings(userId);

  const [userName, rawRatings] = await Promise.all([userNamePromise, rawRatingsPromise]);

  // Fetch token and enrich items
  // Note: Enrichment might fail if no user session is active on the server for this request.
  // Using client credentials as a fallback.
  const accessToken = await getClientCredentialsToken();
  const enrichedTracks = await enrichItems(rawRatings, 'track', accessToken);

  return (
    <div className="bg-gradient-to-b from-neutral-900 to-[#121212] min-h-screen text-white">
      {/* <Navbar /> - Consider if Navbar is needed or causes issues with Suspense */}
      <main className="container mx-auto px-4 py-12 pt-20 md:pt-24">
         {/* Header */} 
         <div className="flex items-center mb-8">
          <Link 
            href={`/user/${userId}`} 
            className="flex items-center bg-black bg-opacity-40 hover:bg-opacity-60 transition rounded-full p-2 mr-4"
            aria-label={`Back to ${userName}'s profile`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
          <div>
             <h1 className="text-3xl md:text-4xl font-bold">{userName}'s Rated Tracks</h1>
             <p className="text-neutral-400 mt-1">All tracks rated by {userName}, sorted by highest rating.</p>
          </div>
        </div>

        {/* Grid of Tracks */} 
        <Suspense fallback={<LoadingSkeleton />}>
           {enrichedTracks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {enrichedTracks.map((track) => (
                <RatedTrackCard key={track.item_id || track.id} item={track as RatingItem & SpotifyItem} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-neutral-400 text-lg">{userName} hasn't rated any tracks yet.</p>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}

// Revalidate data periodically (e.g., every hour)
export const revalidate = 3600; 