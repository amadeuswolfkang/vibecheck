import { z } from 'zod';

const envSchema = z.object({
  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  
  // Google OAuth
  GOOGLE_ID: z.string().min(1),
  GOOGLE_SECRET: z.string().min(1),
  GOOGLE_SCOPE: z.string().min(1),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),

  // Gmail search query used to select feedback emails, e.g. "label:feedback newer_than:90d".
  // Defaults to newer_than:30d (matching the UI's 30-day window); set to "" to fetch everything.
  GMAIL_QUERY: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        'Invalid environment variables:',
        JSON.stringify(
          error.flatten().fieldErrors,
          null,
          2
        )
      );
    } else {
      console.error('Failed to validate environment variables:', error);
    }
    throw new Error('Invalid environment variables');
  }
}

export const env = validateEnv(); 