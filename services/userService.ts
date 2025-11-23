import { User, UserInterests, Category, Feedback, NewsArticle, AgeRange } from "../types";

const STORAGE_KEY_USERS = 'yir_users';
const STORAGE_KEY_CURRENT = 'yir_current_user';
const STORAGE_KEY_FEEDBACK = 'yir_feedback';
const STORAGE_KEY_BRIEFINGS = 'yir_briefings';

const DEFAULT_INTERESTS: UserInterests = {
  [Category.GLOBAL]: 1.0,
  [Category.POLITICS]: 1.0,
  [Category.TECH]: 1.0,
  [Category.SCIENCE]: 1.0,
  [Category.CULTURE]: 1.0,
  [Category.BUSINESS]: 1.0
};

// Mock Encryption (In production, use bcrypt on server)
const encrypt = (text: string): string => {
  return btoa(text.split('').reverse().join('') + "_SALT_SECURE");
};

// Mock Hashing for passwords
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
};

const getUsers = (): Record<string, User> => {
  const str = localStorage.getItem(STORAGE_KEY_USERS);
  return str ? JSON.parse(str) : {};
};

const saveUsers = (users: Record<string, User>) => {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

export const userService = {
  login: async (identifier: string, password?: string, isGoogle = false): Promise<User> => {
    await new Promise(r => setTimeout(r, 800)); // Simulate net lag
    
    const users = getUsers();
    
    // Find by username or email
    const user = Object.values(users).find(u => {
        if (isGoogle) return u.email === identifier && u.isGoogleAuth;
        return (u.username.toLowerCase() === identifier.toLowerCase() || u.email === identifier) 
               && u.password === hashPassword(password || "");
    });
    
    if (user) {
      localStorage.setItem(STORAGE_KEY_CURRENT, user.id);
      return user;
    }
    throw new Error("Invalid credentials");
  },

  signup: async (data: { username: string; email: string; password?: string; ageRange: AgeRange; isGoogle?: boolean }): Promise<User> => {
    await new Promise(r => setTimeout(r, 800));
    
    const users = getUsers();
    
    // Check duplicates
    if (Object.values(users).some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      throw new Error("Username already taken");
    }
    if (Object.values(users).some(u => u.email === data.email)) {
      throw new Error("Email already registered");
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      username: data.username,
      email: data.email, // In a real app, encrypt PII
      password: data.password ? hashPassword(data.password) : undefined,
      ageRange: data.ageRange,
      interests: { ...DEFAULT_INTERESTS },
      readHistory: [],
      isGoogleAuth: data.isGoogle,
      onboardingComplete: false
    };

    users[newUser.id] = newUser;
    saveUsers(users);
    localStorage.setItem(STORAGE_KEY_CURRENT, newUser.id);
    return newUser;
  },

  googleAuthSimulation: async (): Promise<User> => {
     // Simulating a Google User
     const email = "demo.user@gmail.com";
     const users = getUsers();
     const existing = Object.values(users).find(u => u.email === email);
     
     if (existing) {
         return userService.login(email, undefined, true);
     } else {
         return userService.signup({
             username: "GoogleUser",
             email: email,
             ageRange: AgeRange.ADULT, // Default to adult for oauth demo
             isGoogle: true
         });
     }
  },

  completeOnboarding: (userId: string, selectedCategories: string[]) => {
      const users = getUsers();
      const user = users[userId];
      if (user) {
          // Boost selected interests
          selectedCategories.forEach(cat => {
              user.interests[cat] = 2.0; // Strong start
          });
          user.onboardingComplete = true;
          saveUsers(users);
          return user;
      }
      return null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_CURRENT);
  },

  getCurrentUser: (): User | null => {
    const userId = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!userId) return null;
    const users = getUsers();
    return users[userId] || null;
  },

  updateInterests: (userId: string, category: string, delta: number) => {
    const users = getUsers();
    const user = users[userId];
    if (user) {
      user.interests[category] = Math.max(0.1, (user.interests[category] || 1.0) + delta);
      saveUsers(users);
      return user;
    }
    return null;
  },

  addToHistory: (userId: string, articleId: string) => {
    const users = getUsers();
    const user = users[userId];
    if (user && !user.readHistory.includes(articleId)) {
      user.readHistory.push(articleId);
      saveUsers(users);
    }
  },

  submitFeedback: async (feedback: Omit<Feedback, 'id' | 'timestamp'>) => {
    const stored = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    const allFeedback: Feedback[] = stored ? JSON.parse(stored) : [];
    
    const newFeedback: Feedback = {
      ...feedback,
      id: `fb-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    allFeedback.push(newFeedback);
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(allFeedback));
    return true;
  },

  getDailyBriefing: (userId: string, dateStr: string): NewsArticle[] | null => {
    const store = localStorage.getItem(STORAGE_KEY_BRIEFINGS);
    const briefings = store ? JSON.parse(store) : {};
    const key = `${userId}_${dateStr}`;
    return briefings[key] || null;
  },

  saveDailyBriefing: (userId: string, dateStr: string, articles: NewsArticle[]) => {
    const store = localStorage.getItem(STORAGE_KEY_BRIEFINGS);
    const briefings = store ? JSON.parse(store) : {};
    const key = `${userId}_${dateStr}`;
    briefings[key] = articles;
    localStorage.setItem(STORAGE_KEY_BRIEFINGS, JSON.stringify(briefings));
  },

  // --- Admin Functions ---
  
  /**
   * Remote Deletion (Admin tool).
   * Usage: Call `adminDeleteUser('user-id')` from console.
   */
  adminDeleteUser: (userIdToWipe: string) => {
      const users = getUsers();
      if (users[userIdToWipe]) {
          delete users[userIdToWipe];
          saveUsers(users);
          console.log(`User ${userIdToWipe} has been permanently deleted.`);
          
          // If current user was deleted, logout
          if (localStorage.getItem(STORAGE_KEY_CURRENT) === userIdToWipe) {
              localStorage.removeItem(STORAGE_KEY_CURRENT);
              window.location.reload();
          }
          return true;
      } else {
          console.warn(`User ${userIdToWipe} not found. Available IDs:`, Object.keys(users));
          return false;
      }
  },

  /**
   * Remote Creation (Admin tool).
   * Usage: Call `adminAddUser('newuser', 'password123', 'email@test.com', 'Adult (18+)')` from console.
   */
  adminAddUser: (username: string, password: string, email: string, ageRange: string = AgeRange.ADULT) => {
      try {
          // Re-use logic for simplicity
          const users = getUsers();
          const id = `user-${Date.now()}`;
          const newUser: User = {
              id,
              username,
              email,
              password: hashPassword(password),
              ageRange: ageRange as AgeRange,
              interests: { ...DEFAULT_INTERESTS },
              readHistory: [],
              onboardingComplete: false
          };
          users[id] = newUser;
          saveUsers(users);
          console.log(`User created successfully. ID: ${id}`);
          return id;
      } catch (e) {
          console.error("Failed to create user", e);
          return null;
      }
  },

  /**
   * List Users (Admin tool)
   */
  adminListUsers: () => {
      const users = getUsers();
      console.table(Object.values(users).map(u => ({ id: u.id, username: u.username, email: u.email })));
  }
};

// Expose to window for "Remote Code" access via DevTools
(window as any).adminDeleteUser = userService.adminDeleteUser;
(window as any).adminAddUser = userService.adminAddUser;
(window as any).adminListUsers = userService.adminListUsers;