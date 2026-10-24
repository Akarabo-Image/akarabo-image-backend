import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MainModule } from './main.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(MainModule);
  setupApp(app);

  const config = app.get(ConfigService);
  const apiPrefix = config.getOrThrow<string>('apiPrefix');
  const port = config.getOrThrow<number>('port');
  await app.listen(port);

  console.log(
    `Application is running on: http://localhost:${port}/${apiPrefix}`,
  );
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}
bootstrap().catch((error: unknown) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
