import React, { useState } from 'react';
import { X, User, ArrowRight, Loader2, Mail, Lock, ShieldCheck } from 'lucide-react';
import { userService } from '../services/userService';
import { AgeRange, User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserType) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    ageRange: AgeRange.ADULT
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user;
      if (isLogin) {
        user = await userService.login(formData.email || formData.username, formData.password);
      } else {
        if (!formData.email || !formData.password) throw new Error("All fields are required");
        user = await userService.signup({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            ageRange: formData.ageRange
        });
      }
      onLogin(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
      setLoading(true);
      try {
          const user = await userService.googleAuthSimulation();
          onLogin(user);
          onClose();
      } catch (e) {
          setError("Google Auth Failed");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-indigo-400" />
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <button 
             onClick={handleGoogleAuth}
             type="button"
             className="w-full bg-white text-slate-900 font-semibold py-3 rounded-lg flex items-center justify-center gap-3 transition-colors hover:bg-slate-100 mb-6"
          >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
             </svg>
             Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-900 text-slate-400">Or continue with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="johndoe"
                    required
                />
              </div>
            </div>

            {/* Extra fields for signup */}
            {!isLogin && (
                <>
                 {/* Email */}
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                        <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                 </div>

                 {/* Age Range */}
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Age Range (for content safety)</label>
                    <div className="relative">
                        <ShieldCheck className="absolute left-3 top-3 text-slate-500" size={18} />
                        <select 
                            value={formData.ageRange}
                            onChange={(e) => setFormData({...formData, ageRange: e.target.value as AgeRange})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        >
                            {Object.values(AgeRange).map((age) => (
                                <option key={age} value={age}>{age}</option>
                            ))}
                        </select>
                    </div>
                 </div>
                </>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••"
                    required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isLogin ? 'Sign In' : 'Sign Up'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;