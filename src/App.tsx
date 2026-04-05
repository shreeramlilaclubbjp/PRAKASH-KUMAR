import React from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, getDocFromServer } from 'firebase/firestore';
import { SeriesModal } from './components/SeriesModal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Hero from './components/Hero';
import MovieCard, { MovieCardSkeleton } from './components/MovieCard';
import Chatbot from './components/Chatbot';
import AdminPanel from './components/AdminPanel';
import PremiumBadge from './components/PremiumBadge';
import MembershipModal from './components/MembershipModal';
import MovieModal from './components/MovieModal';
import { Movie, UserProfile, Season, Episode } from './types';
import { searchMovies, getRecommendations } from './services/geminiService';
import YouTube from 'react-youtube';
import { Play, X, Star, Calendar, Tag, ChevronRight, ChevronLeft, LogOut, Filter, SlidersHorizontal, ArrowUpDown, Search, ChevronDown, Plus, Check, ShoppingBag, Mic, Crown, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { useUserProfile } from './hooks/useUserProfile';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';

const generateRamleelaSeasons = (): Season[] => {
  const seasons: Season[] = [];
  const startYear = 2007;
  const endYear = 2026;
  
  const trailerIds = [
    '5yl3UbJxAg8', 'x8UAUAuKxeU', 'zSWdZVtXT7E', 'b9EkMc79ZSU', 'dQw4w9WgXcQ',
    'y6120qOlsfU', '9bZkp7q19f0', 'V-_O7nl0Ii0', 'L_jWHffIx5E', 'h6S_S_S_S_S',
    'a_b_c_d_e_f', 'g_h_i_j_k_l', 'm_n_o_p_q_r', 's_t_u_v_w_x', 'y_z_0_1_2_3',
    '4_5_6_7_8_9', 'A_B_C_D_E_F', 'G_H_I_J_K_L', 'M_N_O_P_Q_R', 'S_T_U_V_W_X'
  ];

  for (let year = startYear; year <= endYear; year++) {
    const seasonNumber = year - startYear + 1;
    const isComingSoon = year === 2026;
    
    const episodes: Episode[] = [];
    if (!isComingSoon) {
      const episodeTitles = [
        'Vishnu Darbar', 'Ram Janm', 'Sita Swayamvar', 'Vanvas', 
        'Bharat Milap', 'Hanuman Milan', 'Lanka Dahan', 'Ravan Vadh', 
        'Rajyabhishek', 'Behind the Scenes'
      ];

      for (let i = 0; i < 10; i++) {
        const isFirstEpisodeOfFirstSeason = seasonNumber === 1 && i === 0;
        episodes.push({
          id: `ramleela-s${seasonNumber}-e${i + 1}`,
          title: episodeTitles[i],
          thumbnail: `https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=400&sig=${seasonNumber}-${i}`,
          youtubeId: isFirstEpisodeOfFirstSeason ? undefined : trailerIds[seasonNumber % trailerIds.length],
          instagramId: isFirstEpisodeOfFirstSeason ? 'DAr7_LIyk_C' : undefined,
          duration: i === 9 ? '45:00' : '30:00',
          description: i === 9 
            ? `Exclusive behind-the-scenes look at the making of Ramleela ${year}.`
            : `Experience the divine story of ${episodeTitles[i]} in this spectacular production from ${year}.`,
          cast: isFirstEpisodeOfFirstSeason ? ['Arun Govil (Ram)', 'Deepika Chikhalia (Sita)', 'Sunil Lahri (Lakshman)', 'Dara Singh (Hanuman)', 'Arvind Trivedi (Ravana)'] : undefined
        });
      }
    }

    seasons.push({
      id: `ramleela-s${seasonNumber}`,
      number: seasonNumber,
      title: isComingSoon ? `Season ${year} (Coming Soon)` : `Season ${year}`,
      episodes: episodes,
      trailerId: trailerIds[(seasonNumber - 1) % trailerIds.length]
    });
  }
  return seasons;
};

const RAMLEELA_SERIES: Movie = {
  id: 'ramleela-series',
  title: 'Ramleela: The Eternal Saga',
  description: 'A grand theatrical production of the epic Ramayana, spanning over two decades of tradition and devotion. Witness the life of Lord Rama in this spectacular series of performances from 2007 to the present.',
  thumbnail: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1920',
  youtubeId: '5yl3UbJxAg8',
  category: 'series',
  genre: ['Epic', 'Mythological', 'Drama'],
  rating: 4.9,
  releaseDate: '2007-10-20',
  seasons: generateRamleelaSeasons(),
  isPremium: true
};

const MAHISHASUR_VADH_MOVIE: Movie = {
  id: 'mahishasur-vadh',
  title: 'Mahishasur Vadh (Full Movie)',
  description: 'The epic story of Goddess Durga defeating the demon Mahishasur, symbolizing the victory of good over evil.',
  thumbnail: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1920',
  youtubeId: 'dLDKRsNQbMg',
  category: 'movie',
  genre: ['Epic', 'Mythological', 'Action'],
  rating: 4.9,
  releaseDate: '2024-10-15',
  isPremium: true
};

const MAHISHASUR_VADH_SERIES: Movie = {
  id: 'mahishasur-vadh-series',
  title: 'Mahishasur Vadh (Series)',
  description: 'Experience the epic battle of Goddess Durga in a multi-part series format.',
  thumbnail: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1920',
  youtubeId: 'tRiBTrfxfK8',
  category: 'series',
  genre: ['Epic', 'Mythological', 'Drama'],
  rating: 4.9,
  releaseDate: '2024-10-15',
  seasons: [
    {
      id: 'mv-series-s1',
      number: 1,
      title: 'Season 1',
      episodes: [
        {
          id: 'mv-series-e1',
          title: 'Episode 1',
          thumbnail: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1920',
          youtubeId: 'tRiBTrfxfK8',
          duration: '45:00',
          description: 'The beginning of the divine battle.',
          cast: ['Goddess Durga', 'Mahishasur']
        },
        {
          id: 'mv-series-e2',
          title: 'Episode 2',
          thumbnail: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&q=80&w=1920',
          youtubeId: 'dLDKRsNQbMg',
          duration: '45:00',
          description: 'The final confrontation.',
          cast: ['Goddess Durga', 'Mahishasur']
        }
      ]
    }
  ]
};

const FEATURED_MOVIES: Movie[] = [
  MAHISHASUR_VADH_SERIES,
  MAHISHASUR_VADH_MOVIE,
  RAMLEELA_SERIES,
  {
    id: 'featured-1',
    title: 'The Rings of Power',
    description: 'In a world where everything is at stake, one hero must rise to protect the innocent from an ancient evil that has returned to claim the throne.',
    thumbnail: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'x8UAUAuKxeU',
    category: 'series',
    genre: ['Fantasy', 'Adventure', 'Drama'],
    rating: 4.8,
    releaseDate: '2024-05-15',
    isFeatured: true,
    isPremium: true
  },
  {
    id: 'featured-2',
    title: 'Interstellar',
    description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
    thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'zSWdZVtXT7E',
    category: 'movie',
    genre: ['Adventure', 'Drama', 'Sci-Fi'],
    rating: 8.7,
    releaseDate: '2014-11-07',
    isFeatured: true
  },
  {
    id: 'featured-3',
    title: 'Stranger Things',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    thumbnail: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'b9EkMc79ZSU',
    category: 'series',
    genre: ['Drama', 'Fantasy', 'Horror'],
    rating: 8.7,
    releaseDate: '2016-07-15',
    isFeatured: true
  },
  {
    id: 'dummy-movie-1',
    title: 'The Dark Knight',
    description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
    thumbnail: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'EXeTwQWrcwY',
    category: 'movie',
    genre: ['Action', 'Crime', 'Drama'],
    rating: 9.0,
    releaseDate: '2008-07-18',
    isFeatured: true
  },
  {
    id: 'dummy-movie-2',
    title: 'Inception',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'YoHD9XEInc0',
    category: 'movie',
    genre: ['Action', 'Adventure', 'Sci-Fi'],
    rating: 8.8,
    releaseDate: '2010-07-16',
    isFeatured: false
  },
  {
    id: 'dummy-series-1',
    title: 'The Boys',
    description: 'A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers.',
    thumbnail: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'M1bhOaLV4FU',
    category: 'series',
    genre: ['Action', 'Comedy', 'Crime'],
    rating: 8.7,
    releaseDate: '2019-07-26',
    isFeatured: true
  },
  {
    id: 'dummy-series-2',
    title: 'The Bear',
    description: 'A young chef from the fine dining world comes home to Chicago to run his family sandwich shop.',
    thumbnail: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'gB9n2gHsS4k',
    category: 'series',
    genre: ['Comedy', 'Drama'],
    rating: 8.6,
    releaseDate: '2022-06-23',
    isFeatured: false
  },
  {
    id: 'dummy-sport-1',
    title: 'IPL 2024 Final Highlights',
    description: 'Relive the most exciting moments from the IPL 2024 Grand Finale.',
    thumbnail: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'sports',
    genre: ['Cricket', 'Sports'],
    rating: 4.9,
    releaseDate: '2024-05-26',
    isFeatured: true
  },
  {
    id: 'dummy-sport-2',
    title: 'Wimbledon 2024 Best Moments',
    description: 'The best shots and rallies from the prestigious grass court tournament.',
    thumbnail: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'sports',
    genre: ['Tennis', 'Sports'],
    rating: 4.8,
    releaseDate: '2024-07-14',
    isFeatured: false
  },
  {
    id: 'dummy-series-3',
    title: 'Mirzapur',
    description: 'A shocking incident at a wedding procession ignites a series of events which entangles the lives of two families in the lawless city of Mirzapur.',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'ZNeGF-PvRHY',
    category: 'series',
    genre: ['Action', 'Crime', 'Drama'],
    rating: 8.5,
    releaseDate: '2018-11-16',
    isFeatured: true,
    isPremium: true,
    seasons: [
      {
        id: 'mirzapur-s1',
        number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'm-s1-e1', title: 'Jhandu', thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400', youtubeId: 'ZNeGF-PvRHY', duration: '45:00', description: 'The beginning of the rivalry.' }
        ]
      }
    ]
  },
  {
    id: 'dummy-series-4',
    title: 'The Family Man',
    description: 'A working man from the National Investigation Agency tries to protect the nation from terrorism, but he also has to protect his family from the impact of his secretive, high-pressure, and low-paying job.',
    thumbnail: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'XatRGut65VI',
    category: 'series',
    genre: ['Action', 'Comedy', 'Drama'],
    rating: 8.7,
    releaseDate: '2019-09-20',
    isFeatured: true,
    seasons: [
      {
        id: 'tfm-s1',
        number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'tfm-s1-e1', title: 'The Family Man', thumbnail: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=400', youtubeId: 'XatRGut65VI', duration: '50:00', description: 'Srikant Tiwari is a middle-class man who also happens to be a world-class spy.' }
        ]
      }
    ]
  },
  {
    id: 'dummy-serial-1',
    title: 'Anupamaa',
    description: 'Anupamaa, who sacrificed her dreams to raise her family, is unhappy in her marriage. After realizing the truth, she decides to live life on her own terms.',
    thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'serial',
    genre: ['Drama', 'Family'],
    rating: 4.5,
    releaseDate: '2020-07-13',
    isFeatured: false,
    seasons: [
      {
        id: 'anupamaa-s1',
        number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'anu-e1', title: 'The Awakening', thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400', youtubeId: 'dQw4w9WgXcQ', duration: '22:00', description: 'Anupamaa realizes her worth.' }
        ]
      }
    ]
  },
  {
    id: 'dummy-serial-2',
    title: 'Taarak Mehta Ka Ooltah Chashmah',
    description: 'The residents of a housing society help each other find solutions when they face common real-life problems and get involved in sticky situations.',
    thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'serial',
    genre: ['Comedy', 'Family'],
    rating: 8.2,
    releaseDate: '2008-07-28',
    isFeatured: false,
    seasons: [
      {
        id: 'tmkoc-s1',
        number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'tmkoc-e1', title: 'Gokuldham Society', thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&q=80&w=400', youtubeId: 'dQw4w9WgXcQ', duration: '20:00', description: 'Introduction to the society.' }
        ]
      }
    ]
  },
  {
    id: 'dummy-series-5',
    title: 'Sacred Games',
    description: 'A link in their pasts leads an honest cop to a fugitive gang boss whose cryptic warning prompts the officer on a quest to save Mumbai from cataclysm.',
    thumbnail: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1920',
    youtubeId: '28j8h0RRov4',
    category: 'series',
    genre: ['Action', 'Crime', 'Drama'],
    rating: 8.6,
    releaseDate: '2018-07-06',
    isFeatured: true,
    seasons: [
      {
        id: 'sg-s1',
        number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'sg-s1-e1', title: 'Ashwathama', thumbnail: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=400', youtubeId: '28j8h0RRov4', duration: '50:00', description: 'Sartaj Singh receives a call from Ganesh Gaitonde.' }
        ]
      }
    ]
  },
  {
    id: 'dummy-series-6',
    title: 'Delhi Crime',
    description: 'Based on the 2012 Nirbhaya case, Delhi Crime follows the Delhi Police investigation into the finding of the men who perpetrated the crime.',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'jNuKivKJyz8',
    category: 'series',
    genre: ['Crime', 'Drama'],
    rating: 8.5,
    releaseDate: '2019-03-22',
    isFeatured: false,
    seasons: [
      {
        id: 'dc-s1',
        number: 1,
        title: 'Season 1',
        episodes: [
          { id: 'dc-s1-e1', title: 'Episode 1', thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400', youtubeId: 'jNuKivKJyz8', duration: '45:00', description: 'The investigation begins.' }
        ]
      }
    ]
  },
  {
    id: 'dummy-sport-3',
    title: 'T20 World Cup 2024 Highlights',
    description: 'Relive the most intense moments from the T20 World Cup 2024.',
    thumbnail: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'sports',
    genre: ['Cricket', 'Sports'],
    rating: 4.9,
    releaseDate: '2024-06-29',
    isFeatured: true
  },
  {
    id: 'dummy-sport-4',
    title: 'Champions League Final 2024',
    description: 'The ultimate showdown in European club football.',
    thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'sports',
    genre: ['Football', 'Sports'],
    rating: 4.9,
    releaseDate: '2024-06-01',
    isFeatured: false
  },
  {
    id: 'dummy-sport-5',
    title: 'NBA Finals 2024 Highlights',
    description: 'The best plays from the 2024 NBA Championship series.',
    thumbnail: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'sports',
    genre: ['Basketball', 'Sports'],
    rating: 4.8,
    releaseDate: '2024-06-17',
    isFeatured: false
  },
  {
    id: 'dummy-sport-6',
    title: 'Formula 1 Monaco GP 2024',
    description: 'High-speed action from the streets of Monte Carlo.',
    thumbnail: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1920',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'sports',
    genre: ['Racing', 'Sports'],
    rating: 4.7,
    releaseDate: '2024-05-26',
    isFeatured: false
  }
];

const top10 = [
  { id: '1', title: 'The Rookie', image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=600&h=350', info: 'U/A 13+ • 8 seasons • 2026 • Drama • Thriller' },
  { id: '2', title: 'The Boys', image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600&h=350', info: 'A • 4 seasons • 2024 • Action • Sci-Fi' },
];

const addOnSubscriptions = [
  { id: 'aot', title: 'Attack on Titan', image: 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=300&h=450', subtitle: 'Anime Times' },
  { id: 'mos', title: 'Masters of Sex', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=300&h=450', subtitle: 'Sony Pictures Stream' },
  { id: 'erotic', title: 'Erotic Stories', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300&h=450', subtitle: 'Lionsgate Play', hasBag: true },
];

const mySubscriptions = [
  { id: 'goldmines', title: 'Goldmines Play', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600&h=350', price: '₹39 ₹29/ month', hasBag: true },
  { id: 'appletv', title: 'Apple TV', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600&h=350', price: '₹99/ month', hasBag: true },
];

function HomePage() {
  const [user] = useAuthState(auth);
  const [movies, setMovies] = React.useState<Movie[]>([]);
  const [series, setSeries] = React.useState<Movie[]>([]);
  const [sports, setSports] = React.useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = React.useState<Movie[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { userProfile, toggleWatchlist, subscribe, loading: loadingProfile } = useUserProfile();

  const handlePlay = (movie: Movie) => {
    if (movie.isPremium && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    if (movie.seasons) {
      setSelectedSeries(movie);
    } else {
      setSelectedMovie(movie);
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch from Firestore
        const moviesQuery = query(collection(db, 'movies'));
        const querySnapshot = await getDocs(moviesQuery);
        const allContent = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));

        if (allContent.length === 0) {
          // If Firestore is empty and user is admin, migrate initial data
          if (user?.email === 'shreeramlilaclub@gmail.com') {
            console.log('Firestore is empty, migrating initial data...');
            for (const movie of FEATURED_MOVIES) {
              const { id, ...data } = movie;
              // Sanitize data to remove undefined values which Firestore doesn't support
              const sanitizedData = JSON.parse(JSON.stringify({ ...data }));
              await addDoc(collection(db, 'movies'), sanitizedData);
            }
            // Re-fetch after migration
            const newSnapshot = await getDocs(moviesQuery);
            const migratedContent = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
            processContent(migratedContent);
          } else {
            // Non-admin sees empty state or fallback
            processContent(FEATURED_MOVIES);
          }
        } else {
          // If Firestore is not empty, check for missing dummy data and add it (admin only)
          if (user?.email === 'shreeramlilaclub@gmail.com') {
            let needsRefresh = false;
            for (const dummy of FEATURED_MOVIES) {
              const exists = allContent.some(m => m.title === dummy.title);
              if (!exists) {
                console.log(`Adding missing dummy content: ${dummy.title}`);
                const { id, ...data } = dummy;
                const sanitizedData = JSON.parse(JSON.stringify({ ...data }));
                await addDoc(collection(db, 'movies'), sanitizedData);
                needsRefresh = true;
              }
            }
            
            if (needsRefresh) {
              const updatedSnapshot = await getDocs(moviesQuery);
              const updatedContent = updatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
              processContent(updatedContent);
              return;
            }
          }
          processContent(allContent);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback to hardcoded data if Firestore fails
        processContent(FEATURED_MOVIES);
      } finally {
        setLoadingData(false);
      }
    };

    const processContent = (content: Movie[]) => {
      setFeaturedMovies(content.filter(m => m.isFeatured));
      setMovies(content.filter(m => m.category === 'movie'));
      setSeries(content.filter(m => m.category === 'series' || m.category === 'serial'));
      setSports(content.filter(m => m.category === 'sports'));
    };

    fetchData();
  }, [user]);

  return (
    <div className="bg-black min-h-screen text-white pb-24">
      <Hero 
        movies={featuredMovies.length > 0 ? featuredMovies : FEATURED_MOVIES} 
        onPlay={handlePlay}
        onToggleWatchlist={toggleWatchlist}
        isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
      />
      
      <div className="px-4 md:px-12 -mt-12 relative z-10 space-y-12">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight">
              Movies
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
            {loadingData ? (
              [...Array(5)].map((_, i) => (
                <div key={`home-movie-skeleton-${i}`} className="w-[260px] md:w-[300px] flex-shrink-0">
                  <MovieCardSkeleton variant="landscape" />
                </div>
              ))
            ) : (
              movies.map(movie => (
                <div key={movie.id} className="w-[260px] md:w-[300px] flex-shrink-0">
                  <MovieCard
                    movie={movie}
                    onPlay={handlePlay}
                    isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                    onToggleWatchlist={toggleWatchlist}
                    variant="landscape"
                  />
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 group cursor-pointer">
              Series
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
            {loadingData ? (
              [...Array(6)].map((_, i) => (
                <div key={`home-series-skeleton-${i}`} className="w-[130px] md:w-[170px] flex-shrink-0">
                  <MovieCardSkeleton variant="portrait" />
                </div>
              ))
            ) : (
              series.map(movie => (
                <div key={movie.id} className="w-[130px] md:w-[170px] flex-shrink-0">
                  <MovieCard
                    movie={movie}
                    onPlay={handlePlay}
                    isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                    onToggleWatchlist={toggleWatchlist}
                    variant="portrait"
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {sports.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 group cursor-pointer">
                Sports
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
              {sports.map(movie => (
                <div key={movie.id} className="w-[260px] md:w-[300px] flex-shrink-0">
                  <MovieCard
                    movie={movie}
                    onPlay={handlePlay}
                    isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                    onToggleWatchlist={toggleWatchlist}
                    variant="landscape"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
        )}

        {selectedSeries && (
          <SeriesModal 
            movie={selectedSeries} 
            onClose={() => setSelectedSeries(null)} 
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
          />
        )}

        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </AnimatePresence>
    </div>
  );
}

function SeriesPage() {
  const navigate = useNavigate();
  const [series, setSeries] = React.useState<Movie[]>([]);
  const [featuredSeries, setFeaturedSeries] = React.useState<Movie[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { userProfile, toggleWatchlist, subscribe } = useUserProfile();

  const handlePlay = (movie: Movie) => {
    if (movie.isPremium && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    if (movie.seasons) {
      setSelectedSeries(movie);
    } else {
      setSelectedMovie(movie);
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const moviesQuery = query(collection(db, 'movies'));
        const querySnapshot = await getDocs(moviesQuery);
        const allContent = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
        
        const seriesContent = allContent.filter(m => m.category === 'series' || m.category === 'serial');
        setSeries(seriesContent);
        setFeaturedSeries(seriesContent.filter(m => m.isFeatured).slice(0, 5));
      } catch (error) {
        console.error('Error fetching series:', error);
        const fallback = FEATURED_MOVIES.filter(m => m.category === 'series' || m.category === 'serial');
        setSeries(fallback);
        setFeaturedSeries(fallback.filter(m => m.isFeatured).slice(0, 5));
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const sections = [
    { title: 'Popular Series', variant: 'portrait' as const, filter: (m: Movie) => m.category === 'series' },
    { title: 'Indian Serials', variant: 'portrait' as const, filter: (m: Movie) => m.category === 'serial' },
    { title: 'Action & Thriller', variant: 'landscape' as const, filter: (m: Movie) => m.genre.includes('Action') || m.genre.includes('Thriller') },
    { title: 'Top Rated', variant: 'portrait' as const, filter: (m: Movie) => m.rating >= 8.5 }
  ];

  return (
    <div className="bg-black min-h-screen pt-24 text-white pb-24">
      {/* Header */}
      <div className="px-4 md:px-12 mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Series & Serials</h1>
        </div>
        
        <div className="relative inline-block">
          <select className="bg-[#1a242f] border border-white/10 rounded-md px-4 py-2 text-sm font-bold focus:outline-none appearance-none pr-10 cursor-pointer hover:bg-[#252e3a] transition-colors text-gray-300">
            <option className="bg-[#1a242f]">All categories</option>
            <option className="bg-[#1a242f]">Action</option>
            <option className="bg-[#1a242f]">Comedy</option>
            <option className="bg-[#1a242f]">Drama</option>
            <option className="bg-[#1a242f]">Family</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
        </div>
      </div>

      {/* Hero Section */}
      <div className="mb-12">
        <Hero 
          movies={featuredSeries.length > 0 ? featuredSeries : FEATURED_MOVIES.filter(m => m.category === 'series' || m.category === 'serial')} 
          onPlay={handlePlay}
          onToggleWatchlist={toggleWatchlist}
          isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
        />
      </div>

      {/* Series Sections */}
      <div className="px-4 md:px-12 space-y-12">
        {sections.map((section) => {
          const sectionMovies = series.filter(section.filter);
          if (sectionMovies.length === 0 && !loadingData) return null;

          return (
            <section key={`series-section-${section.title}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 group cursor-pointer">
                  {section.title}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
                {loadingData ? (
                  [...Array(5)].map((_, i) => (
                    <div key={`series-skeleton-${section.title}-${i}`} className={section.variant === 'landscape' ? "w-[260px] md:w-[300px] flex-shrink-0" : "w-[130px] md:w-[170px] flex-shrink-0"}>
                      <MovieCardSkeleton variant={section.variant} />
                    </div>
                  ))
                ) : (
                  sectionMovies.map(movie => (
                    <div key={movie.id} className={section.variant === 'landscape' ? "w-[260px] md:w-[300px] flex-shrink-0" : "w-[130px] md:w-[170px] flex-shrink-0"}>
                      <MovieCard
                        movie={movie}
                        onPlay={handlePlay}
                        isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                        onToggleWatchlist={toggleWatchlist}
                        variant={section.variant}
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <YouTube
                videoId={selectedMovie.youtubeId}
                className="w-full h-full"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1 },
                }}
              />
            </div>
          </motion.div>
        )}

        {selectedSeries && (
          <SeriesModal 
            movie={selectedSeries} 
            onClose={() => setSelectedSeries(null)} 
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
          />
        )}

        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </AnimatePresence>
    </div>
  );
}

function SportsPage() {
  const navigate = useNavigate();
  const [sports, setSports] = React.useState<Movie[]>([]);
  const [featuredSports, setFeaturedSports] = React.useState<Movie[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { userProfile, toggleWatchlist, subscribe } = useUserProfile();

  const handlePlay = (movie: Movie) => {
    if (movie.isPremium && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    setSelectedMovie(movie);
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const moviesQuery = query(collection(db, 'movies'));
        const querySnapshot = await getDocs(moviesQuery);
        const allContent = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
        
        const sportsContent = allContent.filter(m => m.category === 'sports');
        setSports(sportsContent);
        setFeaturedSports(sportsContent.filter(m => m.isFeatured).slice(0, 5));
      } catch (error) {
        console.error('Error fetching sports:', error);
        const fallback = FEATURED_MOVIES.filter(m => m.category === 'sports');
        setSports(fallback);
        setFeaturedSports(fallback.filter(m => m.isFeatured).slice(0, 5));
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const sections = [
    { title: 'Cricket Highlights', variant: 'landscape' as const, filter: (m: Movie) => m.genre.includes('Cricket') },
    { title: 'Football Action', variant: 'landscape' as const, filter: (m: Movie) => m.genre.includes('Football') },
    { title: 'Other Sports', variant: 'landscape' as const, filter: (m: Movie) => !m.genre.includes('Cricket') && !m.genre.includes('Football') }
  ];

  return (
    <div className="bg-black min-h-screen pt-24 text-white pb-24">
      {/* Header */}
      <div className="px-4 md:px-12 mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Sports</h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className="mb-12">
        <Hero 
          movies={featuredSports.length > 0 ? featuredSports : FEATURED_MOVIES.filter(m => m.category === 'sports')} 
          onPlay={handlePlay}
          onToggleWatchlist={toggleWatchlist}
          isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
        />
      </div>

      {/* Sports Sections */}
      <div className="px-4 md:px-12 space-y-12">
        {sections.map((section) => {
          const sectionMovies = sports.filter(section.filter);
          if (sectionMovies.length === 0 && !loadingData) return null;

          return (
            <section key={`sports-section-${section.title}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 group cursor-pointer">
                  {section.title}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
                {loadingData ? (
                  [...Array(5)].map((_, i) => (
                    <div key={`sports-skeleton-${section.title}-${i}`} className="w-[260px] md:w-[300px] flex-shrink-0">
                      <MovieCardSkeleton variant="landscape" />
                    </div>
                  ))
                ) : (
                  sectionMovies.map(movie => (
                    <div key={movie.id} className="w-[260px] md:w-[300px] flex-shrink-0">
                      <MovieCard
                        movie={movie}
                        onPlay={handlePlay}
                        isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                        onToggleWatchlist={toggleWatchlist}
                        variant="landscape"
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
        )}

        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </AnimatePresence>
    </div>
  );
}

function MoviesPage() {
  const navigate = useNavigate();
  const [movies, setMovies] = React.useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = React.useState<Movie[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { userProfile, toggleWatchlist, subscribe } = useUserProfile();

  const handlePlay = (movie: Movie) => {
    if (movie.isPremium && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    if (movie.seasons) {
      setSelectedSeries(movie);
    } else {
      setSelectedMovie(movie);
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const moviesQuery = query(collection(db, 'movies'));
        const querySnapshot = await getDocs(moviesQuery);
        const allContent = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
        
        const movieContent = allContent.filter(m => m.category === 'movie');
        setMovies(movieContent);
        setFeaturedMovies(movieContent.filter(m => m.isFeatured).slice(0, 5));
      } catch (error) {
        console.error('Error fetching movies:', error);
        setMovies(FEATURED_MOVIES.filter(m => m.category === 'movie'));
        setFeaturedMovies(FEATURED_MOVIES.filter(m => m.category === 'movie' && m.isFeatured).slice(0, 5));
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const sections = [
    { title: 'Suspense films', variant: 'portrait' as const, filter: (m: Movie) => m.genre.includes('Thriller') || m.genre.includes('Mystery') },
    { title: 'Popular Indian movies- Free with ads', variant: 'portrait' as const, filter: (m: Movie) => m.genre.includes('Drama') || m.genre.includes('Action') },
    { title: 'Blockbuster movies- Free with ads', variant: 'portrait' as const, filter: (m: Movie) => m.rating >= 8 },
    { title: 'Popular action movies- Free with ads', variant: 'landscape' as const, filter: (m: Movie) => m.genre.includes('Action') }
  ];

  return (
    <div className="bg-black min-h-screen pt-24 text-white pb-24">
      {/* Header */}
      <div className="px-4 md:px-12 mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Movies</h1>
        </div>
        
        <div className="relative inline-block">
          <select className="bg-[#1a242f] border border-white/10 rounded-md px-4 py-2 text-sm font-bold focus:outline-none appearance-none pr-10 cursor-pointer hover:bg-[#252e3a] transition-colors text-gray-300">
            <option className="bg-[#1a242f]">All categories</option>
            <option className="bg-[#1a242f]">Action</option>
            <option className="bg-[#1a242f]">Comedy</option>
            <option className="bg-[#1a242f]">Drama</option>
            <option className="bg-[#1a242f]">Horror</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
        </div>
      </div>

      {/* Hero Section */}
      <div className="mb-12">
        <Hero 
          movies={featuredMovies.length > 0 ? featuredMovies : FEATURED_MOVIES.filter(m => m.category === 'movie')} 
          onPlay={handlePlay}
          onToggleWatchlist={toggleWatchlist}
          isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
        />
      </div>

      {/* Movie Sections */}
      <div className="px-4 md:px-12 space-y-12">
        {sections.map((section) => {
          const sectionMovies = movies.filter(section.filter);
          if (sectionMovies.length === 0 && !loadingData) return null;

          return (
            <section key={`movies-section-${section.title}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 group cursor-pointer">
                  {section.title}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </h2>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
                {loadingData ? (
                  [...Array(5)].map((_, i) => (
                    <div key={`movies-skeleton-${section.title}-${i}`} className={section.variant === 'landscape' ? "w-[260px] md:w-[300px] flex-shrink-0" : "w-[130px] md:w-[170px] flex-shrink-0"}>
                      <MovieCardSkeleton variant={section.variant} />
                    </div>
                  ))
                ) : (
                  sectionMovies.map(movie => (
                    <div key={movie.id} className={section.variant === 'landscape' ? "w-[260px] md:w-[300px] flex-shrink-0" : "w-[130px] md:w-[170px] flex-shrink-0"}>
                      <MovieCard
                        movie={movie}
                        onPlay={handlePlay}
                        isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
                        onToggleWatchlist={toggleWatchlist}
                        variant={section.variant}
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <YouTube
                videoId={selectedMovie.youtubeId}
                className="w-full h-full"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1 },
                }}
              />
            </div>
          </motion.div>
        )}

        {selectedSeries && (
          <SeriesModal 
            movie={selectedSeries} 
            onClose={() => setSelectedSeries(null)} 
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
          />
        )}

        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </AnimatePresence>
    </div>
  );
}

function SubscriptionsPage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { userProfile, toggleWatchlist, subscribe } = useUserProfile();

  const handlePlay = (movie: any) => {
    if ((movie.isPremium || movie.hasBag) && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    if (movie.seasons) {
      setSelectedSeries(movie);
    } else {
      setSelectedMovie(movie);
    }
  };

  const heroItems = [
    {
      id: 'rookie-8',
      title: 'THE ROOKIE',
      subtitle: 'SEASON 8',
      image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=1200',
      badge: '#1 TV show in subscriptions',
      action: 'Subscribe to Moviesphere+',
      logo: 'MOVIE SPHERE+'
    },
    {
      id: 'the-boys',
      title: 'THE BOYS',
      subtitle: 'SEASON 4',
      image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1200',
      badge: '#2 TV show in subscriptions',
      action: 'Subscribe to Prime',
      logo: 'PRIME VIDEO'
    }
  ];

  const addOnSubscriptions = [
    { id: 'aot', title: 'Attack on Titan', image: 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=300&h=450', subtitle: 'Anime Times' },
    { id: 'mos', title: 'Masters of Sex', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=300&h=450', subtitle: 'Sony Pictures Stream' },
    { id: 'erotic', title: 'Erotic Stories', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300&h=450', subtitle: 'Lionsgate Play', hasBag: true },
  ];

  const mySubscriptions = [
    { id: 'goldmines', title: 'Goldmines Play', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=600&h=350', price: '₹39 ₹29/ month', hasBag: true },
    { id: 'appletv', title: 'Apple TV', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600&h=350', price: '₹99/ month', hasBag: true },
  ];

  const top10 = [
    { id: '1', title: 'The Rookie', image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=600&h=350', info: 'U/A 13+ • 8 seasons • 2026 • Drama • Thriller' },
    { id: '2', title: 'The Boys', image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=600&h=350', info: 'A • 4 seasons • 2024 • Action • Sci-Fi' },
  ];

  return (
    <div className="bg-black min-h-screen pt-16 text-white pb-24">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
      </div>

      {/* Hero Carousel */}
      <div className="relative mb-8">
        <div className="aspect-[16/9] md:aspect-[21/9] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img 
                src={heroItems[currentIndex].image} 
                alt={heroItems[currentIndex].title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
              
              <div className="absolute bottom-12 left-4 md:left-12 space-y-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">THE</span>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter italic">{heroItems[currentIndex].title}</h2>
                  <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-200">{heroItems[currentIndex].subtitle}</span>
                </div>
                
                <div className="flex flex-col gap-2 pt-4">
                  <p className="text-sm font-bold text-white">{heroItems[currentIndex].badge}</p>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <div className="bg-yellow-500 p-1 rounded-sm">
                      <ShoppingBag className="w-3 h-3 text-black fill-black" />
                    </div>
                    <span>{heroItems[currentIndex].action}</span>
                  </div>
                </div>

                <div className="absolute bottom-0 right-4 md:right-12">
                  <span className="text-[10px] font-bold tracking-tighter text-gray-400">{heroItems[currentIndex].logo}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {heroItems.map((_, i) => (
            <button
              key={`hero-indicator-sub-${i}`}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'bg-white w-4' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 md:px-12 space-y-10">
        {/* Watchlist Section (Moved here) */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase tracking-tighter">My Watchlist</h2>
          </div>
          
          {userProfile?.watchlist && userProfile.watchlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProfile.watchlist.map(movie => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onPlay={handlePlay}
                  isInWatchlist={true}
                  onToggleWatchlist={toggleWatchlist}
                />
              ))}
            </div>
          ) : (
            <div className="aspect-video bg-white/5 rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-gray-500">
              No items in your watchlist yet
            </div>
          )}
        </section>

        {/* Top 10 Section */}
        <section>
          <h2 className="text-lg font-bold mb-4">Top 10 with subscriptions</h2>
          <div className="flex gap-8 overflow-x-auto hide-scrollbar -mx-4 px-4 py-4">
            {top10.map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => handlePlay({ ...item, isPremium: true })}
                className="relative w-[280px] md:w-[340px] flex-shrink-0 group cursor-pointer pl-16"
              >
                <div className="absolute left-0 bottom-0 text-[120px] font-black italic leading-none text-white/10 group-hover:text-white/20 transition-colors select-none">
                  {idx + 1}
                </div>
                <div className="relative aspect-video rounded-md overflow-hidden mb-2">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                </div>
                <h3 className="text-sm font-bold truncate">{item.title}</h3>
                <p className="text-[10px] text-gray-400 font-medium">{item.info}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {selectedMovie.instagramId ? (
                <iframe
                  src={`https://www.instagram.com/reel/${selectedMovie.instagramId}/embed`}
                  className="w-full h-full border-none"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <YouTube
                  videoId={selectedMovie.youtubeId}
                  className="w-full h-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
                  }}
                />
              )}
            </div>
          </motion.div>
        )}

        {selectedSeries && (
          <SeriesModal 
            movie={selectedSeries} 
            onClose={() => setSelectedSeries(null)} 
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
          />
        )}

        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </AnimatePresence>
    </div>
  );
}

function PrimePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [activeFilter, setActiveFilter] = React.useState('All');
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { userProfile, toggleWatchlist, subscribe } = useUserProfile();

  const handlePlay = (movie: any) => {
    if ((movie.isPremium || movie.hasBag) && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    if (movie.seasons) {
      setSelectedSeries(movie);
    } else {
      setSelectedMovie(movie);
    }
  };

  const heroItems = [
    {
      id: 'subedaar',
      title: 'SUBEDAAR',
      subtitle: 'Hindi | Tamil | Telugu',
      image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=1200',
      badge: 'NEW MOVIE',
      rank: '#7 in India',
      action: 'Watch with Prime'
    },
    {
      id: 'now-you-see-me',
      title: 'NOW YOU SEE ME',
      subtitle: 'English | Hindi',
      image: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1200',
      badge: 'U/A 16+',
      rank: '#1 in India',
      action: 'Watch with Prime'
    }
  ];

  const sections = [
    {
      title: 'Series spotlight',
      type: 'portrait',
      items: [
        { id: 'farzi', title: 'FARZI', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
        { id: 'mirzapur', title: 'MIRZAPUR', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300&h=450', hasBag: false },
        { id: 'panchayat', title: 'PANCHAYAT', image: 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
      ]
    },
    {
      title: 'Hard-hitting dramas',
      type: 'portrait',
      items: [
        { id: 'aspirants', title: 'ASPIRANTS', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
        { id: 'horrid-henry', title: 'Horrid Henry', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
        { id: 'coolie', title: 'COOLIE', image: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
      ]
    },
    {
      title: 'Top TV',
      type: 'portrait',
      items: [
        { id: 'chhota-bheem', title: 'CHHOTA BHEEM', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
        { id: 'the-originals', title: 'THE ORIGINALS', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
        { id: 'adhura', title: 'ADHURA', image: 'https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&q=80&w=300&h=450', hasBag: true },
      ]
    }
  ];

  return (
    <div className="bg-black min-h-screen pt-16 text-white pb-24">
      {/* Header */}
      <div className="px-4 py-4 space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Prime</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveFilter('Movies')}
            className={`px-6 py-2 rounded-md text-sm font-bold border border-white/20 transition-colors ${activeFilter === 'Movies' ? 'bg-white/20 text-white' : 'bg-transparent text-gray-400 hover:bg-white/10'}`}
          >
            Movies
          </button>
          <button 
            onClick={() => setActiveFilter('TV shows')}
            className={`px-6 py-2 rounded-md text-sm font-bold border border-white/20 transition-colors ${activeFilter === 'TV shows' ? 'bg-white/20 text-white' : 'bg-transparent text-gray-400 hover:bg-white/10'}`}
          >
            TV shows
          </button>
        </div>
      </div>

      {/* Hero Carousel */}
      <div className="relative mb-8">
        <div className="aspect-[16/9] md:aspect-[21/9] relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img 
                src={heroItems[currentIndex].image} 
                alt={heroItems[currentIndex].title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
              
              <div className="absolute bottom-12 left-4 md:left-12 space-y-2">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter italic text-yellow-500">{heroItems[currentIndex].title}</h2>
                <p className="text-sm font-bold text-gray-300">{heroItems[currentIndex].subtitle}</p>
                
                <div className="flex items-center gap-3 pt-2">
                  <span className="bg-white text-black text-[10px] font-black px-1.5 py-0.5 rounded-sm">{heroItems[currentIndex].badge}</span>
                  <span className="text-xs font-bold text-white">{heroItems[currentIndex].rank}</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <PremiumBadge />
                  <span className="text-sm font-bold text-white">{heroItems[currentIndex].action}</span>
                </div>

                <div className="absolute bottom-0 right-4 md:right-12">
                  <span className="text-blue-400 font-bold italic text-lg">prime</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {heroItems.map((_, i) => (
            <button
              key={`hero-indicator-home-${i}`}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'bg-white w-4' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 md:px-12 space-y-10">
        {sections.map((section, idx) => (
          <section key={idx}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 group cursor-pointer">
                {section.title}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4">
              {section.items.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handlePlay(item)}
                  className="w-[140px] md:w-[180px] flex-shrink-0 group cursor-pointer"
                >
                  <div className="aspect-[2/3] relative rounded-md overflow-hidden mb-2">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-sm font-black italic tracking-tighter truncate">{item.title}</h3>
                    </div>
                    {item.hasBag && (
                      <div className="absolute bottom-2 left-2">
                        <PremiumBadge />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Top 10 Section */}
        <section>
          <h2 className="text-lg font-bold mb-4">Top 10 in India</h2>
          <div className="flex gap-8 overflow-x-auto hide-scrollbar -mx-4 px-4 py-4">
            {[1, 2].map((i) => (
              <div 
                key={`top10-india-${i}`} 
                onClick={() => handlePlay({ title: `Top ${i} Content`, isPremium: true })}
                className="relative w-[280px] md:w-[340px] flex-shrink-0 group cursor-pointer pl-16"
              >
                <span className="absolute left-0 bottom-0 text-[180px] font-black text-white/10 select-none leading-none -translate-x-4 -translate-y-4">
                  {i}
                </span>
                <div className="aspect-[16/9] relative rounded-lg overflow-hidden mb-3 shadow-2xl border border-white/5">
                  <img src={`https://images.unsplash.com/photo-${1500000000000 + i * 100}?auto=format&fit=crop&q=80&w=600&h=350`} alt="Content" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute bottom-2 right-2">
                    <span className="text-blue-400 font-bold italic text-xs">prime</span>
                  </div>
                </div>
                <div className="space-y-1 relative z-10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white">
                    <PremiumBadge className="scale-75 origin-left" />
                    <span>Watch with Prime</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Originals Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2 group cursor-pointer">
              Featured Originals: Series
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
            {[4, 5].map((i) => (
              <div 
                key={`featured-originals-${i}`} 
                onClick={() => handlePlay({ title: 'Young Sherlock', isPremium: true })}
                className="w-[280px] md:w-[340px] flex-shrink-0 group cursor-pointer"
              >
                <div className="aspect-[16/9] relative rounded-lg overflow-hidden mb-3 shadow-2xl">
                  <img src={`https://images.unsplash.com/photo-${1600000000000 + i * 100}?auto=format&fit=crop&q=80&w=600&h=350`} alt="Content" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-2xl font-black italic tracking-tighter text-yellow-500">YOUNG SHERLOCK</h3>
                    <p className="text-xs font-bold text-white">#{i} in India</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-white">
                  <PremiumBadge className="scale-75 origin-left" />
                  <span>Watch with Prime</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {selectedMovie.instagramId ? (
                <iframe
                  src={`https://www.instagram.com/reel/${selectedMovie.instagramId}/embed`}
                  className="w-full h-full border-none"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <YouTube
                  videoId={selectedMovie.youtubeId}
                  className="w-full h-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
                  }}
                />
              )}
            </div>
          </motion.div>
        )}

        {selectedSeries && (
          <SeriesModal 
            movie={selectedSeries} 
            onClose={() => setSelectedSeries(null)} 
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
          />
        )}

        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </AnimatePresence>
    </div>
  );
}

function DownloadsPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-black min-h-screen pt-16 text-white flex flex-col">
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center space-y-6">
        <h2 className="text-2xl font-bold">No videos downloaded</h2>
        
        <button 
          onClick={() => navigate('/')}
          className="bg-[#252e3a] hover:bg-[#2d3745] text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors"
        >
          Find videos to download
        </button>

        <div className="flex items-center gap-2 text-sm font-medium text-gray-300 pt-8">
          <span>Auto Downloads: On</span>
          <span className="text-gray-600">•</span>
          <button className="hover:underline">Manage downloads</button>
        </div>
      </div>
    </div>
  );
}

function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [localQuery, setLocalQuery] = React.useState(query);
  const [results, setResults] = React.useState<Movie[]>([]);
  const [loadingResults, setLoadingResults] = React.useState(true);
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { userProfile, toggleWatchlist, subscribe } = useUserProfile();

  const handlePlay = (movie: Movie) => {
    if (movie.isPremium && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    if (movie.seasons) {
      setSelectedSeries(movie);
    } else {
      setSelectedMovie(movie);
    }
  };

  // Sync localQuery with query from URL
  React.useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Filter and Sort States
  const [genreFilter, setGenreFilter] = React.useState('All');
  const [ratingFilter, setRatingFilter] = React.useState(0);
  const [yearFilter, setYearFilter] = React.useState('All');
  const [sortBy, setSortBy] = React.useState('relevance');
  const [showFilters, setShowFilters] = React.useState(false);

  const getPageTitle = () => {
    if (location.pathname === '/movies') return 'Movies';
    if (location.pathname === '/serial') return 'Serial';
    if (location.pathname === '/series') return 'TV Series';
    if (location.pathname === '/sports') return 'Sports';
    if (location.pathname === '/store') return 'Store';
    if (location.pathname === '/luxury-plus') return 'Luxury+';
    if (location.pathname === '/watchlist') return 'Watching List';
    if (location.pathname === '/categories') return 'Categories';
    if (location.pathname === '/downloads') return 'Downloads';
    return query ? `Search results for: "${query}"` : 'Explore';
  };

  React.useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  React.useEffect(() => {
    const performSearch = async () => {
      if (location.pathname === '/watchlist') {
        setResults(userProfile?.watchlist || []);
        setLoadingResults(false);
        return;
      }
      
      const searchQuery = query || getPageTitle();
      if (searchQuery === 'Explore') {
        setResults([]);
        setLoadingResults(false);
        return;
      }

      setLoadingResults(true);
      try {
        const data = await searchMovies(searchQuery);
        setResults(data);
      } catch (error) {
        const errorStr = JSON.stringify(error).toLowerCase();
        if (!errorStr.includes("429") && !errorStr.includes("quota") && !errorStr.includes("resource_exhausted")) {
          console.error('Search error:', error);
        }
      } finally {
        setLoadingResults(false);
      }
    };
    performSearch();
  }, [query, location.pathname, userProfile?.watchlist]);

  const handleLocalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(localQuery)}`);
    }
  };

  const filteredResults = React.useMemo(() => {
    let res = [...results];
    
    if (genreFilter !== 'All') {
      res = res.filter(m => m.genre.some(g => g.toLowerCase().includes(genreFilter.toLowerCase())));
    }
    
    if (ratingFilter > 0) {
      res = res.filter(m => m.rating >= ratingFilter);
    }
    
    if (yearFilter !== 'All') {
      res = res.filter(m => m.releaseDate.startsWith(yearFilter));
    }
    
    if (sortBy === 'rating') {
      res.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'date') {
      res.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    }
    
    return res;
  }, [results, genreFilter, ratingFilter, yearFilter, sortBy]);

  const genres = ['All', 'Action', 'Drama', 'Sci-Fi', 'Thriller', 'Comedy', 'Adventure', 'Fantasy', 'Horror', 'Mystery'];
  const years = ['All', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];

  return (
    <div className="bg-black min-h-screen pt-24 px-4 md:px-12 text-white">
      {location.pathname === '/search' && !query ? (
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Search</h1>
          </div>

          <form onSubmit={handleLocalSearch} className="relative mb-12">
            <div className="bg-[#252e3a] rounded-lg flex items-center px-4 py-4 shadow-2xl border border-white/5">
              <Search className="w-6 h-6 text-gray-400 mr-4" />
              <input
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder="Search by actor, title.."
                className="bg-transparent border-none focus:outline-none text-lg w-full placeholder:text-gray-500 font-medium"
              />
              <Mic className="w-6 h-6 text-gray-400 ml-4 cursor-pointer hover:text-white transition-colors" />
            </div>
          </form>

          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6">Genres</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                'Action and adventure', 'Anime', 'Comedy', 'Documentary', 'Drama', 'Fantasy'
              ].map((genre) => (
                <button
                  key={genre}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(genre)}`)}
                  className="bg-[#1a242f] hover:bg-[#252e3a] py-8 rounded-lg font-bold text-center transition-all active:scale-95 border border-white/5"
                >
                  {genre}
                </button>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <button className="bg-[#252e3a] hover:bg-[#2d3745] px-10 py-2.5 rounded-full font-bold text-sm transition-colors border border-white/5">
                See more
              </button>
            </div>
          </section>

          <section className="pb-20">
            <h2 className="text-xl font-bold mb-4">Featured collections</h2>
            <div className="divide-y divide-white/10 border-t border-white/10">
              {['Hindi', 'English', 'Telugu', 'Tamil'].map((collection) => (
                <button
                  key={collection}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(collection)}`)}
                  className="w-full flex items-center justify-between py-5 group"
                >
                  <span className="text-lg font-bold group-hover:text-blue-400 transition-colors">{collection}</span>
                  <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-3 bg-white/10 rounded-2xl text-blue-400 hover:bg-white/20 transition-all shadow-xl border border-white/5 active:scale-95"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">
                  {location.pathname === '/search' && query ? (
                    <>Search results for: <span className="text-blue-400">"{query}"</span></>
                  ) : (
                    <span className="text-blue-400">{getPageTitle()}</span>
                  )}
                </h1>
              </div>

              <form onSubmit={handleLocalSearch} className="flex items-center relative w-full md:max-w-md">
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder="Search movies, series, sports..."
                  className="bg-white/10 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full transition-all shadow-2xl"
                />
                <Search className="absolute left-4 w-5 h-5 text-gray-500" />
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all border ${
              showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="relevance" className="bg-black">Sort by: Relevance</option>
              <option value="rating" className="bg-black">Sort by: Rating</option>
              <option value="date" className="bg-black">Sort by: Newest</option>
            </select>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Tag className="w-3 h-3" />
                    Genre
                  </label>
                  <select
                    value={genreFilter}
                    onChange={(e) => setGenreFilter(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    {genres.map(g => <option key={g} value={g} className="bg-black">{g}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Star className="w-3 h-3" />
                    Min Rating
                  </label>
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value={0} className="bg-black">Any Rating</option>
                    <option value={8} className="bg-black">8.0+</option>
                    <option value={7} className="bg-black">7.0+</option>
                    <option value={6} className="bg-black">6.0+</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Release Year
                  </label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    {years.map(y => <option key={y} value={y} className="bg-black">{y}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {loadingResults ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <MovieCardSkeleton key={`search-skeleton-${i}`} variant="landscape" />
          ))}
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredResults.map(movie => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              onPlay={handlePlay}
              isInWatchlist={userProfile?.watchlist?.some(m => m.id === movie.id)}
              onToggleWatchlist={toggleWatchlist}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          {location.pathname === '/watchlist' 
            ? "Your watchlist is empty. Start adding movies and series you want to watch later!"
            : query ? `No results found for "${query}". Try adjusting your filters.` : "Start searching for your favorite content!"}
        </div>
      )}

      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {selectedMovie.instagramId ? (
                <iframe
                  src={`https://www.instagram.com/reel/${selectedMovie.instagramId}/embed`}
                  className="w-full h-full border-none"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <YouTube
                  videoId={selectedMovie.youtubeId}
                  className="w-full h-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
                  }}
                />
              )}
            </div>
          </motion.div>
        )}

        {selectedSeries && (
          <SeriesModal 
            movie={selectedSeries} 
            onClose={() => setSelectedSeries(null)} 
            onToggleWatchlist={toggleWatchlist}
            isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
          />
        )}

        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </AnimatePresence>
        </>
      )}
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const [selectedMovie, setSelectedMovie] = React.useState<Movie | null>(null);
  const [selectedSeries, setSelectedSeries] = React.useState<Movie | null>(null);
  const [showMembership, setShowMembership] = React.useState(false);
  const { user, userProfile, toggleWatchlist, subscribe, loading } = useUserProfile();

  const handlePlay = (movie: Movie) => {
    if (movie.isPremium && !userProfile?.isPremium) {
      setShowMembership(true);
      return;
    }
    if (movie.seasons) {
      setSelectedSeries(movie);
    } else {
      setSelectedMovie(movie);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-black min-h-screen pt-24 px-4 md:px-12 text-white flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">Sign in to view your profile</h1>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen pt-24 px-4 md:px-12 text-white">
      <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 rounded-2xl text-blue-400 hover:bg-white/20 transition-all shadow-xl border border-white/5 active:scale-95"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Your Profile</h1>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 mb-12 p-8 bg-white/5 rounded-3xl border border-white/10">
          <img
            src={user.photoURL || ''}
            alt={user.displayName || ''}
            className="w-32 h-32 rounded-full border-4 border-blue-600"
            referrerPolicy="no-referrer"
          />
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-4xl font-black uppercase tracking-tighter">{user.displayName}</h1>
              {userProfile?.isPremium && <PremiumBadge size="md" />}
            </div>
            <p className="text-gray-400 mb-6">{user.email}</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full transition-colors text-sm font-bold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button
                onClick={async () => {
                  const shareData = {
                    title: 'OPRK+',
                    text: 'Check out this amazing OTT platform!',
                    url: window.location.origin,
                  };
                  try {
                    if (navigator.share) await navigator.share(shareData);
                    else {
                      await navigator.clipboard.writeText(window.location.origin);
                      alert('App link copied to clipboard!');
                    }
                  } catch (err) { console.error('Error sharing:', err); }
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-full transition-colors text-sm font-bold"
              >
                <Share2 className="w-4 h-4" />
                Share App
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {/* Subscriptions Section (Moved here) */}
          <section>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">My Subscriptions</h2>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
              {mySubscriptions.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handlePlay(item as any)}
                  className="w-[280px] md:w-[340px] flex-shrink-0 group cursor-pointer"
                >
                  <div className="relative aspect-video rounded-md overflow-hidden mb-2">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                    {item.hasBag && (
                      <div className="absolute bottom-2 left-2 bg-yellow-500 p-1 rounded-sm">
                        <ShoppingBag className="w-3 h-3 text-black fill-black" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold truncate">{item.title}</h3>
                  <p className="text-[10px] text-gray-400 font-medium">{item.price}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-6">Add-On Subscriptions</h2>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4">
              {addOnSubscriptions.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handlePlay(item as any)}
                  className="w-[140px] md:w-[180px] flex-shrink-0 group cursor-pointer"
                >
                  <div className="aspect-[2/3] relative rounded-md overflow-hidden mb-2">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                    {item.hasBag && (
                      <div className="absolute bottom-2 left-2 bg-yellow-500 p-1 rounded-sm">
                        <ShoppingBag className="w-3 h-3 text-black fill-black" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-xs font-bold truncate">{item.title}</h3>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <AnimatePresence>
          {selectedMovie && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
            >
              <div className="relative w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <button
                  onClick={() => setSelectedMovie(null)}
                  className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black p-2 rounded-full text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                {selectedMovie.instagramId ? (
                  <iframe
                    src={`https://www.instagram.com/reel/${selectedMovie.instagramId}/embed`}
                    className="w-full h-full border-none"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <YouTube
                    videoId={selectedMovie.youtubeId}
                    className="w-full h-full"
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: { autoplay: 1, rel: 0, modestbranding: 1 }
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}

          {selectedSeries && (
            <SeriesModal 
              movie={selectedSeries} 
              onClose={() => setSelectedSeries(null)} 
              onToggleWatchlist={toggleWatchlist}
              isInWatchlist={(movie) => userProfile?.watchlist?.some(m => m.id === movie.id) || false}
            />
          )}

          <MembershipModal 
            isOpen={showMembership}
            onClose={() => setShowMembership(false)}
            userProfile={userProfile}
            onSubscribe={subscribe}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);
  const [showMembership, setShowMembership] = React.useState(false);
  const [user] = useAuthState(auth);
  const { userProfile, subscribe } = useUserProfile();
  const isAdmin = user?.email === 'shreeramlilaclub@gmail.com';

  return (
    <Router>
      <div className="bg-black min-h-screen font-sans selection:bg-blue-600 selection:text-white pb-20 md:pb-0">
        <Navbar 
          onToggleChatbot={() => setIsChatbotOpen(true)} 
          onOpenMembership={() => setShowMembership(true)}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/serial" element={<SeriesPage />} />
          <Route path="/series" element={<SeriesPage />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/live" element={<SearchPage />} />
          <Route path="/store" element={<SearchPage />} />
          <Route path="/luxury-plus" element={<SearchPage />} />
          <Route path="/watchlist" element={<SearchPage />} />
          <Route path="/prime" element={<PrimePage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/categories" element={<SearchPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
        </Routes>
        <BottomNav />
        <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
        
        <MembershipModal 
          isOpen={showMembership}
          onClose={() => setShowMembership(false)}
          userProfile={userProfile}
          onSubscribe={subscribe}
        />
      </div>
    </Router>
  );
}
