import pino from 'pino';
import env from './env';

const logger = pino({
    level: env.LOG_LEVEL
});

export default logger;