import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { PauseIcon, PlayIcon, StarIcon, BoltIcon, QuestionMarkCircleIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';
import GameButton from './GameButton';

const PlaylistCard = ({ playlist }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div 
      className="bg-[#181818] rounded-lg p-4 hover:bg-[#282828] transition-all duration-300 group relative"
      whileHover={{ y: -4 }}
    >
      <div className="relative aspect-square mb-4 rounded-md overflow-hidden">
        <Image
          src={playlist.image_url || '/placeholder.png'}
          alt={playlist.name}
          fill
          className="object-cover group-hover:scale-105 transition-all duration-300"
        />
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="bg-[#1DB954] rounded-full p-3 shadow-lg hover:scale-105 transition-transform"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <PauseIcon className="w-6 h-6" />
            ) : (
              <PlayIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      <h3 className="font-bold text-white mb-1 truncate">{playlist.name}</h3>
      <p className="text-[#B3B3B3] text-sm mb-4 line-clamp-2">
        {playlist.user_name && `Added by ${playlist.user_name}`}
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <GameButton
              href={`/rate/${playlist.id}`}
              icon={<StarIcon />}
              label="Rate"
              color="bg-purple-600"
            />
            <GameButton
              href={`/versus/${playlist.id}`}
              icon={<BoltIcon />}
              label="Versus"
              color="bg-blue-600"
            />
            <GameButton
              href={`/guess/${playlist.id}`}
              icon={<QuestionMarkCircleIcon />}
              label="Guess"
              color="bg-orange-600"
            />
            <GameButton
              href={`/lyrics/${playlist.id}`}
              icon={<MusicalNoteIcon />}
              label="Lyrics"
              color="bg-pink-600"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PlaylistCard; 