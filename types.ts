
export enum Category {
  GLOBAL = 'Global',
  POLITICS = 'Politics',
  TECH = 'Technology',
  SCIENCE = 'Science',
  CULTURE = 'Culture',
  BUSINESS = 'Business'
}

export enum AgeRange {
  CHILD = 'Child (Under 13)',
  TEEN = 'Teen (13-17)',
  ADULT = 'Adult (18+)'
}

export interface NewsSource {
  title: string;
  uri: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: Category;
  sources: NewsSource[];
  globalScore: number; // 0-100 score of global importance
  personalScore?: number; // Calculated based on user prefs
  timestamp: string;
}

export interface UserInterests {
  [key: string]: number; // Category -> Weight (default 1.0)
}

export enum TTSMode {
  READ = 'READ',
  PODCAST = 'PODCAST',
  STORYTELLER = 'STORYTELLER'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentMode: TTSMode | null;
  articleId: string | null;
}

export interface User {
  id: string;
  username: string;
  email?: string; // Encrypted/Stored
  password?: string; // Hashed
  ageRange: AgeRange;
  interests: UserInterests;
  readHistory: string[];
  isGoogleAuth?: boolean;
  onboardingComplete?: boolean;
}

export interface Feedback {
  id: string;
  userId: string;
  articleId?: string;
  type: 'rating' | 'flag' | 'general';
  value: string | number; // 'up', 'down', text content
  timestamp: string;
}
