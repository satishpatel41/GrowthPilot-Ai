export const config = {
  get jwtSecret(): string {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) {
      throw new Error('JWT_SECRET must be set to a random string of at least 32 characters');
    }
    return s;
  },
  get isProd() { return process.env.NODE_ENV === 'production'; },
  get bcryptRounds() { return Number(process.env.BCRYPT_ROUNDS ?? 12); },
  get sessionHours() { return Number(process.env.SESSION_HOURS ?? 12); },
  get webOrigin() { return process.env.WEB_ORIGIN ?? 'http://localhost:3000'; },
  get otpDevEcho() { return process.env.OTP_DEV_ECHO === 'true' && !config.isProd; },
  get googleClientId() { return process.env.GOOGLE_CLIENT_ID ?? ''; },
};
export const SESSION_COOKIE = 'gp_session';
