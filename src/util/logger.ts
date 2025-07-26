import pino from 'pino';
import env from './env';

const logger = pino({
    level: env.LOG_LEVEL,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});

export default logger;