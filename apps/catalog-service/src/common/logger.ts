const serviceName = 'catalog-service';
const isProd = process.env.NODE_ENV === 'production';

function getDatadogContext(): Record<string, string> {
  try {
    const tracer = require('dd-trace');
    const span = tracer.scope().active();
    if (span?.context) {
      const ctx = span.context();
      return { 'dd.trace_id': ctx.toTraceId(), 'dd.span_id': ctx.toSpanId() };
    }
  } catch (err) {
    console.warn(`[${serviceName}] dd-trace not available:`, err instanceof Error ? err.message : err);
    return {};
  }
  return {};
}

function formatEntry(level: string, context: string, message: string, extra?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: serviceName,
    context,
    message,
    ...getDatadogContext(),
    ...(extra && Object.keys(extra).length > 0 ? extra : {}),
  };
  return isProd ? JSON.stringify(entry) : `${entry.timestamp} [${level}] ${serviceName}:${context} - ${message}${extra ? ' ' + JSON.stringify(extra) : ''}`;
}

function write(level: string, context: string, message: string, extra?: Record<string, unknown>) {
  const out = formatEntry(level, context, message, extra);
  if (level === 'error') process.stderr.write(out + '\n');
  else process.stdout.write(out + '\n');
}

export const logger = {
  log: (message: string, context = 'App', extra?: Record<string, unknown>) => write('info', context, message, extra),
  error: (message: string, context = 'App', extra?: Record<string, unknown>) => write('error', context, message, extra),
  warn: (message: string, context = 'App', extra?: Record<string, unknown>) => write('warn', context, message, extra),
  debug: (message: string, context = 'App', extra?: Record<string, unknown>) => !isProd && write('debug', context, message, extra),
};
