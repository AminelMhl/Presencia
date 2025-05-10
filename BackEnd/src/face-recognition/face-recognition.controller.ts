import { Controller, Post, Get, UseInterceptors, UploadedFile, UseGuards, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FaceRecognitionService } from './face-recognition.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('face')
export class FaceRecognitionController {
  constructor(private readonly faceService: FaceRecognitionService,
    private readonly prisma: PrismaService
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('image'))
  async register(
    @UploadedFile() file: Express.Multer.File,
    @Body('user_id') userId: string,
  ) {
    const imageUri = `faces/${userId}.jpg`;  // Adjust this if needed
    return this.faceService.registerFace(file, parseInt(userId), imageUri);
  }

  @Post('recognize')
@UseInterceptors(FileInterceptor('image'))
async recognize(@UploadedFile() file: Express.Multer.File) {
    const recognition = await this.faceService.recognizeFace(file);

    if (!recognition.success || !recognition.userId) {
        return {
            success: false,
            error: recognition.error || 'Face not recognized',
        };
    }

    const attendance = await this.faceService.markAttendance(recognition.userId);
    const userData = await this.faceService.getUserById(recognition.userId);

    return {
        success: true,
        user: {
            id: userData.id,
            name: userData.name,
            email: userData.email
        },
        attendance: {
            formattedDateTime: attendance.attendance.formattedDateTime  
        },
        confidence: recognition.confidence
    };
}

  @Get('users')
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        name: true,
        id: true,
        email: true,
      },
    });
    return users;
  }

  @Get('all')
  async getAllFaceData() {
    return this.prisma.faceData.findMany({
      include: { User: true }
    });
  }
}