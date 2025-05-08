import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FaceRecognitionService } from './face-recognition.service';
import { FaceRecognitionController } from './face-recognition.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  providers: [FaceRecognitionService, PrismaService],
  controllers: [FaceRecognitionController],
})
export class FaceRecognitionModule {}
