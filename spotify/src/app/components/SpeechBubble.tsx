'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

interface SpeechBubbleProps {
  userImage: string;
  userName: string;
  userId: string;
  message: string;
  timestamp: string;
  position?: 'left' | 'right';
  additionalContent?: React.ReactNode;
  color?: string;
}

export default function SpeechBubble({
  userImage,
  userName,
  userId,
  message,
  timestamp,
  position = 'left',
  additionalContent,
  color = '#1DB954'
}: SpeechBubbleProps) {
  const isLeft = position === 'left';
  
  return (
    <div className={`flex items-start gap-3 mb-4 ${!isLeft ? 'flex-row-reverse' : ''}`}>
      <Link href={`/user/${userId}`} className="shrink-0">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="relative w-9 h-9 rounded-full overflow-hidden border-2"
          style={{ borderColor: color }}
        >
          <Image
            src={userImage}
            alt={userName}
            className="object-cover"
            fill
            sizes="36px"
          />
        </motion.div>
      </Link>
      
      <motion.div 
        className={`min-w-0 flex-1 max-w-[85%] relative group`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.01 }}
      >
        <div 
          className={`
            p-3 rounded-t-lg 
            ${isLeft ? 'rounded-tr-lg rounded-br-lg rounded-bl-none' : 'rounded-tl-lg rounded-bl-lg rounded-br-none'}
            bg-white/10 backdrop-blur-sm
            relative
          `}
          style={{ boxShadow: `0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px ${color}30` }}
        >
          {/* Triangle pointer */}
          <div 
            className={`absolute -bottom-2 w-4 h-4 ${isLeft ? '-left-2' : '-right-2'}`}
            style={{ 
              backgroundColor: color,
              clipPath: isLeft 
                ? 'polygon(0 0, 100% 100%, 100% 0)' 
                : 'polygon(0 0, 0 100%, 100% 0)' 
            }}
          ></div>
          
          <div className="flex items-center mb-1">
            <Link href={`/user/${userId}`} className="font-medium text-sm hover:underline">
              {userName}
            </Link>
            <div 
              className="h-2 w-2 rounded-full mx-2" 
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-xs text-gray-400 ml-auto">{timestamp}</span>
          </div>
          
          <p className="text-sm">{message}</p>
          
          {additionalContent && (
            <div className="mt-2">
              {additionalContent}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
} 