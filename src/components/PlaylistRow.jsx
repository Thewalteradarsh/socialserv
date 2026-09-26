import { useEffect, useState } from 'react';
import { api } from '../utils/apiClient';
import TrackCardSkeleton from './skeletons/TrackCardSkeleton';
import { useAppStore } from '../store/useAppStore';
import TrackCard from './TrackCard';
export default function PlaylistRow({ categoryData }) {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTracks = async (signal) => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch using our API client (uses LRU Cache internally)
      const res = await api.get('/search', { 
        params: { q: categoryData.apiQuery, limit: 12 },
        signal
      });
      
      const results = res.data?.data || res.data || [];
      if (results.length === 0) throw new Error("No tracks found");
      
      setTracks(results);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTracks(controller.signal);
    return () => controller.abort();
  }, [categoryData.apiQuery]);

  const handlePlayContext = (track) => {
    // Pass the entire fetched row as the dynamic queue context
    useAppStore.getState().playTrack(track, tracks);
  };

  // Inline Error Recovery UI
  if (error) {
    return (
      <section className="mb-10 w-full">
        <h2 className="text-2xl font-bold mb-6">{categoryData.category}</h2>
        <div className="bg-[#181818] p-6 rounded-md flex flex-col items-center justify-center border border-red-500/20 shadow-md">
          <p className="text-grayText mb-4 text-center">Unable to load "{categoryData.category}" tracks.</p>
          <button 
            onClick={() => fetchTracks()} 
            className="px-6 py-2 rounded-full border border-grayText text-grayText hover:border-white hover:text-white transition-colors text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10 w-full overflow-hidden">
      <div className="mb-6">
        <h2 className="text-2xl font-bold hover:underline cursor-pointer">{categoryData.category}</h2>
        <p className="text-grayText text-sm mt-1">{categoryData.subtitle}</p>
      </div>

      <div className="flex overflow-x-auto custom-scrollbar gap-6 pb-4 -mx-2 px-2 snap-x">
        {isLoading ? (
          /* Zero-Shift Skeletons */
          [...Array(6)].map((_, i) => <TrackCardSkeleton key={i} />)
        ) : (
          tracks.map((track) => (
            <TrackCard 
              key={track.id} 
              track={track} 
              onPlay={() => handlePlayContext(track)}
              className="min-w-[160px] max-w-[180px] flex-shrink-0 snap-start flex flex-col"
            />
          ))
        )}
      </div>
    </section>
  );
}
