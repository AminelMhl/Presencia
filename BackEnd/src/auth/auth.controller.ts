import { Controller, Get, Post, Body, Req, UseGuards, Query, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthdtoSignIn, AuthdtoSignUp, AuthdtoChangePass } from './dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly jwtService: JwtService, private readonly configService: ConfigService) { }

  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({ status: 201, description: 'User successfully signed up.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async signUp(@Body() dto: AuthdtoSignUp) {
    return this.authService.SignUp(dto);
  }

  @Post('signin')
  @ApiOperation({ summary: 'Sign in a user' })
  @ApiResponse({ status: 200, description: 'User successfully signed in.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async signIn(@Body() dto: AuthdtoSignIn) {
    return this.authService.SignIn(dto);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password successfully changed.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async changePassword(@Body() dto: AuthdtoChangePass, @Req() req) {
    const userId = req.user.userId; // Get the user ID from the request
    return this.authService.changePassword(userId, dto);
  }

  @Post('refresh-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate Token' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async refreshToken(@Body() refreshToken: RefreshTokenDto) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('verify')
  @ApiExcludeEndpoint()
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}