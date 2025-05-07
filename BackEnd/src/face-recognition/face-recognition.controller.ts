import { Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FaceRecognitionService } from './face-recognition.service';

@Controller('face')
export class FaceRecognitionController {
  constructor(private readonly faceService: FaceRecognitionService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('image'))
  async register(
    @UploadedFile() file: Express.Multer.File,
    @Body('user_id') userId: string,
  ) {
    return this.faceService.registerFace(file, parseInt(userId));
  }

  @Post('recognize')
  @UseInterceptors(FileInterceptor('image'))
  async recognize(@UploadedFile() file: Express.Multer.File) {
    return this.faceService.recognizeFace(file);
  }
}
