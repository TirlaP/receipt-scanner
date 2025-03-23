import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { firebaseService } from '../services/firebase/firebase-service';

interface AuthContextProps {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  registerUser: (email: string, password: string, displayName: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Use the fixed implementation that properly waits for auth state
        const user = await firebaseService.waitForAuthStateChange();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
    
    // Set up auth state observer for ongoing changes
    const unsubscribe = firebaseService.onAuthStateChange((user) => {
      console.log("Auth state changed:", user ? `User: ${user.email}` : "No user");
      setCurrentUser(user);
    });
    
    // Clean up observer on unmount
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<User> => {
    return firebaseService.signIn(email, password);
  };

  const signOut = async (): Promise<void> => {
    return firebaseService.signOut();
  };

  const registerUser = async (email: string, password: string, displayName: string): Promise<User> => {
    return firebaseService.registerUser(email, password, displayName);
  };

  const resetPassword = async (email: string): Promise<void> => {
    return firebaseService.resetPassword(email);
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signOut,
    registerUser,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
