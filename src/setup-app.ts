import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AccessDeniedExceptionFilter } from './controller/access-denied.exception-filter';
import { AuthenticationErrorFilter } from './controller/authentication-error.exception-filter';
import { ConflictExceptionFilter } from './controller/conflict.exception-filter';
import { DuplicateUserExceptionFilter } from './controller/duplicate-user.exception-filter';
import { HttpExceptionFilter } from './controller/http-exception.filter';
import { InvalidAmountExceptionFilter } from './controller/invalid-amount.exception-filter';
import { InvalidInputExceptionFilter } from './controller/invalid-input.exception-filter';
import { NotFoundExceptionFilter } from './controller/not-found.exception-filter';

/**
 * Points the app at the embedded in-memory database so test suites never
 * depend on a running PostgreSQL server. Must run before the testing module
 * is compiled (env is read when the database module bootstraps).
 */
export function useInMemoryDatabase(): void {
  process.env.DB_TYPE = 'sqljs';
  process.env.DB_SQLJS_AUTOSAVE = 'false';
  process.env.DB_SYNCHRONIZE = 'false';
}

/**
 * Applies the whole HTTP pipeline (prefix, versioning, validation, error
 * filters, Swagger). Used by both the real server (main.ts) and the
 * integration tests, so they exercise the exact same configuration.
 */
export function setupApp<App>(
  app: INestApplication<App>,
): INestApplication<App> {
  const config = app.get(ConfigService);

  app.setGlobalPrefix(config.getOrThrow<string>('apiPrefix'));
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Domain errors first, generic Nest exceptions last.
  app.useGlobalFilters(
    new DuplicateUserExceptionFilter(),
    new ConflictExceptionFilter(),
    new InvalidAmountExceptionFilter(),
    new InvalidInputExceptionFilter(),
    new AuthenticationErrorFilter(),
    new AccessDeniedExceptionFilter(),
    new NotFoundExceptionFilter(),
    new HttpExceptionFilter(),
  );

  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Akarabo Studio API')
    .setDescription(
      'Backend for Akarabo Studio management: authentication, bookings, finance, photo orders, workers, inventory and reports.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  return app;
}
