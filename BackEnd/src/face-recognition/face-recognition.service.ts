import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import * as FormData from 'form-data';

@Injectable()
export class FaceRecognitionService {
  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
  ) {}
  async registerFace(file: Express.Multer.File, userId: number) {
    const form = new FormData();
  
    // Validate the uploaded file
    if (!file || !file.buffer || file.size === 0) {
      throw new Error('Invalid image file');
    }
  
    // Check if the user exists in the database
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
  
    if (!existingUser) {
      throw new Error(`User with ID ${userId} does not exist. Please ensure the user is registered first.`);
    }
  
    // Append image and user ID
    form.append('image', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('user_id', userId.toString());
  
    try {
      // Send to Flask /register
      const response = await this.http.axiosRef.post('http://localhost:5000/register', form, {
        headers: form.getHeaders(),
      });
  
      console.log('Flask /register response:', response.data);
  
      // If Flask succeeded, try saving to DB
      if (response.data.success) {
        const saved = await this.prisma.faceData.create({
          data: {
            userId,
            uri: `/uploads/faces/${file.originalname}`, // Adjust if needed
          },
        });
        console.log('Saved in Prisma:', saved);
        return saved;
      } else {
        throw new Error(`Flask registration failed: ${response.data.error || 'Unknown error'}`);
      }
  
    } catch (error) {
      console.error('Error during registerFace:', error.message);
      console.error(error.stack);
      throw new Error('Face registration failed. Check logs for details.');
    }
  }

  async recognizeFace(file: Express.Multer.File) {
    const form = new FormData();
    if (!file || !file.buffer || file.size === 0) {
        throw new Error('Invalid image file');
      }
    form.append('image', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

    const response = await this.http.axiosRef.post('http://localhost:5000/recognize', form, {
      headers: form.getHeaders(),
    });

    return response.data;
  }
}