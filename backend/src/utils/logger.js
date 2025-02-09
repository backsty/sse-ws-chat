import config from "./config.js";

const getTimeStamp = () => new Date().toISOString();

const formatMessage = (level, message, meta = {}) =>
  JSON.stringify({
    timestamp: getTimeStamp(),
    level,
    message,
    ...meta,
  });

class Logger {
  constructor(module) {
    this.module = module;
  }

  info(message, meta = {}) {
    if (!config.isProd) {
      console.log(
        "\x1b[36m%s\x1b[0m",
        formatMessage("INFO", message, {
          ...meta,
          module: this.module,
        }),
      );
    }
  }

  error(message, meta = {}) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      formatMessage("ERROR", message, {
        ...meta,
        module: this.module,
      }),
    );
  }

  warn(message, meta = {}) {
    console.warn(
      "\x1b[33m%s\x1b[0m",
      formatMessage("WARN", message, {
        ...meta,
        module: this.module,
      }),
    );
  }

  debug(message, meta = {}) {
    if (!config.isProd) {
      console.debug(
        "\x1b[32m%s\x1b[0m",
        formatMessage("DEBUG", message, {
          ...meta,
          module: this.module,
        }),
      );
    }
  }
}

export const logger = new Logger("app");
export const createLogger = (module) => new Logger(module);
