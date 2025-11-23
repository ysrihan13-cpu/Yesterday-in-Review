import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, X, Radio, Loader2 } from 'lucide-react';

interface AudioPlayerProps {
  title: string;
  isPlaying: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
  buffer: AudioBuffer | null;
  context: AudioContext | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  title, 
  isPlaying, 
  isLoading,
  onTogglePlay, 
  onClose,
  buffer,
  context 
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0); // When the current play session started (context time)
  const pausedAtRef = useRef<number>(0);   // The offset in the audio buffer where we are
  const animationRef = useRef<number>(0);

  // Initialize duration
  useEffect(() => {
    if (buffer) {
      setDuration(buffer.duration);
    } else {
      setDuration(0);
      setCurrentTime(0);
      pausedAtRef.current = 0;
    }
  }, [buffer]);

  // Handle Playback Logic
  useEffect(() => {
    if (!buffer || !context) return;

    if (isPlaying) {
      // Create and start source
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      sourceRef.current = source;

      // Start from the stored offset (pausedAt)
      const offset = pausedAtRef.current;
      source.start(0, offset);
      
      // The context time when we started this segment
      startTimeRef.current = context.currentTime - offset;

      source.onended = () => {
         // Only stop if we reached the end naturally (not manually stopped/seeked)
         if (context.currentTime - startTimeRef.current >= buffer.duration - 0.1) {
             onTogglePlay(); 
             pausedAtRef.current = 0;
             setCurrentTime(0);
         }
      };

      // Animation loop
      const updateProgress = () => {
        if (!isDragging) {
          const elapsed = context.currentTime - startTimeRef.current;
          setCurrentTime(Math.min(elapsed, buffer.duration));
        }
        if (isPlaying) {
          animationRef.current = requestAnimationFrame(updateProgress);
        }
      };
      animationRef.current = requestAnimationFrame(updateProgress);

    } else {
      // Pause/Stop logic
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) { /* ignore */ }
        sourceRef.current = null;
      }
      
      // Save position if we weren't dragging (dragging handles its own time)
      if (!isDragging) {
          pausedAtRef.current = context.currentTime - startTimeRef.current;
      }
      
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) { /* ignore */ }
      }
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, buffer, context, onTogglePlay, isDragging]);

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    if (!buffer || !context) return;
    
    // 1. Update the offset to the new slider position
    pausedAtRef.current = currentTime;
    
    // 2. If playing, we need to restart the audio node at the new position
    if (isPlaying && sourceRef.current) {
        try { sourceRef.current.stop(); } catch(e) {}
        
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        sourceRef.current = source;
        
        source.start(0, pausedAtRef.current);
        startTimeRef.current = context.currentTime - pausedAtRef.current;
        
        // Re-attach onended
        source.onended = () => {
             if (context.currentTime - startTimeRef.current >= buffer.duration - 0.1) {
                 onTogglePlay(); 
                 pausedAtRef.current = 0;
                 setCurrentTime(0);
             }
        };
    }
    
    setIsDragging(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!buffer && !isLoading) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-40 transform transition-transform duration-300 translate-y-0">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {/* Play/Pause Button */}
        <button 
          onClick={onTogglePlay}
          disabled={isLoading}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-1" />
          )}
        </button>

        {/* Info & Seeker */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-slate-100 truncate flex items-center gap-2">
               <Radio size={14} className="text-red-500 animate-pulse" />
               {isLoading ? "Generating audio with Gemini..." : title}
            </h4>
            <span className="text-xs text-slate-400 font-mono">
               {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="relative h-4 flex items-center group">
            <input
                type="range"
                min={0}
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                disabled={isLoading}
                className="absolute w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer z-20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{
                    backgroundSize: `${(currentTime / duration) * 100}% 100%`,
                    backgroundImage: 'linear-gradient(#6366f1, #6366f1)' // Indigo-500
                }}
            />
            {/* Custom Thumb Styling hack via CSS is complex inline, relying on default browser thumb but styled slightly via tailwind forms plugin usually, or clean native look */}
            <style dangerouslySetInnerHTML={{__html: `
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                    transition: transform 0.1s;
                }
                input[type=range]:hover::-webkit-slider-thumb {
                    transform: scale(1.2);
                }
                input[type=range]::-webkit-slider-runnable-track {
                    background: transparent; /* Handled by inline style gradient */
                }
            `}} />
          </div>
        </div>

        {/* Close */}
        <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 rounded-full hover:bg-slate-800 flex-shrink-0">
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;