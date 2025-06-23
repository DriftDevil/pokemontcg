
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): number {
  const level = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (level && LOG_LEVELS[level] !== undefined) {
    return LOG_LEVELS[level];
  }
  return LOG_LEVELS.info; // Default to info
}

const CURRENT_LOG_LEVEL = getLogLevel();

const formatMessage = (level: LogLevel, context: string, ...args: any[]): string => {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return '[Circular Object]';
      }
    }
    return arg;
  }).join(' ');

  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${formattedArgs}`;
};

const logger = {
  debug: (context: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', context, ...args));
    }
  },
  info: (context: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.info) {
      console.log(formatMessage('info', context, ...args));
    }
  },
  warn: (context: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', context, ...args));
    }
  },
  error: (context: string, ...args: any[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.error) {
      console.error(formatMessage('error', context, ...args));
    }
  },
};

export default logger;
