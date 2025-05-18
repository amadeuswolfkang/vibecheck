// Helper function to combine classes conditionally
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// Helper to create component classes with variants
export function createStyles<T extends Record<string, string>>(
  baseStyles: string,
  variants: T,
  defaultVariant?: keyof T
) {
  return {
    base: baseStyles,
    variants,
    getStyles: (variant?: keyof T) => {
      const selectedVariant = variant || defaultVariant;
      return cn(baseStyles, selectedVariant ? variants[selectedVariant] : '');
    },
  };
}

// Button variants
export const button = {
  base: 'inline-flex items-center justify-center font-medium transition-colors duration-200',
  sizes: {
    sm: 'text-sm px-3 py-1.5',
    base: 'text-base px-6 h-10',
    lg: 'text-lg px-8 py-3',
  },
  variants: {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-600',
    secondary: 'bg-emerald-500 text-white hover:bg-emerald-600',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
    ghost: 'hover:bg-slate-200 dark:hover:bg-slate-700/50',
  },
  shapes: {
    rounded: 'rounded-md',
    pill: 'rounded-full',
  },
  states: {
    disabled: 'opacity-50 cursor-not-allowed',
    loading: 'cursor-wait',
  },
} as const;

// Text styles
export const text = {
  sizes: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  },
  colors: {
    default: 'text-gray-700 dark:text-gray-200',
    muted: 'text-gray-500 dark:text-gray-400',
    primary: 'text-indigo-600 dark:text-indigo-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-rose-600 dark:text-rose-400',
    warning: 'text-amber-600 dark:text-amber-400',
  },
  weights: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
} as const;

// Layout patterns
export const layout = {
  container: 'max-w-[88rem] mx-auto px-4 sm:px-6 md:px-8',
  section: 'py-12 sm:py-16 md:py-20',
  card: 'bg-white dark:bg-slate-800 rounded-xl shadow-sm',
  divider: 'border-t border-slate-200/20 dark:border-slate-700/20',
  grid: {
    base: 'grid gap-4',
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    },
  },
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    col: 'flex flex-col',
    colCenter: 'flex flex-col items-center',
  },
} as const;

// Animation patterns
export const animation = {
  // Basic transitions
  transition: 'transition-all duration-200',
  // Framer Motion variants
  motion: {
    fadeSlideUp: {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 16 },
      transition: { 
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    fadeSlideDown: {
      initial: { opacity: 0, y: -16 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -16 },
      transition: { 
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }
} as const;

// Badge/Chip variants
export const badge = {
  base: 'inline-flex items-center justify-center font-medium',
  variants: {
    success: 'bg-green-100 dark:bg-green-900/30 text-emerald-700 dark:text-emerald-300',
    error: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  sizes: {
    sm: 'text-xs px-2 py-0.5',
    base: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
    header: 'text-base px-6 py-2.5 min-w-[180px]',
  },
  shapes: {
    rounded: 'rounded-md',
    pill: 'rounded-full',
  },
} as const;

// Card variants and styles
export const card = {
  base: 'bg-white dark:bg-slate-800 rounded-xl transition-all',
  padding: {
    none: '',
    sm: 'p-4',
    normal: 'p-6',
    large: 'p-8',
  },
  variants: {
    default: 'shadow-sm',
    elevated: 'shadow-md hover:shadow-lg',
    interactive: 'shadow-sm hover:shadow-md cursor-pointer',
  },
  animation: {
    fadeSlide: '[transition:transform_500ms_ease-in-out,opacity_500ms_ease-in-out]',
    fadeIn: 'animate-fade-in',
  },
  states: {
    loading: 'opacity-50 pointer-events-none',
    disabled: 'opacity-75 pointer-events-none',
  },
} as const;

// Common background patterns
export const background = {
  gradient: {
    light: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    dark: 'dark:from-slate-900 dark:to-indigo-950',
  },
  solid: {
    light: 'bg-white',
    dark: 'dark:bg-slate-800',
  },
  transparent: {
    light: 'bg-white/80',
    dark: 'dark:bg-gray-800/80',
  },
} as const;

// Icon button styles
export const iconButton = {
  base: 'inline-flex items-center justify-center transition-colors duration-200',
  sizes: {
    sm: 'p-1.5',
    base: 'p-2',
    lg: 'p-3',
  },
  variants: {
    ghost: 'hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full',
    solid: 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full',
  },
} as const;

// Sender badge styles
export const senderBadge = {
  base: 'flex flex-col items-start rounded-full text-xs transition-colors duration-200',
  states: {
    interactive: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer',
    disabled: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default',
  },
  padding: {
    compact: 'px-2 py-1',
    normal: 'px-3 py-1.5',
    loose: 'px-4 py-2',
  },
} as const;

// Chart styles
export const chart = {
  container: 'h-[400px] sm:h-[450px] md:h-[400px] flex flex-col',
  title: cn(text.weights.semibold, text.sizes.lg, text.colors.default, 'leading-none mb-1'),
  legend: {
    wrapper: 'flex flex-wrap gap-4 sm:gap-6',
    item: 'flex items-center gap-1.5 sm:gap-2',
    dot: 'w-2.5 h-2.5 sm:w-3 sm:h-3 rounded',
    label: cn(text.sizes.sm, text.colors.default),
  },
  stats: {
    container: cn(
      background.transparent.light,
      background.transparent.dark,
      'backdrop-blur-sm p-2 text-xs w-28 sm:w-32'
    ),
    row: 'flex justify-between gap-2 sm:gap-6',
    divider: 'pt-1 mt-2 border-t border-gray-200 dark:border-gray-700',
  },
} as const;

// Page layout styles
export const page = {
  wrapper: cn(
    'min-h-screen flex flex-col',
    background.gradient.light,
    background.gradient.dark,
    'transition-all',
    text.colors.default
  ),
  header: cn(
    'border-b border-slate-200/20 dark:border-slate-700/20',
    'py-4 backdrop-blur-sm'
  ),
  main: cn(
    layout.container,
    'flex-1 py-8'
  ),
  footer: cn(
    'border-t border-slate-200/20 dark:border-slate-700/20',
    'py-4 sm:py-6 md:py-8 mt-8 sm:mt-12 backdrop-blur-sm'
  ),
} as const; 