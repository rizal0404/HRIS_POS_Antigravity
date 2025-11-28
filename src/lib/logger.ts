
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const getTimestamp = (): string => new Date().toISOString();

export const log = (level: LogLevel, message: string, context?: unknown): void => {
  const formattedMessage = `[${getTimestamp()}] [${level}]: ${message}`;

  switch (level) {
    case LogLevel.INFO:
      console.log(formattedMessage);
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage);
      break;
    case LogLevel.ERROR:
      console.error(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }

  if (context) {
    console.log('Context:', context);
  }
};

export const logInfo = (message: string, context?: unknown) => log(LogLevel.INFO, message, context);
export const logWarn = (message: string, context?: unknown) => log(LogLevel.WARN, message, context);
export const logError = (message: string, context?: unknown) => log(LogLevel.ERROR, message, context);
