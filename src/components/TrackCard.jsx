import React, { memo } from 'react';

const TrackCard = memo(({ track, onPlay, className = '' }) => {
  const formatImage = (track) => {
    return track.album?.cover_xl || track.album?.cover_medium || track.album?.cover || 'https://via.placeholder.com/500';
  };

  return (
    <div 
      className={`bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition-colors cursor-pointer group border border-transparent hover:border-[#333] ${className}`}
      onClick={onPlay}
    >
      <div className="w-full aspect-square bg-[#333] rounded-md mb-4 shadow-lg group-hover:shadow-xl relative overflow-hidden flex-shrink-0">
        <img src={formatImage(track)} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
          <svg role="img" height="24" width="24" viewBox="0 0 24 24" fill="black">
            <path d="M7.05 3.606l13.49 7.788a.7.7 0 010 1.212L7.05 20.394A.7.7 0 016 19.788V4.212a.7.7 0 011.05-.606z"></path>
          </svg>
        </div>
      </div>
      <h3 className="font-bold text-white text-sm truncate mb-1">{track.title}</h3>
      <p className="text-xs text-grayText truncate line-clamp-2">{track.artist?.name}</p>
    </div>
  );
});

TrackCard.displayName = 'TrackCard';
export default TrackCard;
