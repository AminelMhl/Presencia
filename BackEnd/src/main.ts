import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule } from '@nestjs/swagger';
import { DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], 
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Presencia API')
    .setDescription('API documentation for Presencia')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);
  
  await app.listen(process.env.PORT ?? 3003);
}
bootstrap();
