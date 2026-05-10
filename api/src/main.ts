import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: en producción debe ser la URL del front (ej. en Coolify: CORS_ORIGIN=https://pixel-tv.overclocksolutions.xyz)
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
  Logger.log(`CORS allow-origin: ${corsOrigin}`);
  app.enableCors({
    origin: "*",
    credentials: true,
  });

  // Security: permitir cargar imágenes/vídeos desde el front (otro origen)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Swagger: solo en desarrollo/staging (bloqueado en producción)
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Pixel TV API')
      .setDescription('API documentation for Pixel TV')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  if (!isProduction) {
    Logger.log(
      `📚 Swagger documentation: http://localhost:${port}/${globalPrefix}/docs`,
    );
  }
}

const logger = new Logger('Bootstrap');

// Errores no capturados (excepciones síncronas)
process.on('uncaughtException', (err: Error) => {
  const msg = err.stack || err.message;
  logger.error('uncaughtException - La API va a terminar', msg);
  process.exit(1);
});

// Promesas rechazadas sin .catch()
process.on('unhandledRejection', (reason: unknown) => {
  let message: string;
  if (reason instanceof Error) {
    message = reason.stack ?? reason.message;
  } else if (typeof reason === 'string') {
    message = reason;
  } else {
    message = JSON.stringify(reason);
  }
  logger.error('unhandledRejection - Promesa rechazada no manejada', message);
});

bootstrap().catch((err) => {
  const msg = err?.stack || (err as Error)?.message || String(err);
  logger.error('Error al arrancar la aplicación', msg);
  process.exit(1);
});
