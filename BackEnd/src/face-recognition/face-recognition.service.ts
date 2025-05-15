/* eslint-disable @typescript-eslint/no-unused-vars */
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

  async registerFace(file: Express.Multer.File, userId: number, imageUri: string) {
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
      const response = await this.http.axiosRef.post('http://127.0.0.1:5001/register', form, {
        headers: form.getHeaders(),
      });
  
      console.log('Flask /register response:', response.data);
  
      // If Flask succeeded, try saving to DB
      if (response.data.success) {
        const saved = await this.prisma.faceData.create({
          data: {
            userId,
            uri: `/uploads/faces/${file.originalname}`,
          },
        });
        console.log('Saved in Prisma:', saved);

        await fetch('http://127.0.0.1:5001/reload-faces');
        console.log('Reloaded faces in Flask');

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

    const response = await this.http.axiosRef.post('http://127.0.0.1:5001/recognize', form, {
      headers: form.getHeaders(),
    });

    return response.data;
  }

  async markAttendance(userId: number) {
  try {
    // Get current date and time with timezone adjustment
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localDateTime = new Date(now.getTime() - timezoneOffset);
    
    // Format time to include hours and minutes
    const formattedDateTime = localDateTime.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    });

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { attendances: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if already marked present today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (existingAttendance) {
      return { 
        success: true, 
        message: 'Attendance already marked today',
        attendance: {
          formattedDateTime,
          status: existingAttendance.status, // Display attendance status
        }
      };
    }

    // Create new attendance record
    const attendance = await this.prisma.attendance.create({
      data: {
        userId,
        date: now,
        status: 'present'
      }
    });

    return { 
      success: true, 
      message: 'Attendance marked successfully',
      attendance: {
        formattedDateTime,
        status: attendance.status,  // Show attendance status
      }
    };
  } catch (error) {
    console.error('Error marking attendance:', error);
    throw new Error('Failed to mark attendance');
  }
}

  async getUserById(userId: number) {
  return this.prisma.user.findUnique({
    where: { id: userId }
  });
}
}