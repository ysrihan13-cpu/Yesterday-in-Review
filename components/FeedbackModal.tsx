import React, { useState } from 'react';
import { X, MessageSquareWarning, Send, Loader2 } from 'lucide-react';
import { userService } from '../services/userService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId?: string;
  userId: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, articleId, userId }) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await userService.submitFeedback({
        userId,
        articleId,
        type: articleId ? 'flag' : 'general',
        value: comment
      });
      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setComment('');
      }, 1500);
    } catch (error) {
      console.error("Failed to send feedback", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        {sent ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Feedback Sent!</h3>
            <p className="text-slate-400">Thank you for helping us improve.</p>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquareWarning className="text-amber-400" />
                {articleId ? 'Report Issue' : 'Send Feedback'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
               <p className="text-sm text-slate-400 mb-4">
                 {articleId 
                   ? "Found an inaccuracy? Let our editors know." 
                   : "Have a suggestion or found a bug? We'd love to hear from you."}
               </p>
              
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                placeholder={articleId ? "Describe the issue with this article..." : "Tell us what you think..."}
                required
              />

              <div className="mt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={loading || !comment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Submit'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;