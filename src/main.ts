import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import fastifyCors from '@fastify/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // CORS Configuration
  await app.register(fastifyCors, {
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: '*', // Allow all headers
    exposedHeaders: '*', // Expose all headers
    credentials: true,
    preflight: true,
    preflightContinue: true,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
  });

  // Add validation with transformation
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: { enableImplicitConversion: true }
  }));

  // WebSocket Configuration
  app.useWebSocketAdapter(new IoAdapter(app));

  // OpenAPI/Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Deep Research API')
    .setDescription('API for conducting in-depth research using AI')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
