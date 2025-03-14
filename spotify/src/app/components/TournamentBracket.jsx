import React, { useEffect, useState } from 'react';

// Tournament Bracket component with perfect alignment
const TournamentBracket = ({ initialSongs, roundsHistory = [], currentRound, winner }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  if (!initialSongs || initialSongs.length === 0) return null;
  
  // Ensure we have all the rounds data
  const rounds = Array.isArray(roundsHistory) ? [...roundsHistory] : [];
  
  // Add current round if it exists
  if (currentRound && currentRound.length > 0) {
    rounds.push(currentRound);
  }
  
  // For a traditional bracket, we need to organize the songs differently
  // First round (8 songs)
  const firstRound = rounds[0] || [];
  
  // Semi-finals (4 songs)
  const semiFinals = rounds[1] || [];
  
  // Finals (2 songs)
  const finals = rounds[2] || [];
  
  // Champion (1 song)
  const champion = winner || (rounds[3] && rounds[3][0]);
  
  // Determine bracket size
  const bracketSize = initialSongs.length <= 8 ? 8 : 16;
  
  // Helper function to check if a song is a winner in the next round
  const isWinner = (song, nextRound) => {
    if (!song || !nextRound) return false;
    return nextRound.some(nextSong => nextSong.id === song.id);
  };
  
  return (
    <div className={`tournament-bracket bracket-${bracketSize}`}>
      <div className="rounds-container">
        {/* Round 1 */}
        <div className="round">
          <div className="round-title">Round 1</div>
          {firstRound.slice(0, 4).map((song, index) => (
            <div key={song?.id || `r1-${index}`} className={`match ${isWinner(song, semiFinals) ? 'has-winner' : ''}`}>
              <div className={`song-card ${isWinner(song, semiFinals) ? 'winner' : ''}`}>
                <div className="song-image">
                  <img src={song?.image_url} alt={song?.name} />
                </div>
                {(!isMobile || window.innerWidth > 480) && (
                  <div className="song-info">
                    <div className="song-title">{song?.name}</div>
                    <div className="song-artist">{song?.artists}</div>
                  </div>
                )}
              </div>
              <div className="connector-horizontal"></div>
              {index % 2 === 0 && <div className="connector-vertical"></div>}
            </div>
          ))}
        </div>
        
        {/* Semi-finals */}
        <div className="round">
          <div className="round-title">Semi-Finals</div>
          {semiFinals.slice(0, 2).map((song, index) => (
            <div key={song?.id || `sf-${index}`} className={`match ${isWinner(song, finals) ? 'has-winner' : ''}`}>
              <div className={`song-card ${isWinner(song, finals) ? 'winner' : ''}`}>
                <div className="song-image">
                  <img src={song?.image_url} alt={song?.name} />
                </div>
                {(!isMobile || window.innerWidth > 480) && (
                  <div className="song-info">
                    <div className="song-title">{song?.name}</div>
                    <div className="song-artist">{song?.artists}</div>
                  </div>
                )}
              </div>
              <div className="connector-horizontal"></div>
              {index % 2 === 0 && <div className="connector-vertical"></div>}
            </div>
          ))}
        </div>
        
        {/* Finals */}
        <div className="round">
          <div className="round-title">Finals</div>
          {finals.slice(0, 1).map((song, index) => (
            <div key={song?.id || `f-${index}`} className={`match ${champion?.id === song?.id ? 'has-winner' : ''}`}>
              <div className={`song-card ${champion?.id === song?.id ? 'winner' : ''}`}>
                <div className="song-image">
                  <img src={song?.image_url} alt={song?.name} />
                </div>
                {(!isMobile || window.innerWidth > 480) && (
                  <div className="song-info">
                    <div className="song-title">{song?.name}</div>
                    <div className="song-artist">{song?.artists}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Champion */}
          {champion && (
            <div className="champion-container">
              <div className="champion-label">CHAMPION</div>
              <div className="champion-card">
                <div className="song-card winner">
                  <div className="song-image">
                    <img src={champion.image_url} alt={champion.name} />
                  </div>
                  <div className="song-info">
                    <div className="song-title">{champion.name}</div>
                    <div className="song-artist">{champion.artists}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right side of bracket */}
        <div className="round">
          <div className="round-title">Semi-Finals</div>
          {semiFinals.slice(2, 4).map((song, index) => (
            <div key={song?.id || `sf-r-${index}`} className={`match ${isWinner(song, finals) ? 'has-winner' : ''}`}>
              <div className={`song-card ${isWinner(song, finals) ? 'winner' : ''}`}>
                <div className="song-image">
                  <img src={song?.image_url} alt={song?.name} />
                </div>
                {(!isMobile || window.innerWidth > 480) && (
                  <div className="song-info">
                    <div className="song-title">{song?.name}</div>
                    <div className="song-artist">{song?.artists}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Round 1 - Right side */}
        <div className="round">
          <div className="round-title">Round 1</div>
          {firstRound.slice(4, 8).map((song, index) => (
            <div key={song?.id || `r1-r-${index}`} className={`match ${isWinner(song, semiFinals) ? 'has-winner' : ''}`}>
              <div className={`song-card ${isWinner(song, semiFinals) ? 'winner' : ''}`}>
                <div className="song-image">
                  <img src={song?.image_url} alt={song?.name} />
                </div>
                {(!isMobile || window.innerWidth > 480) && (
                  <div className="song-info">
                    <div className="song-title">{song?.name}</div>
                    <div className="song-artist">{song?.artists}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentBracket;
