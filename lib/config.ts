export const ENV = {
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
} as const;

export const LOG_CONFIG = {
  sensitiveFields: [
    'token',
    'password',
    'secret',
    'key',
    'authorization',
    'messageId',
    'accessToken',
    'refreshToken',
    'credential',
    'jwt',
    'api',
    'auth',
    'session',
    'cookie',
  ],
  maxMemoryLogs: 1000,
  enableTestLogs: !!process.env.ENABLE_TEST_LOGS,
} as const;

const isSensitiveKey = (key: string): boolean => 
  LOG_CONFIG.sensitiveFields.some(field => key.toLowerCase().includes(field));

export const removeSensitiveData = (data: unknown): unknown => {
  if (!data || typeof data !== 'object') return data;

  // If it's an array, filter each element
  if (Array.isArray(data)) {
    return data.map(item => removeSensitiveData(item));
  }

  // For objects, remove sensitive fields and recurse on remaining fields
  const filtered: Record<string, unknown> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Skip this field entirely if it's sensitive
    if (isSensitiveKey(key)) {
      return;
    }
    
    // Recurse on objects
    if (value && typeof value === 'object') {
      filtered[key] = removeSensitiveData(value);
    } else {
      // For primitive values, check if they might be sensitive data in string form
      if (typeof value === 'string' && value.length > 8) {
        // Skip strings that look like they might contain sensitive data
        if (value.includes('key') || 
            value.includes('token') || 
            value.includes('secret') ||
            value.includes('password') ||
            value.includes('auth')) {
          return;
        }
      }
      filtered[key] = value;
    }
  });

  return filtered;
}; 