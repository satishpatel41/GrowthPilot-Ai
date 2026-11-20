import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { config } from '../common/config';

/**
 * Delivery of one-time codes. No SMS provider is wired yet: in development the code is
 * written to the server log (and optionally echoed by the API when OTP_DEV_ECHO=true).
 * In production this refuses to run until a real provider is implemented.
 */
@Injectable()
export class OtpSender {
  private log = new Logger('OtpSender');

  async sendSms(phone: string, code: string) {
    if (config.isProd) {
      throw new ServiceUnavailableException('SMS provider is not configured');
    }
    this.log.warn(`[DEV ONLY] OTP for ${phone}: ${code}`);
  }
}
