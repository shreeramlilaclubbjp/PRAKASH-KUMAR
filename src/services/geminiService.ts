import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { ChatMessage, Movie } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Simple in-memory cache to reduce API calls
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getFromCache(key: string) {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setToCache(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

const FALLBACK_MOVIES: Movie[] = [
  {
    id: "fb1",
    title: "The Dark Knight - Official Trailer",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1000",
    youtubeId: "EXeTwQWrcwY",
    category: "movie",
    genre: ["Action", "Crime", "Drama"],
    rating: 9.0,
    releaseDate: "2008-07-18"
  },
  {
    id: "fb2",
    title: "Inception - Official Trailer",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    thumbnail: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1000",
    youtubeId: "YoHD9XEInc0",
    category: "movie",
    genre: ["Action", "Sci-Fi", "Thriller"],
    rating: 8.8,
    releaseDate: "2010-07-16"
  },
  {
    id: "fb3",
    title: "Interstellar - Official Trailer",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1000",
    youtubeId: "zSWdZVtXT7E",
    category: "movie",
    genre: ["Adventure", "Drama", "Sci-Fi"],
    rating: 8.7,
    releaseDate: "2014-11-07"
  },
  {
    id: "fb4",
    title: "Stranger Things - Season 1 Trailer",
    description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    thumbnail: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1000",
    youtubeId: "b9EkMc79ZSU",
    category: "series",
    genre: ["Drama", "Fantasy", "Horror"],
    rating: 8.7,
    releaseDate: "2016-07-15"
  },
  {
    id: "fb5",
    title: "The Last of Us - Official Trailer",
    description: "After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity's last hope.",
    thumbnail: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=1000",
    youtubeId: "uLtkt8BonwM",
    category: "series",
    genre: ["Action", "Adventure", "Drama"],
    rating: 8.8,
    releaseDate: "2023-01-15"
  }
];

function isRecoverableError(error: any): boolean {
  const errorStr = JSON.stringify(error).toLowerCase();
  return (
    error?.status === "RESOURCE_EXHAUSTED" ||
    error?.code === 429 ||
    error?.status === "UNKNOWN" ||
    error?.code === 500 ||
    error?.error?.status === "RESOURCE_EXHAUSTED" ||
    error?.error?.code === 429 ||
    error?.error?.status === "UNKNOWN" ||
    error?.error?.code === 500 ||
    errorStr.includes("resource_exhausted") ||
    errorStr.includes("429") ||
    errorStr.includes("quota") ||
    errorStr.includes("rpc failed") ||
    errorStr.includes("500") ||
    errorStr.includes("xhr error")
  );
}

export async function getRecommendations(userInterests: string[]): Promise<Movie[]> {
  const cacheKey = `recs-${userInterests.join(",")}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Based on these interests: ${userInterests.join(", ")}, recommend 5 movies or series available on YouTube. Return the result in JSON format.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              thumbnail: { type: Type.STRING },
              youtubeId: { type: Type.STRING },
              category: { type: Type.STRING, enum: ["movie", "series", "serial", "sports"] },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } },
              rating: { type: Type.NUMBER },
              releaseDate: { type: Type.STRING },
            },
            required: ["id", "title", "description", "thumbnail", "youtubeId", "category", "genre", "rating", "releaseDate"],
          },
        },
      },
    });

    const data = JSON.parse(response.text);
    setToCache(cacheKey, data);
    return data;
  } catch (error: any) {
    if (isRecoverableError(error)) {
      console.warn("Gemini API Error (Recoverable). Using fallback data.");
      return FALLBACK_MOVIES;
    }
    console.error("Gemini API Error (getRecommendations):", error);
    throw error;
  }
}

export async function searchMovies(query: string): Promise<Movie[]> {
  const cacheKey = `search-${query}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Search for movies, series, serials, or local sports related to: "${query}". Provide real YouTube video IDs. Return the result in JSON format.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              thumbnail: { type: Type.STRING },
              youtubeId: { type: Type.STRING },
              category: { type: Type.STRING, enum: ["movie", "series", "serial", "sports"] },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } },
              rating: { type: Type.NUMBER },
              releaseDate: { type: Type.STRING },
            },
            required: ["id", "title", "description", "thumbnail", "youtubeId", "category", "genre", "rating", "releaseDate"],
          },
        },
      },
    });

    const data = JSON.parse(response.text);
    setToCache(cacheKey, data);
    return data;
  } catch (error: any) {
    if (isRecoverableError(error)) {
      console.warn("Gemini API Error (Recoverable). Using fallback data.");
      return FALLBACK_MOVIES.filter(m => 
        m.title.toLowerCase().includes(query.toLowerCase()) || 
        m.genre.some(g => g.toLowerCase().includes(query.toLowerCase()))
      ).concat(FALLBACK_MOVIES).slice(0, 5);
    }
    console.error("Gemini API Error (searchMovies):", error);
    throw error;
  }
}

export async function chatWithGemini(history: ChatMessage[], message: string): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      history: history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      config: {
        systemInstruction: "You are OPRK+ Assistant, a professional OTT platform guide. Help users find movies, series, and sports. Be helpful and professional.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      },
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error: any) {
    if (isRecoverableError(error)) {
      console.warn("Gemini API Error (Recoverable). Using fallback message.");
      return "I'm sorry, I'm currently experiencing some technical difficulties. Please try again in a few minutes. In the meantime, feel free to browse our featured collection!";
    }
    console.error("Gemini API Error (chatWithGemini):", error);
    return "I'm having trouble connecting right now. Please try again later.";
  }
}

