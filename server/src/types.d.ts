import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    piUserId?: string;
    username?: string;
  }
}