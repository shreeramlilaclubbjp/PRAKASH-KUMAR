import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Movie, Season, Episode } from '../types';
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Save, X, Film, Tv, Video, Image as ImageIcon, Star, Calendar, Tag, Info, Play, List, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = ['movie', 'series', 'serial', 'sports'];
const GENRES = ['Epic', 'Mythological', 'Drama', 'Action', 'Adventure', 'Sci-Fi', 'Fantasy', 'Horror', 'Mystery', 'Comedy', 'Thriller', 'Romance', 'Documentary', 'Animation', 'Crime'];

export default function AdminPanel() {
  const [user, loadingAuth] = useAuthState(auth);
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMovie, setEditingMovie] = useState<Partial<Movie> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  useEffect(() => {
    if (!loadingAuth && (!user || user.email !== 'shreeramlilaclub@gmail.com')) {
      navigate('/');
    }
  }, [user, loadingAuth, navigate]);

  useEffect(() => {
    if (user && user.email === 'shreeramlilaclub@gmail.com') {
      fetchMovies();
    }
  }, [user]);

  if (loadingAuth) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.email !== 'shreeramlilaclub@gmail.com') {
    return null;
  }

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'movies'), orderBy('title', 'asc'));
      const querySnapshot = await getDocs(q);
      const moviesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
      setMovies(moviesData);
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMovie = async (movieData: Partial<Movie>) => {
    try {
      // Sanitize data to remove undefined values which Firestore doesn't support
      const sanitizedData = JSON.parse(JSON.stringify(movieData));
      
      if (movieData.id) {
        const movieRef = doc(db, 'movies', movieData.id);
        const { id, ...data } = sanitizedData;
        await updateDoc(movieRef, data);
      } else {
        await addDoc(collection(db, 'movies'), sanitizedData);
      }
      fetchMovies();
      setEditingMovie(null);
      setIsAdding(false);
      setActiveTab('list');
    } catch (error) {
      console.error('Error saving movie:', error);
    }
  };

  const handleDeleteMovie = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await deleteDoc(doc(db, 'movies', id));
        fetchMovies();
      } catch (error) {
        console.error('Error deleting movie:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-12 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-blue-400">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage your content, series, and episodes</p>
          </div>
          <button
            onClick={() => {
              setEditingMovie({});
              setIsAdding(true);
              setActiveTab('form');
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-bold transition-all shadow-xl active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Content
          </button>
        </div>

        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-4 px-4 font-bold text-sm uppercase tracking-widest transition-all relative ${
              activeTab === 'list' ? 'text-blue-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            Content List
            {activeTab === 'list' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-4 px-4 font-bold text-sm uppercase tracking-widest transition-all relative ${
              activeTab === 'form' ? 'text-blue-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            {isAdding ? 'Add New' : 'Edit Content'}
            {activeTab === 'form' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400 rounded-full" />}
          </button>
        </div>

        {activeTab === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={`admin-skeleton-${i}`} className="h-48 bg-white/5 animate-pulse rounded-3xl border border-white/10" />
              ))
            ) : movies.length > 0 ? (
              movies.map(movie => (
                <motion.div
                  layout
                  key={movie.id}
                  className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden group hover:border-blue-600/50 transition-all shadow-2xl"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={movie.thumbnail} alt={movie.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md">
                        {movie.category}
                      </span>
                      {movie.isFeatured && (
                        <span className="bg-amber-500 text-black text-[10px] font-black uppercase px-2 py-1 rounded-md">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 line-clamp-1">{movie.title}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{movie.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingMovie(movie);
                            setIsAdding(false);
                            setActiveTab('form');
                          }}
                          className="p-2 bg-white/10 hover:bg-blue-600/20 hover:text-blue-400 rounded-xl transition-all"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMovie(movie.id)}
                          className="p-2 bg-white/10 hover:bg-red-600/20 hover:text-red-400 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        {movie.rating}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 text-gray-500 bg-white/5 rounded-3xl border border-dashed border-white/10">
                No content found. Start by adding some!
              </div>
            )}
          </div>
        ) : (
          <MovieForm 
            initialData={editingMovie || {}} 
            onSave={handleSaveMovie} 
            onCancel={() => setActiveTab('list')} 
          />
        )}
      </div>
    </div>
  );
}

function MovieForm({ initialData, onSave, onCancel }: { initialData: Partial<Movie>, onSave: (data: Partial<Movie>) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<Partial<Movie>>({
    title: '',
    description: '',
    thumbnail: '',
    youtubeId: '',
    instagramId: '',
    category: 'movie',
    genre: [],
    rating: 0,
    releaseDate: new Date().toISOString().split('T')[0],
    isFeatured: false,
    seasons: [],
    ...initialData
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'seasons'>('basic');

  const handleAddSeason = () => {
    const newSeason: Season = {
      id: `season-${Date.now()}`,
      number: (formData.seasons?.length || 0) + 1,
      title: `Season ${(formData.seasons?.length || 0) + 1}`,
      episodes: []
    };
    setFormData({ ...formData, seasons: [...(formData.seasons || []), newSeason] });
  };

  const handleUpdateSeason = (seasonId: string, updates: Partial<Season>) => {
    const updatedSeasons = formData.seasons?.map(s => s.id === seasonId ? { ...s, ...updates } : s);
    setFormData({ ...formData, seasons: updatedSeasons });
  };

  const handleRemoveSeason = (seasonId: string) => {
    setFormData({ ...formData, seasons: formData.seasons?.filter(s => s.id !== seasonId) });
  };

  const handleAddEpisode = (seasonId: string) => {
    const updatedSeasons = formData.seasons?.map(s => {
      if (s.id === seasonId) {
        const newEpisode: Episode = {
          id: `episode-${Date.now()}`,
          title: 'New Episode',
          thumbnail: '',
          duration: '0:00',
          description: ''
        };
        return { ...s, episodes: [...s.episodes, newEpisode] };
      }
      return s;
    });
    setFormData({ ...formData, seasons: updatedSeasons });
  };

  const handleUpdateEpisode = (seasonId: string, episodeId: string, updates: Partial<Episode>) => {
    const updatedSeasons = formData.seasons?.map(s => {
      if (s.id === seasonId) {
        const updatedEpisodes = s.episodes.map(e => e.id === episodeId ? { ...e, ...updates } : e);
        return { ...s, episodes: updatedEpisodes };
      }
      return s;
    });
    setFormData({ ...formData, seasons: updatedSeasons });
  };

  const handleRemoveEpisode = (seasonId: string, episodeId: string) => {
    const updatedSeasons = formData.seasons?.map(s => {
      if (s.id === seasonId) {
        return { ...s, episodes: s.episodes.filter(e => e.id !== episodeId) };
      }
      return s;
    });
    setFormData({ ...formData, seasons: updatedSeasons });
  };

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex items-center gap-2 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-all ${
            activeTab === 'basic' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
          Basic Info
        </button>
        <button
          onClick={() => setActiveTab('seasons')}
          className={`flex items-center gap-2 px-8 py-4 font-bold text-sm uppercase tracking-widest transition-all ${
            activeTab === 'seasons' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'
          }`}
        >
          <List className="w-4 h-4" />
          Seasons & Episodes
        </button>
      </div>

      <div className="p-8">
        {activeTab === 'basic' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Tag className="w-3 h-3" />
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Enter title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[120px]"
                  placeholder="Enter description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Video className="w-3 h-3" />
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Star className="w-3 h-3" />
                    Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Tag className="w-3 h-3" />
                  Genres
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        const current = formData.genre || [];
                        if (current.includes(g)) {
                          setFormData({ ...formData, genre: current.filter(item => item !== g) });
                        } else {
                          setFormData({ ...formData, genre: [...current, g] });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                        formData.genre?.includes(g) ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  Thumbnail URL
                </label>
                <input
                  type="text"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="https://..."
                />
                {formData.thumbnail && (
                  <div className="mt-2 aspect-video rounded-xl overflow-hidden border border-white/10">
                    <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Play className="w-3 h-3" />
                    YouTube ID
                  </label>
                  <input
                    type="text"
                    value={formData.youtubeId}
                    onChange={(e) => setFormData({ ...formData, youtubeId: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g. dQw4w9WgXcQ"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Video className="w-3 h-3" />
                    Instagram Reel ID
                  </label>
                  <input
                    type="text"
                    value={formData.instagramId}
                    onChange={(e) => setFormData({ ...formData, instagramId: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g. DAr7_LIyk_C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button
                    onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      formData.isFeatured ? 'bg-blue-600' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                      formData.isFeatured ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">Featured Content</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Seasons Management</h3>
              <button
                onClick={handleAddSeason}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Season
              </button>
            </div>

            <div className="space-y-6">
              {formData.seasons?.map((season, sIndex) => (
                <div key={season.id} className="bg-black/30 rounded-3xl border border-white/10 overflow-hidden">
                  <div className="p-6 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black">
                        {season.number}
                      </div>
                      <input
                        type="text"
                        value={season.title}
                        onChange={(e) => handleUpdateSeason(season.id, { title: e.target.value })}
                        className="bg-transparent border-none focus:ring-0 font-bold text-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddEpisode(season.id)}
                        className="p-2 bg-white/10 hover:bg-blue-600/20 hover:text-blue-400 rounded-xl transition-all"
                        title="Add Episode"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRemoveSeason(season.id)}
                        className="p-2 bg-white/10 hover:bg-red-600/20 hover:text-red-400 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {season.episodes.map((episode, eIndex) => (
                        <div key={episode.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                              <span className="text-blue-400">E{eIndex + 1}</span>
                              {episode.title}
                            </h4>
                            <button
                              onClick={() => handleRemoveEpisode(season.id, episode.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-500">Title</label>
                              <input
                                type="text"
                                value={episode.title}
                                onChange={(e) => handleUpdateEpisode(season.id, episode.id, { title: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-500">YouTube ID</label>
                              <input
                                type="text"
                                value={episode.youtubeId || ''}
                                onChange={(e) => handleUpdateEpisode(season.id, episode.id, { youtubeId: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-500">Instagram ID</label>
                              <input
                                type="text"
                                value={episode.instagramId || ''}
                                onChange={(e) => handleUpdateEpisode(season.id, episode.id, { instagramId: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-500">Thumbnail URL</label>
                              <input
                                type="text"
                                value={episode.thumbnail}
                                onChange={(e) => handleUpdateEpisode(season.id, episode.id, { thumbnail: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-500">Duration</label>
                              <input
                                type="text"
                                value={episode.duration}
                                onChange={(e) => handleUpdateEpisode(season.id, episode.id, { duration: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-gray-500">Cast (comma separated)</label>
                              <input
                                type="text"
                                value={episode.cast?.join(', ') || ''}
                                onChange={(e) => handleUpdateEpisode(season.id, episode.id, { cast: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-500">Description</label>
                            <textarea
                              value={episode.description}
                              onChange={(e) => handleUpdateEpisode(season.id, episode.id, { description: e.target.value })}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs min-h-[60px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex items-center justify-end gap-4 border-t border-white/10 pt-8">
          <button
            onClick={onCancel}
            className="px-8 py-3 rounded-2xl font-bold text-gray-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-10 py-3 rounded-2xl font-bold transition-all shadow-xl active:scale-95"
          >
            <Save className="w-5 h-5" />
            Save Content
          </button>
        </div>
      </div>
    </div>
  );
}
