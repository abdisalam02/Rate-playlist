'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import { motion } from 'framer-motion';

// RatingIcon: Adjusted to display larger emojis.
function RatingIcon({ rating }) {
  const sizeClass = "text-4xl"; // You can adjust this if needed
  if (rating >= 4.5) {
    return <span className={sizeClass}>{'🤑'}</span>;
  } else if (rating >= 4.0) {
    return <span className={sizeClass}>{'😎'}</span>;
  } else if (rating >= 3.0) {
    return <span className={sizeClass}>{'😪'}</span>;
  } else {
    return <span className={sizeClass}>{'🤮'}</span>;
  }
}

export default function Home() {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    fetch('/api/playlists')
      .then((res) => res.json())
      .then((data) => setPlaylists(data));
  }, []);

  // Framer Motion variants for the card animation
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Animated Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold mb-8 text-center"
        >
          My Playlists
        </motion.h1>
        <div className="flex justify-center mb-8">
          <Link href="/add-playlist">
            <button className="btn btn-primary">Add Playlist</button>
          </Link>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {playlists.length > 0 ? (
            playlists.map((playlist) => (
              <motion.div
                key={playlist.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.03 }}
                className="card bg-base-200 shadow-xl rounded-lg overflow-hidden transition-all"
              >
                <figure>
                  <img
                    src={playlist.image_url || '/placeholder.png'}
                    alt={playlist.name}
                    className="object-cover w-full h-48"
                  />
                </figure>
                <div className="card-body p-4">
                  <h2 className="card-title text-xl sm:text-2xl font-semibold gradient-text">
                    {playlist.name}
                  </h2>
                  <div className="mt-2 space-y-1">
                    {playlist.user_name && (
                      <p className="info-text text-base">
                        Added by: {playlist.user_name}
                      </p>
                    )}
                    {playlist.songs && (
                      <p className="info-text text-base">
                        Total Tracks: {playlist.songs.length}
                      </p>
                    )}
                    {playlist.averageRating !== null && (
                      <div className="flex items-center space-x-2">
                        <RatingIcon rating={playlist.averageRating} />
                        <p className="info-text text-base">
                          {playlist.averageRating.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="card-actions flex justify-end mt-4">
                    <Link href={`/rate/${playlist.id}`}>
                      <button className="btn btn-primary mr-2">Rate</button>
                    </Link>
                    <Link href={`/versus/${playlist.id}`}>
                      <button className="btn btn-secondary mr-2">Versus</button>
                    </Link>
                    <Link href={`/guess/${playlist.id}`}>
                      <button className="btn btn-accent mr-2">Guess</button>
                    </Link>
                    {/* New Lyrics button */}
                    <Link href={`/lyrics/${playlist.id}`}>
                      <button className="btn btn-info">Lyrics</button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-center">No playlists added yet.</p>
          )}
        </div>
      </div>
      {/* Custom styles */}
      <style jsx>{`
        /* Unique gradient text style for playlist names */
        .gradient-text {
          background: linear-gradient(90deg, #f87171, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        /* Unique info text style for added by & rating numbers */
        .info-text {
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
        }
        @media (max-width: 640px) {
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .card {
            margin-left: auto;
            margin-right: auto;
            max-width: 90%;
          }
          /* Increase mobile text sizes */
          .card-title {
            font-size: 1.5rem; /* approximately text-xl */
          }
          .info-text {
            font-size: 1.125rem; /* a bit bigger than base text */
          }
          .btn {
            font-size: 1rem;
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
