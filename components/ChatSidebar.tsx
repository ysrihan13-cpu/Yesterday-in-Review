import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeContext: string; // The article the user is focusing on
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, activeContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "I'm your news analyst. Ask me anything about the news."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare history for API
    const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const responseText = await sendChatMessage(history, userMsg.text, activeContext);

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText
    };

    setMessages(prev => [...prev, modelMsg]);
    setIsLoading(false);
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
        <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                <Bot size={20} className="text-indigo-400" />
            </div>
            <h2 className="font-semibold text-slate-100">News Assistant</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-slate-800 text-slate-400 rounded-2xl px-4 py-3 text-xs italic border border-slate-700 animate-pulse">
                Analyzing...
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-slate-900">
         {activeContext && (
             <div className="mb-2 text-xs text-indigo-400 truncate px-1">
                 Active Context: {activeContext.substring(0, 40)}...
             </div>
         )}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about the news..."
            className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-4 pr-12 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;