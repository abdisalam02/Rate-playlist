'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function TokenRefresher() {
  const { data: session, update } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const refreshToken = async () => {
      if (!session?.accessToken || refreshing) return;
      
      try {
        // Check if token is about to expire (e.g., within 5 minutes)
        const tokenExpiration = session.expires ? new Date(session.expires) : null;
        const fiveMinutesFromNow = new Date();
        fiveMinutesFromNow.setMinutes(fiveMinutesFromNow.getMinutes() + 5);
        
        if (tokenExpiration && tokenExpiration < fiveMinutesFromNow) {
          console.log('Token about to expire, refreshing...');
          setRefreshing(true);
          
          // Call your API route to refresh the token
          await update(); // This triggers Next-Auth to refresh the session/token
          
          console.log('Token refreshed');
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      } finally {
        setRefreshing(false);
      }
    };

    const interval = setInterval(refreshToken, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [session, update, refreshing]);

  return null;
} 