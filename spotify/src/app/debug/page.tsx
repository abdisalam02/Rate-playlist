'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';

export default function DebugPage() {
  const [trendingData, setTrendingData] = useState<any>(null);
  const [albumsData, setAlbumsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch trending tracks
        const trendingResponse = await fetch('/api/discover/trending?limit=5&use_client_credentials=true');
        if (!trendingResponse.ok) {
          throw new Error(`Trending tracks fetch failed: ${trendingResponse.status}`);
        }
        const trendingJson = await trendingResponse.json();
        setTrendingData(trendingJson);
        
        // Fetch popular albums
        const albumsResponse = await fetch('/api/discover/popular-albums?limit=3&use_client_credentials=true');
        if (!albumsResponse.ok) {
          throw new Error(`Popular albums fetch failed: ${albumsResponse.status}`);
        }
        const albumsJson = await albumsResponse.json();
        setAlbumsData(albumsJson);
        
      } catch (err) {
        setError(`Error fetching data: ${err instanceof Error ? err.message : String(err)}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <Navbar />
      <div className="pt-24">
        <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>
        <p>Loading data...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <Navbar />
      <div className="pt-24">
        <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>
        <p className="text-red-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <Navbar />
      <div className="pt-24">
        <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>
        
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Trending Tracks Data</h2>
          <div className="mb-4">
            <p><strong>Source:</strong> {trendingData?.source || 'Unknown'}</p>
            <p><strong>Mock:</strong> {trendingData?.is_mock ? 'Yes' : 'No'}</p>
            <p><strong>Track Count:</strong> {trendingData?.tracks?.length || 0}</p>
            <p><strong>Debug Info:</strong> {JSON.stringify(trendingData?.debug_info || {})}</p>
          </div>
          
          <div className="bg-[#282828] p-4 rounded-lg mb-4">
            <h3 className="text-xl font-bold mb-2">First 2 Tracks:</h3>
            <pre className="text-xs overflow-auto max-h-[300px]">
              {JSON.stringify(trendingData?.tracks?.slice(0, 2) || [], null, 2)}
            </pre>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-4">Popular Albums Data</h2>
          <div className="mb-4">
            <p><strong>Mock:</strong> {albumsData?.is_mock ? 'Yes' : 'No'}</p>
            <p><strong>Album Count:</strong> {albumsData?.albums?.items?.length || 0}</p>
            <p><strong>Debug Info:</strong> {JSON.stringify(albumsData?.debug_info || {})}</p>
          </div>
          
          <div className="bg-[#282828] p-4 rounded-lg">
            <h3 className="text-xl font-bold mb-2">First 2 Albums:</h3>
            <pre className="text-xs overflow-auto max-h-[300px]">
              {JSON.stringify(albumsData?.albums?.items?.slice(0, 2) || [], null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 