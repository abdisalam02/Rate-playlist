import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { enrichItems, RatingItem, SpotifyItem } from '@/lib/enrichUtils';
import { getClientCredentialsToken } from '@/lib/spotify';
import RatedAlbumCard from '@/app/components/RatedAlbumCard';

// Helper to get user display name (can be shared)
async function getUserDisplayName(userId: string): Promise<string> {
  const { data: user, error } = await supabase
    .from('users')
    .select('display_name')
    .or(`id.eq.${userId},spotify_id.eq.${userId}`)
    .single();
  if (error || !user) {
    console.error(`[UserAlbumsPage] Error fetching user display name for ${userId}:`, error);
    return 'User';
  }
  return user.display_name || 'User';
}

// Function to fetch all album ratings for a user
async function getAllAlbumRatings(userId: string): Promise<RatingItem[]> {
  // Find the UUID associated with the userId
  const { data: userData, error: userLookupError } = await supabase
    .from('users')
    .select('id')
    .or(`id.eq.${userId},spotify_id.eq.${userId}`)
    .single();

  if (userLookupError || !userData) {
    console.error(`[UserAlbumsPage] Could not find user UUID for ${userId}:`, userLookupError);
    notFound(); 
  }
  const userUUID = userData.id;

  console.log(`[UserAlbumsPage] Fetching all album ratings for user UUID: ${userUUID}`);
  const { data, error } = await supabase
    .from('ratings')
    .select('*') 
    .eq('user_id', userUUID)
    .eq('item_type', 'album')
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[UserAlbumsPage] Error fetching album ratings:', error);
    throw new Error('Failed to fetch album ratings.'); 
  }
   console.log(`[UserAlbumsPage] Found ${data?.length || 0} raw album ratings.`);
  return data || [];
}

// Simple Loading Skeleton (can be shared)
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
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
    title: `${userName}'s Top Rated Albums | MusicBoxd`,
    description: `Explore all albums rated by ${userName}, sorted by rating. Discover their favorite music.`,
  };
}

// The Page Component
export default async function UserAlbumsPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;
  const userNamePromise = getUserDisplayName(userId);
  const rawRatingsPromise = getAllAlbumRatings(userId);

  const [userName, rawRatings] = await Promise.all([userNamePromise, rawRatingsPromise]);

  const accessToken = await getClientCredentialsToken(); // Use client credentials for enrichment
  const enrichedAlbums = await enrichItems(rawRatings, 'album', accessToken);

  return (
    <div className="bg-gradient-to-b from-neutral-900 to-[#121212] min-h-screen text-white">
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
             <h1 className="text-3xl md:text-4xl font-bold">{userName}'s Rated Albums</h1>
             <p className="text-neutral-400 mt-1">All albums rated by {userName}, sorted by highest rating.</p>
          </div>
        </div>

        {/* Grid of Albums */}
        <Suspense fallback={<LoadingSkeleton />}>
           {enrichedAlbums.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {enrichedAlbums.map((album) => (
                <RatedAlbumCard key={album.item_id || album.id} item={album as RatingItem & SpotifyItem} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-neutral-400 text-lg">{userName} hasn't rated any albums yet.</p>
            </div>
          )}
        </Suspense>
      </main>
    </div>
  );
}

export const revalidate = 3600; // Revalidate hourly 