import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { SessionUser } from '../common/auth.types';
import { config, SESSION_COOKIE } from '../common/config';
import { CurrentUser } from '../common/current-user';
import { Public } from '../common/session.guard';
import { GoogleDto, LoginDto, RegisterDto, VerifyOtpDto } from './auth.dto';
import { AuthService } from './auth.service';

const authLimit = () => Number(process.env.AUTH_RATE_LIMIT ?? 10);

function setSession(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionHours * 3600 * 1000,
    path: '/',
  });
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Throttle({ default: { limit: authLimit, ttl: 60_000 } }) @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { token, user, devOtp } = await this.auth.register(dto);
    setSession(res, token);
    return { user, devOtp };
  }

  @Public() @Throttle({ default: { limit: authLimit, ttl: 60_000 } }) @HttpCode(200) @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    setSession(res, token);
    return { user };
  }

  @Public() @Throttle({ default: { limit: authLimit, ttl: 60_000 } }) @HttpCode(200) @Post('google')
  async google(@Body() dto: GoogleDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.google(dto.idToken);
    setSession(res, token);
    return { user };
  }

  @Public() @HttpCode(200) @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.auth.me(user.id).then((u) => ({ user: u }));
  }

  @Throttle({ default: { limit: authLimit, ttl: 60_000 } }) @HttpCode(200) @Post('otp/verify')
  async verify(@CurrentUser() user: SessionUser, @Body() dto: VerifyOtpDto) {
    return { user: await this.auth.verifyOtp(user.id, dto.code) };
  }

  @Throttle({ default: { limit: () => Math.min(3, authLimit()), ttl: 60_000 } }) @HttpCode(200) @Post('otp/resend')
  resend(@CurrentUser() user: SessionUser) {
    return this.auth.resendOtp(user.id);
  }
}
