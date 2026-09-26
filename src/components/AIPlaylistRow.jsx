import { useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import TrackCardSkeleton from './skeletons/TrackCardSkeleton';
import { useAppStore } from '../store/useAppStore';
import TrackCard from './TrackCard';
export default function AIPlaylistRow({ categoryData }) {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchAITracks = async () => {
      setIsLoading(true);

      // Phase 4 Requirement: Defensive isolated mapping for each AI track query
      const promises = categoryData.queries.map(async (query) => {
        try {
          const res = await api.get('/search', { 
            params: { q: query, limit: 1 },
            signal: controller.signal
          });
          const results = res.data?.data || res.data || [];
          if (results.length > 0) {
             return results[0]; // Safely grab top match
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
             console.warn(`[AIPlaylistRow] Failed to resolve query from Deezer: ${query}`);
          }
        }
        return null;
      });

      const results = await Promise.all(promises);
      // Filter out any null failures to ensure clean UI
      setTracks(results.filter(t => t !== null));
      setIsLoading(false);
    };

    if (categoryData?.queries?.length > 0) {
      fetchAITracks();
    } else {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [categoryData]);

  const handlePlayContext = (track) => {
    useAppStore.getState().playTrack(track, tracks);
  };

  // If AI generated a playlist but all tracks failed to resolve via Deezer, silently hide it.
  if (!isLoading && tracks.length === 0) return null;

  return (
    <section className="mb-10 w-full overflow-hidden">
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold hover:underline cursor-pointer flex items-center gap-2">
             <span className="text-primary text-xl">✦</span> {categoryData.category || categoryData.title}
           </h2>
           <p className="text-grayText text-sm mt-1">{categoryData.subtitle || categoryData.vibe}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto custom-scrollbar gap-6 pb-4 -mx-2 px-2 snap-x">
        {isLoading ? (
          [...Array(5)].map((_, i) => <TrackCardSkeleton key={i} />)
        ) : (
          tracks.map((track) => (
            <TrackCard 
              key={track.id} 
              track={track} 
              onPlay={() => handlePlayContext(track)}
              className="min-w-[160px] max-w-[180px] flex-shrink-0 snap-start flex flex-col bg-[#1a1a1a] hover:bg-[#2a2a2a] border-[#333]"
            />
          ))
        )}
      </div>
    </section>
  );
}
