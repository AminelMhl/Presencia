import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60m' },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FaceRecognitionModule,
  ],
  controllers: [],
  providers: [JwtStrategy],
})
export class AppModule {}
