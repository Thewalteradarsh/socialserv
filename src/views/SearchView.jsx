import { useState, useEffect } from 'react';
import { api } from '../utils/apiClient';
import useDebounce from '../hooks/useDebounce';
import { useAppStore } from '../store/useAppStore';
import TrackCardSkeleton from '../components/skeletons/TrackCardSkeleton';
import TrackCard from '../components/TrackCard';
import { Search } from 'lucide-react';

export default function SearchView() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    
    const fetchSearch = async () => {
      setIsLoading(true);
      try {
        // Deezer uses /search?q=query
        const res = await api.get('/search', {
          params: { q: debouncedQuery, limit: 30 },
          signal: controller.signal
        });
        
        let rawTracks = res.data?.data || res.data || [];
        
        // Phase 5: Negative Filter for absolute quality control
        const negativePattern = /karaoke|cover|sped up|tribute|lofi|zzang|originally performed/i;
        rawTracks = rawTracks.filter(r => {
           const text = `${r.title} ${r.artist?.name}`.toLowerCase();
           return !negativePattern.test(text);
        });

        setResults(rawTracks);
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearch();
    // Re-typing before 300ms completes instantly aborts the stale API request.
    return () => controller.abort();
  }, [debouncedQuery]);

  const handlePlay = (track) => {
    useAppStore.getState().playTrack(track, results);
  };

  return (
    <div className="pt-6 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen pb-[150px]">
       <div className="sticky top-0 z-10 bg-[#121212]/95 backdrop-blur-md pb-4 pt-2">
         <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-grayText" size={20} />
           <input 
             type="text"
             placeholder="What do you want to listen to?"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="w-full bg-[#1a1a1a] text-white placeholder-grayText border border-[#333] rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-primary transition-colors text-lg"
           />
         </div>
       </div>

       <div className="mt-6">
         {isLoading && (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {[...Array(12)].map((_, i) => <TrackCardSkeleton key={i} />)}
           </div>
         )}

         {!isLoading && results.length > 0 && (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {results.map((track) => (
               <TrackCard 
                 key={track.id} 
                 track={track} 
                 onPlay={() => handlePlay(track)} 
                 className="flex flex-col"
               />
             ))}
           </div>
         )}
         
         {!isLoading && debouncedQuery && results.length === 0 && (
           <div className="text-center mt-20 text-grayText">
             <p className="text-xl font-bold text-white mb-2">No results found for "{debouncedQuery}"</p>
             <p>Please make sure your words are spelled correctly or use fewer keywords.</p>
           </div>
         )}
       </div>
    </div>
  );
}
