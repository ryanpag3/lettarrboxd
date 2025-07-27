import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LETTERBOXD_URL: z.string().url(),
  RADARR_API_URL: z.string(),
  RADARR_API_KEY: z.string(),
  RADARR_QUALITY_PROFILE: z.string(),
  RADARR_MINIMUM_AVAILABILITY: z.string().default('released'),
  RADARR_ROOT_FOLDER_ID: z.string().optional(),
  CHECK_INTERVAL_MINUTES: z.string().default('10').transform(Number).pipe(z.number().min(10)),
  LETTERBOXD_TAKE_AMOUNT: z.string().optional().transform(val => val ? Number(val) : undefined).pipe(z.number().positive().optional()),
  LETTERBOXD_TAKE_STRATEGY: z.enum(['oldest', 'newest']).optional(),
  DRY_RUN: z.string().default('false').transform(val => val.toLowerCase() === 'true')
}).refine(data => {
  const hasTakeAmount = data.LETTERBOXD_TAKE_AMOUNT !== undefined;
  const hasTakeStrategy = data.LETTERBOXD_TAKE_STRATEGY !== undefined;
  
  // If one is specified, both must be specified
  if (hasTakeAmount && !hasTakeStrategy) {
    return false;
  }
  
  if (hasTakeStrategy && !hasTakeAmount) {
    return false;
  }
  
  return true;
}, {
  message: "When using movie limiting, both LETTERBOXD_TAKE_AMOUNT and LETTERBOXD_TAKE_STRATEGY must be specified",
  path: ["LETTERBOXD_TAKE_AMOUNT", "LETTERBOXD_TAKE_STRATEGY"]
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