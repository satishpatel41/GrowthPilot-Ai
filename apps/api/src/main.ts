import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  try { process.loadEnvFile('.env'); } catch { /* env may come from the shell */ }
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`GrowthPilot API listening on http://localhost:${port}/api`);
}
bootstrap();
