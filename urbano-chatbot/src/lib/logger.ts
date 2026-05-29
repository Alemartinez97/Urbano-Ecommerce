export type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
  private isProduction = process.env.NODE_ENV === "production";

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      service: "chatbot-service",
      ...meta,
    };

    if (this.isProduction) {
      // Structured JSON output for Datadog / Cloudflare Logs
      console.log(JSON.stringify(logData));
    } else {
      // Colorized console output for local development
      const colors = {
        info: "\x1b[36m",  // Cyan
        warn: "\x1b[33m",  // Yellow
        error: "\x1b[31m", // Red
        debug: "\x1b[35m", // Magenta
      };
      const reset = "\x1b[0m";
      const color = colors[level] || reset;
      
      console.log(
        `[${timestamp}] ${color}${level.toUpperCase()}${reset}: ${message}`,
        meta ? `\n  Meta: ${JSON.stringify(meta, null, 2)}` : ""
      );
    }
  }

  info(message: string, meta?: Record<string, any>) {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log("error", message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    if (!this.isProduction) {
      this.log("debug", message, meta);
    }
  }
}

export const logger = new Logger();
export default logger;
