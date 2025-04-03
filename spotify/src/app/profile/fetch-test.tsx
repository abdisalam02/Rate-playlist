'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function SessionTest() {
  const { data: session } = useSession();
  const [serverSession, setServerSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check server session
    fetch('/api/debug-session')
      .then(res => res.json())
      .then(data => {
        setServerSession(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.toString());
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-[#181818] p-4 rounded-lg my-6">
      <h2 className="text-xl font-bold mb-3">Session Diagnostic</h2>
      
      <div className="mb-4">
        <h3 className="font-bold mb-1">Client Session:</h3>
        {session ? (
          <div>
            <div>Has access token: {session.accessToken ? 'Yes' : 'No'}</div>
            <div>User: {session.user?.name || 'Unknown'}</div>
            <div>Expires: {session.expires}</div>
          </div>
        ) : (
          <div>No client session found</div>
        )}
      </div>
      
      <div>
        <h3 className="font-bold mb-1">Server Session:</h3>
        {loading ? (
          <div>Loading server session info...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div>
            <div>Has session: {serverSession.hasSession ? 'Yes' : 'No'}</div>
            <div>Has access token: {serverSession.hasAccessToken ? 'Yes' : 'No'}</div>
            <div>User: {serverSession.sessionDetails?.user?.name || 'Unknown'}</div>
            <div>Token: {serverSession.sessionDetails?.tokenInfo}</div>
          </div>
        )}
      </div>
    </div>
  );
} 