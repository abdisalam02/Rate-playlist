'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/app/components/Navbar';
import TokenRefresher from '@/app/components/TokenRefresher';

interface CommunityUser {
  id: string;
  display_name: string;
  profile_image: string | null;
  // Add other relevant fields if needed, e.g., username, ratings_count
}

// Skeleton component for loading state
function UserCardSkeleton() {
  return (
    <div className="bg-neutral-800/50 rounded-lg p-4 animate-pulse">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-neutral-700"></div>
        <div className="h-4 bg-neutral-700 rounded w-3/4"></div>
        <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// User card component
function UserCard({ user }: { user: CommunityUser }) {
  return (
    <Link href={`/user/${user.id}`} className="block bg-neutral-800/50 hover:bg-neutral-700/80 rounded-lg p-4 transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-lg">
      <div className="flex flex-col items-center space-y-3">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-neutral-600">
          <Image
            src={user.profile_image || '/default-avatar.png'}
            alt={user.display_name || 'User'}
            fill
            sizes="80px"
            className="object-cover"
            onError={(e) => { e.currentTarget.src = '/default-avatar.png'; }}
          />
        </div>
        <h3 className="font-medium text-white text-center truncate w-full" title={user.display_name}>{user.display_name || 'User'}</h3>
        {/* Optionally display other info like ratings count if available */}
        {/* <p className="text-xs text-neutral-400\">123 Ratings</p> */}
      </div>
    </Link>
  );
}

export default function CommunityMembersPage() {
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[Members Page] Fetching all community users...');
        // Fetch a larger limit, or implement pagination later if needed
        const response = await fetch('/api/community/users?limit=100'); 
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
          console.log(`[Members Page] Received ${data.users.length} users.`);
        } else {
          console.warn('[Members Page] Invalid user data format received.');
          setUsers([]);
        }
      } catch (err: any) {
        console.error('[Members Page] Error fetching users:', err);
        setError(err.message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1f1f1f] to-[#121212] text-white">
      <TokenRefresher />
      <Navbar />
      <main className="pt-20 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex items-center mb-8">
          <Link
            href="/community"
            className="flex items-center bg-black bg-opacity-40 hover:bg-opacity-60 transition rounded-full p-2 mr-4 text-neutral-300 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold">Community Members</h1>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 p-4 rounded-lg text-red-200 mb-8">
            Error loading members: {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => <UserCardSkeleton key={i} />)
          ) : users.length > 0 ? (
            users.map(user => <UserCard key={user.id} user={user} />)
          ) : (
            <p className="col-span-full text-center text-neutral-400 py-12">
              No community members found.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}


