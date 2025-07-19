import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LETTERBOXD_USERNAME: z.string(),
  DATA_DIR: z.string(),
  RADARR_API_URL: z.string(),
  RADARR_API_KEY: z.string(),
  RADARR_QUALITY_PROFILE: z.string(),
  RADARR_MINIMUM_AVAILABILITY: z.string().default('released'),
  CHECK_INTERVAL_MINUTES: z.string().default('10').transform(Number).pipe(z.number().min(10))
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('Environment validation failed:');
    result.error.issues.forEach(error => {
      console.error(`- ${error.path.join('.')}: ${error.message}`);
    });
    process.exit(1);
  }
  
  return result.data;
}

const env = validateEnv();
export default env;