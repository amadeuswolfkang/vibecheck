import { useSession, signIn, signOut } from 'next-auth/react';

/**
 * Return type for the useAuth hook
 * @interface UseAuthReturn
 */
interface UseAuthReturn {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether the authentication state is being loaded */
  isLoading: boolean;
  /** The authenticated user's information */
  user: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
  /** Function to initiate Google OAuth sign-in */
  signInWithGoogle: () => Promise<void>;
  /** Function to sign out the current user */
  signOutUser: () => Promise<void>;
}

/**
 * Custom hook to handle authentication state and methods
 * @returns {UseAuthReturn} Authentication state and methods
 * @example
 * const { isAuthenticated, user, signInWithGoogle, signOutUser } = useAuth();
 * 
 * // Sign in
 * await signInWithGoogle();
 * 
 * // Access user info
 * console.log(user?.email);
 * 
 * // Sign out
 * await signOutUser();
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const signInWithGoogle = async () => {
    await signIn('google');
  };

  const signOutUser = async () => {
    await signOut();
  };

  return {
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    user: session?.user ?? null,
    signInWithGoogle,
    signOutUser,
  };
} 