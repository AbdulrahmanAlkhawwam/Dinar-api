import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express, Request, Response } from 'express';
import { AppModule } from './app.module';

// Swagger UI assets are loaded from a CDN because serverless platforms
// (e.g. Vercel) do not ship the static files from swagger-ui-dist.
const SWAGGER_UI_CDN = 'https://unpkg.com/swagger-ui-dist@5.32.13';

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dinar API')
    .setDescription('Dinar API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
    customSiteTitle: 'Dinar API Docs',
    customCssUrl: `${SWAGGER_UI_CDN}/swagger-ui.css`,
    customJs: [
      `${SWAGGER_UI_CDN}/swagger-ui-bundle.js`,
      `${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js`,
    ],
  });

  return app;
}

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('app.port', 3000));
}

let handlerPromise: Promise<Express> | undefined;

// Serverless request handler. Vercel's NestJS preset builds this file as the
// function for `/` and requires a default export; api/index.js reuses it.
// The Nest app is created once per cold start and reused.
export default async function handler(req: Request, res: Response) {
  if (!handlerPromise) {
    handlerPromise = createApp().then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance() as Express;
    });
  }
  const instance = await handlerPromise;
  instance(req, res);
}

// On Vercel the app is served through the handler instead of listening.
if (!process.env.VERCEL) {
  void bootstrap();
}
