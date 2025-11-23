import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, RefreshCw, MessageSquare, LogIn, LogOut, MessageSquarePlus, ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import NewsCard from './components/NewsCard';
import ChatSidebar from './components/ChatSidebar';
import AudioPlayer from './components/AudioPlayer';
import AuthModal from './components/AuthModal';
import FeedbackModal from './components/FeedbackModal';
import OnboardingModal from './components/OnboardingModal';
import ShareModal from './components/ShareModal';
import { fetchDailyBriefing, generateNewsAudio } from './services/geminiService';
import { userService } from './services/userService';
import { NewsArticle, UserInterests, Category, TTSMode, User, AgeRange } from './types';

const INITIAL_INTERESTS: UserInterests = {
  [Category.GLOBAL]: 1.0,
  [Category.POLITICS]: 1.0,
  [Category.TECH]: 1.0,
  [Category.SCIENCE]: 1.0,
  [Category.CULTURE]: 1.0,
  [Category.BUSINESS]: 1.0
};

export default function App() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [interests, setInterests] = useState<UserInterests>(INITIAL_INTERESTS);
  
  // Date State for History
  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1); // Default to yesterday
    return d;
  });

  // User & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackArticleId, setFeedbackArticleId] = useState<string | undefined>(undefined);

  // Sharing State
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingArticle, setSharingArticle] = useState<NewsArticle | null>(null);

  // Interaction State
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Audio State
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [playingArticle, setPlayingArticle] = useState<NewsArticle | null>(null);

  // Infinite Scroll Refs
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Initialize User
  useEffect(() => {
    const user = userService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setInterests(user.interests);
      if (user.onboardingComplete === false) {
          setShowOnboarding(true);
      }
    }
  }, []);

  // Initialize Data when User or Date changes
  useEffect(() => {
    // Only load if not in onboarding flow
    if (!showOnboarding) {
        loadBriefing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, viewDate, showOnboarding]);

  // Infinite Scroll Observer Setup
  useEffect(() => {
    if (loading || articles.length === 0) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !loadingMore && !loading) {
            loadMoreArticles();
        }
    }, { rootMargin: '200px' });

    if (bottomSentinelRef.current) {
        observerRef.current.observe(bottomSentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, articles.length]);

  // Update local interests state when user changes (auth)
  useEffect(() => {
    if (currentUser) {
      setInterests(currentUser.interests);
    } else {
      setInterests(INITIAL_INTERESTS);
    }
  }, [currentUser]);

  const initAudio = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
  };

  const getFormattedDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const sortArticles = (articlesToSort: NewsArticle[]) => {
      return [...articlesToSort].sort((a, b) => {
        // Weights: Global Score (Importance) 55%, Personal Interest 45%
        const interestA = interests[a.category] || 1.0;
        const interestB = interests[b.category] || 1.0;
        
        // Normalized scores
        const scoreA = (a.globalScore * 0.55) + (interestA * 45); 
        const scoreB = (b.globalScore * 0.55) + (interestB * 45);

        return scoreB - scoreA;
      });
  };

  const loadBriefing = async (forceRefresh = false) => {
    setLoading(true);
    setArticles([]);

    const dateKey = getFormattedDateKey(viewDate);
    const userId = currentUser ? currentUser.id : 'guest';
    const userAge = currentUser ? currentUser.ageRange : AgeRange.ADULT;

    // 1. Try to load from cache first
    if (!forceRefresh) {
        const cached = userService.getDailyBriefing(userId, dateKey);
        if (cached) {
            console.log("Loaded cached briefing for", dateKey);
            setArticles(cached); // Cached is likely already sorted
            setLoading(false);
            return;
        }
    }

    // 2. Fetch new
    const fetched = await fetchDailyBriefing(viewDate, userAge);
    
    if (fetched.length > 0) {
        const sorted = sortArticles(fetched);
        userService.saveDailyBriefing(userId, dateKey, sorted);
        setArticles(sorted);
    } else {
        setArticles([]);
    }
    
    setLoading(false);
  };

  const loadMoreArticles = async () => {
      if (loadingMore) return;
      setLoadingMore(true);
      console.log("Fetching more articles...");

      const userAge = currentUser ? currentUser.ageRange : AgeRange.ADULT;
      const currentTitles = articles.map(a => a.title);

      const newArticles = await fetchDailyBriefing(viewDate, userAge, currentTitles);
      
      if (newArticles.length > 0) {
          const sortedNew = sortArticles(newArticles);
          setArticles(prev => {
              const updated = [...prev, ...sortedNew];
              // Optional: Update cache with extended list
              const dateKey = getFormattedDateKey(viewDate);
              const userId = currentUser ? currentUser.id : 'guest';
              userService.saveDailyBriefing(userId, dateKey, updated);
              return updated;
          });
      }

      setLoadingMore(false);
  };

  const handleOnboardingComplete = (selected: string[]) => {
      if (currentUser) {
          const updated = userService.completeOnboarding(currentUser.id, selected);
          if (updated) setCurrentUser(updated);
      }
      setShowOnboarding(false);
  };

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user);
      if (user.onboardingComplete === false) {
          setShowOnboarding(true);
      }
  };

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() - 1);
    setViewDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + 1);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (newDate.setHours(0,0,0,0) <= yesterday.setHours(0,0,0,0)) {
        setViewDate(newDate);
    }
  };
  
  const isNextDisabled = () => {
    const nextDate = new Date(viewDate);
    nextDate.setDate(viewDate.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return nextDate.setHours(0,0,0,0) > yesterday.setHours(0,0,0,0);
  };

  const handleExpand = useCallback((id: string) => {
    initAudio(); 
    setActiveArticleId(prev => prev === id ? null : id);
    
    if (activeArticleId !== id) {
      const article = articles.find(a => a.id === id);
      if (article) {
         if (currentUser) {
            const updatedUser = userService.updateInterests(currentUser.id, article.category, 0.05);
            userService.addToHistory(currentUser.id, id);
            if (updatedUser) {
                setCurrentUser(prev => updatedUser || prev);
            }
         } else {
            setInterests(prev => ({
                ...prev,
                [article.category]: prev[article.category] + 0.05
            }));
         }
      }
    }
  }, [articles, audioContext, activeArticleId, currentUser]);

  const handleRate = useCallback((articleId: string, rating: 'up' | 'down') => {
      if (!currentUser) {
          setShowAuthModal(true);
          return;
      }

      const article = articles.find(a => a.id === articleId);
      if (article) {
          const delta = rating === 'up' ? 0.2 : -0.2;
          const updatedUser = userService.updateInterests(currentUser.id, article.category, delta);
          
          userService.submitFeedback({
            userId: currentUser.id,
            articleId: article.id,
            type: 'rating',
            value: rating
          });

          if (updatedUser) {
              setCurrentUser(updatedUser);
          }
      }
  }, [articles, currentUser]);

  const handleFlag = useCallback((articleId: string) => {
      if (!currentUser) {
          setShowAuthModal(true);
          return;
      }
      setFeedbackArticleId(articleId);
      setShowFeedbackModal(true);
  }, [currentUser]);

  const handleShare = useCallback((article: NewsArticle) => {
      setSharingArticle(article);
      setShowShareModal(true);
  }, []);

  const handlePlayAudio = async (article: NewsArticle, mode: TTSMode) => {
    initAudio();
    if (playingArticle?.id === article.id && audioBuffer) {
        setIsAudioPlaying(!isAudioPlaying);
        return;
    }
    setPlayingArticle(article);
    setIsAudioLoading(true);
    setIsAudioPlaying(false);
    setAudioBuffer(null);

    if (audioContext) {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        const buffer = await generateNewsAudio(article, mode, audioContext);
        if (buffer) {
            setAudioBuffer(buffer);
            setIsAudioPlaying(true);
        }
    }
    setIsAudioLoading(false);
  };

  const handleLogout = () => {
    userService.logout();
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="serif text-xl md:text-2xl font-bold text-white tracking-tight hidden sm:block">Yesterday in Review</h1>
            <h1 className="serif text-lg font-bold text-white tracking-tight sm:hidden">YiR</h1>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center bg-slate-800 rounded-full px-2 py-1 border border-slate-700 mx-2">
            <button 
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
            >
                <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 min-w-[120px] sm:min-w-[160px] justify-center">
                <Calendar size={14} className="text-indigo-400" />
                <span className="text-sm font-medium text-slate-200 whitespace-nowrap">
                    {viewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            </div>
            <button 
                onClick={handleNextDay}
                disabled={isNextDisabled()}
                className="p-1.5 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
                <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
                onClick={() => {
                    if (!currentUser) setShowAuthModal(true);
                    else {
                        setFeedbackArticleId(undefined);
                        setShowFeedbackModal(true);
                    }
                }}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors hidden md:block"
                title="Send Feedback"
            >
                <MessageSquarePlus size={20} />
            </button>

            <button 
                onClick={() => loadBriefing(true)} 
                disabled={loading}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                title="Refresh Briefing"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>

            <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

            {currentUser ? (
               <div className="flex items-center gap-2">
                   <div className="hidden md:flex flex-col items-end mr-1">
                       <span className="text-xs font-bold text-white">{currentUser.username}</span>
                       <span className="text-[10px] text-indigo-400">
                           {currentUser.ageRange === AgeRange.CHILD ? 'Junior Acct' : 'Pro Member'}
                       </span>
                   </div>
                   <button 
                     onClick={handleLogout}
                     className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                     title="Log Out"
                   >
                     <LogOut size={20} />
                   </button>
               </div>
            ) : (
                <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-200 transition-colors"
                >
                    <LogIn size={16} />
                    <span className="hidden sm:inline">Sign In</span>
                </button>
            )}

            <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`ml-2 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${isChatOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Bot size={18} />
              <span className="hidden lg:inline">Assistant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {loading ? (
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse border border-slate-700" />
                ))}
                <div className="text-center text-slate-500 mt-8">
                    <p>Fetching history from Gemini...</p>
                </div>
            </div>
        ) : (
          <div className="space-y-6">
             {articles.length === 0 ? (
                 <div className="text-center py-20 text-slate-500 border border-slate-800 rounded-2xl bg-slate-800/20">
                     <p className="mb-4 text-lg font-medium">No briefing available for this date.</p>
                     <button onClick={() => loadBriefing(true)} className="text-indigo-400 hover:text-indigo-300 underline">Try Generating</button>
                 </div>
             ) : (
                <>
                    {articles.map((article) => (
                        <NewsCard
                            key={article.id}
                            article={article}
                            isExpanded={activeArticleId === article.id}
                            onExpand={handleExpand}
                            onPlay={handlePlayAudio}
                            isPlaying={playingArticle?.id === article.id && isAudioPlaying}
                            onRate={handleRate}
                            onFlag={handleFlag}
                            onShare={handleShare}
                        />
                    ))}
                    
                    {/* Infinite Scroll Loader */}
                    <div ref={bottomSentinelRef} className="h-20 flex items-center justify-center">
                        {loadingMore && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <Loader2 className="animate-spin" size={20} />
                                <span className="text-sm">Digging up more stories...</span>
                            </div>
                        )}
                    </div>
                </>
             )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLoginSuccess}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        articleId={feedbackArticleId}
        userId={currentUser?.id || 'anonymous'}
      />
      
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        article={sharingArticle}
      />

      {/* Chat Sidebar */}
      <ChatSidebar 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        activeContext={activeArticleId ? articles.find(a => a.id === activeArticleId)?.title || "" : ""}
      />

      {/* Floating Chat Button (Mobile) */}
      {!isChatOpen && (
        <button 
            onClick={() => setIsChatOpen(true)}
            className="md:hidden fixed bottom-6 right-6 p-4 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-600/30 z-30"
        >
            <MessageSquare size={24} />
        </button>
      )}

      {/* Sticky Audio Player */}
      <AudioPlayer 
        title={playingArticle?.title || "Audio Player"}
        isPlaying={isAudioPlaying}
        isLoading={isAudioLoading}
        onTogglePlay={() => setIsAudioPlaying(!isAudioPlaying)}
        onClose={() => {
            setIsAudioPlaying(false);
            setAudioBuffer(null);
            setPlayingArticle(null);
        }}
        buffer={audioBuffer}
        context={audioContext}
      />

    </div>
  );
}