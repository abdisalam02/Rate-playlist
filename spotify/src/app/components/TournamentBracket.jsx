import React from "react";
import { motion } from "framer-motion";
import SVGComponent from "./SVGBracket";

// Define variants for each image based on its final x coordinate.
const imageVariants = {
  hidden: (custom) => ({
    // custom is the x coordinate from our positions array.
    x: custom < 12 ? -50 : 50, // if on the left, start from -50; on the right, from +50.
    opacity: 0,
  }),
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
};

// Container variants for staggered animation.
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

export default function TournamentBracket({ roundsHistory }) {
  // Flatten roundsHistory into a single array of up to 15 songs:
  let bracketSongs = [];
  if (roundsHistory[0]) bracketSongs.push(...roundsHistory[0]); // Quarterfinal seeds (up to 8)
  if (roundsHistory[1]) bracketSongs.push(...roundsHistory[1]); // Semifinal winners (up to 4)
  if (roundsHistory[2]) bracketSongs.push(...roundsHistory[2]); // Final winners (up to 2)
  if (roundsHistory[3]) bracketSongs.push(...roundsHistory[3]); // Champion (1)

  // These are your fixed positions (in a 24x24 coordinate system) that you've adjusted.
  const positions = [
    // Quarterfinal seeds: 8
    { x: 0.5,  y: 0.5  }, // QF1 left top
    { x: 0.5,  y: 7  }, // QF2
    { x: 0.5,  y: 14 }, // QF3
    { x: 0.5,  y: 21 }, // QF4
    { x: 21, y: 0.5  }, // QF5 right top
    { x: 21, y: 7  }, // QF6
    { x: 21, y: 14 }, // QF7
    { x: 21, y: 21 }, // QF8
    // Semifinals: 4
    { x: 7,  y: 4.1 }, // SF1 left top
    { x: 6,  y: 18  }, // SF2 left bottom
    { x: 15, y: 3.5 }, // SF3 right top
    { x: 15, y: 18  }, // SF4 right bottom
    // Finals: 2
    { x: 7,  y: 10.5  }, // Final left
    { x: 14.7, y: 10.5  }, // Final right
    // Champion: 1
    { x: 11, y: 10.5  }, // champion center
  ];

  return (
    <motion.div
      className="relative w-full max-w-[400px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Render the SVG bracket as background */}
      <SVGComponent className="w-full h-auto text-black opacity-50" />
      {/* Overlay images with animation */}
      {bracketSongs.slice(0, 15).map((song, index) => {
        const { x, y } = positions[index];
        // Convert the 24x24 coordinate into percentages.
        const leftPct = (x / 24) * 100;
        const topPct = (y / 24) * 100;
        return (
          <motion.img
            key={song.id}
            src={song.image_url}
            alt={song.name}
            className="absolute rounded-full border border-white shadow-md"
            style={{
              width: "12%",
              height: "auto",
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: "translate(-50%, -50%)",
            }}
            custom={x}  // Pass the x value as custom data for the variant.
            variants={imageVariants}
          />
        );
      })}
    </motion.div>
  );
}
