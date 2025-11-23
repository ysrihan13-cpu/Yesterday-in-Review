import React from 'react';
import { NewsArticle, Category, TTSMode } from '../types';
import { Play, Mic, Sparkles, ThumbsUp, ThumbsDown, Flag, Share2 } from 'lucide-react';

interface NewsCardProps {
  article: NewsArticle;
  onExpand: (id: string) => void;
  isExpanded: boolean;
  onPlay: (article: NewsArticle, mode: TTSMode) => void;
  isPlaying: boolean;
  onRate?: (articleId: string, rating: 'up' | 'down') => void;
  onFlag?: (articleId: string) => void;
  onShare?: (article: NewsArticle) => void;
}

const CategoryColors: Record<Category, string> = {
  [Category.GLOBAL]: 'bg-blue-500',
  [Category.POLITICS]: 'bg-red-500',
  [Category.TECH]: 'bg-cyan-500',
  [Category.SCIENCE]: 'bg-purple-500',
  [Category.CULTURE]: 'bg-pink-500',
  [Category.BUSINESS]: 'bg-emerald-500',
};

const NewsCard: React.FC<NewsCardProps> = ({ 
  article, 
  onExpand, 
  isExpanded, 
  onPlay, 
  isPlaying,
  onRate,
  onFlag,
  onShare
}) => {
  return (
    <div 
      className={`relative group bg-slate-800 border border-slate-700 rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20' : 'hover:border-slate-500'}`}
      onClick={() => onExpand(article.id)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <span className={`${CategoryColors[article.category]} text-xs font-bold px-2 py-1 rounded text-white uppercase tracking-wider`}>
            {article.category}
          </span>
          <span className="text-slate-400 text-xs">{article.timestamp}</span>
        </div>
        
        <h3 className="serif text-xl md:text-2xl font-bold text-slate-100 mb-3 leading-tight">
          {article.title}
        </h3>
        
        <p className="text-slate-300 leading-relaxed">
          {article.summary}
        </p>

        {/* Expanded Content / Actions */}
        <div className={`mt-6 pt-4 border-t border-slate-700 flex flex-col gap-4 transition-all duration-300 ${isExpanded ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          
          {/* Audio & Share Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <button 
                onClick={(e) => { e.stopPropagation(); onPlay(article, TTSMode.READ); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors text-slate-200"
            >
                <Play size={16} className={isPlaying ? "text-green-400" : ""} /> Read Brief
            </button>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onPlay(article, TTSMode.PODCAST); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors text-slate-200"
            >
                <Mic size={16} className="text-purple-400" /> Podcast Take
            </button>

            <button 
                onClick={(e) => { e.stopPropagation(); onPlay(article, TTSMode.STORYTELLER); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors text-slate-200"
            >
                <Sparkles size={16} className="text-amber-400" /> Storyteller
            </button>

            <div className="flex-1"></div>

            <button
                onClick={(e) => { e.stopPropagation(); onShare?.(article); }}
                className="flex items-center gap-2 px-4 py-2 border border-slate-600 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors text-slate-300"
                title="Share this story"
            >
                <Share2 size={16} /> <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          {/* Feedback & Sources Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-700/50 pt-4">
             {/* Feedback Controls */}
             <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider mr-2">Rate:</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRate?.(article.id, 'up'); }}
                  className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-green-400 transition-colors"
                  title="Show more like this"
                >
                  <ThumbsUp size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRate?.(article.id, 'down'); }}
                  className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                  title="Show less like this"
                >
                  <ThumbsDown size={18} />
                </button>
                <div className="w-px h-4 bg-slate-700 mx-2" />
                <button 
                  onClick={(e) => { e.stopPropagation(); onFlag?.(article.id); }}
                  className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-amber-400 transition-colors"
                  title="Report issue"
                >
                  <Flag size={18} />
                </button>
             </div>

             {/* Source Links */}
             {article.sources.length > 0 && (
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider whitespace-nowrap">Sources:</span>
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                        {article.sources.map((s, i) => (
                            <a key={i} href={s.uri} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap">
                                {s.title}
                            </a>
                        ))}
                    </div>
                </div>
             )}
          </div>
        </div>
      </div>
      
      {/* Active Indicator Strip */}
      {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
    </div>
  );
};

export default NewsCard;