type LogMeta = Record<string, unknown>;

function redactSensitiveValues(key: string, value: unknown): unknown {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey.includes('token') || normalizedKey.includes('authorization')) {
    return '[REDACTED]';
  }

  return value;
}

function formatMeta(meta?: LogMeta): string {
  if (!meta) {
    return '';
  }

  return ` ${JSON.stringify(meta, redactSensitiveValues)}`;
}

function write(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: LogMeta): void {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${level.toUpperCase()} ${message}${formatMeta(meta)}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(message: string, meta?: LogMeta): void {
    if (process.env.NODE_ENV !== 'production') {
      write('debug', message, meta);
    }
  },

  info(message: string, meta?: LogMeta): void {
    write('info', message, meta);
  },

  warn(message: string, meta?: LogMeta): void {
    write('warn', message, meta);
  },

  error(message: string, meta?: LogMeta): void {
    write('error', message, meta);
  }
};
