import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { config } from './common/config';

export function setupApp(app: INestApplication) {
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.webOrigin, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  return app;
}
