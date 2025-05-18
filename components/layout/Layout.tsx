import { ReactNode } from 'react';
import Link from 'next/link';
import DarkModeToggle from '../common/DarkModeToggle';
import { page, layout, text, button, background, animation, cn } from '../../styles';
import Image from 'next/image';

interface LayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
  userEmail?: string | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export default function Layout({ children, isAuthenticated, userEmail, onSignIn, onSignOut }: LayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className={page.wrapper}>
        <header className={page.header}>
          <div className={cn(layout.container, layout.flex.between, 'flex-col sm:flex-row gap-4 sm:gap-0')}>
            <Link href="/" className="inline-block">
              <h1 className={cn(
                text.sizes['3xl'],
                'font-bold text-transparent bg-clip-text bg-gradient-to-r',
                'from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400',
                'relative inline-block hover:opacity-80',
                animation.transition.base
              )}>
                Vibeloop
              </h1>
            </Link>
            <div className={cn(layout.flex.center, 'gap-2 sm:gap-3 flex-shrink-0')}>
              {isAuthenticated ? (
                <>
                  <span className={cn(text.sizes.sm, text.colors.default, 'hidden sm:inline')}>
                    {userEmail}
                  </span>
                  <button
                    onClick={onSignOut}
                    className={cn(
                      button.base,
                      button.sizes.sm,
                      'bg-rose-500 text-white hover:bg-rose-600',
                      button.shapes.pill
                    )}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={onSignIn}
                  className={cn(
                    button.base,
                    button.sizes.sm,
                    'bg-indigo-500 text-white hover:bg-indigo-600',
                    button.shapes.pill
                  )}
                >
                  Connect Gmail
                </button>
              )}
              <DarkModeToggle />
            </div>
          </div>
        </header>
        <main className={cn(
          page.main,
          layout.flex.colCenter,
          'pt-4 sm:pt-6 pb-8 sm:pb-12'
        )}>
          <div className={layout.container}>
            {children}
          </div>
        </main>
        <footer className={page.footer}>
          <div className={cn(layout.container, 'text-center')}>
            <p className={cn(text.sizes.sm, text.colors.default, 'md:text-base')}>
              © {currentYear} Vibeloop. Made with ❤️ for better feedback.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
} 