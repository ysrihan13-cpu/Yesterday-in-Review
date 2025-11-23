import React, { useState } from 'react';
import { X, Link, Mail, Twitter, Facebook, Linkedin, Check, Copy } from 'lucide-react';
import { NewsArticle } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: NewsArticle | null;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, article }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !article) return null;

  // Simulate a permalink
  const shareUrl = `${window.location.origin}?article=${article.id}`;
  const shareText = `Check out this news: ${article.title}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialLinks = [
    {
      name: 'X (Twitter)',
      icon: <Twitter size={20} />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      color: 'hover:bg-black hover:text-white'
    },
    {
        name: 'Facebook',
        icon: <Facebook size={20} />,
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        color: 'hover:bg-blue-600 hover:text-white'
    },
    {
        name: 'LinkedIn',
        icon: <Linkedin size={20} />,
        url: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary)}`,
        color: 'hover:bg-blue-700 hover:text-white'
    },
    {
        name: 'Email',
        icon: <Mail size={20} />,
        url: `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`,
        color: 'hover:bg-slate-600 hover:text-white'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                <h3 className="font-bold text-white">Share Article</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <p className="text-white font-serif font-medium leading-relaxed">{article.title}</p>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {socialLinks.map((link) => (
                        <a 
                            key={link.name}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-800 text-slate-400 transition-all border border-slate-700 hover:border-slate-500 ${link.color}`}
                        >
                            {link.icon}
                            <span className="text-[10px] uppercase font-bold tracking-wide">{link.name.split(' ')[0]}</span>
                        </a>
                    ))}
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">Or copy link</label>
                    <div className="relative flex items-center">
                        <div className="absolute left-3 text-slate-500">
                            <Link size={16} />
                        </div>
                        <input 
                            readOnly 
                            value={shareUrl}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-20 text-sm text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button 
                            onClick={handleCopy}
                            className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-md transition-all flex items-center gap-1.5"
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ShareModal;