import config from "./config.js";
import { createLogger } from "./logger.js";

const logger = createLogger("CookieUtils");

export class CookieUtils {
  static setChatSession(ctx, sessionData) {
    try {
      ctx.cookies.set(config.cookie.name, JSON.stringify(sessionData), {
        ...config.cookie,
        maxAge: config.cookie.maxAge,
      });
      logger.debug("Session cookie set", { userId: sessionData.userId });
    } catch (error) {
      logger.error("Error setting session cookie", error);
    }
  }

  static getChatSession(ctx) {
    try {
      const cookie = ctx.cookies.get(config.cookie.name);
      return cookie ? JSON.parse(cookie) : null;
    } catch (error) {
      logger.error("Error parsing session cookie", error);
      return null;
    }
  }

  static touchSession(ctx) {
    try {
      const session = this.getChatSession(ctx);
      if (session) {
        this.setChatSession(ctx, {
          ...session,
          lastActive: Date.now(),
        });
      }
    } catch (error) {
      logger.error("Error touching session cookie", error);
    }
  }

  static updateSessionActivity(ctx) {
    try {
      const session = this.getChatSession(ctx);
      if (session) {
        this.setChatSession(ctx, {
          ...session,
          lastActive: Date.now(),
        });
      }
    } catch (error) {
      logger.error("Error updating session activity", error);
    }
  }

  static clearChatSession(ctx) {
    ctx.cookies.set(config.cookie.name, null);
    logger.debug("Session cookie cleared");
  }
}
