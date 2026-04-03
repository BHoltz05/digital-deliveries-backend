import {
  Body,
  Controller,
  Patch,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ProfileService } from './profile.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly jwtService: JwtService,
  ) {}

  @Patch('location')
  async updateLocation(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateLocationDto,
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authorization.replace('Bearer ', '').trim();

    let payload: any;

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return this.profileService.updateLocation(payload.accountId, dto);
  }

  @Get('me')
  async getMe(
    @Headers('authorization') authorization: string | undefined,
  ) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authorization.replace('Bearer ', '').trim();

    let payload: any;

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return this.profileService.getMe(payload.accountId);
  }
}