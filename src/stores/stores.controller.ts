import {
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StoresService } from './stores.service';
import { NearbyStoresDto } from './dto/nearby-stores.dto';

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('nearby')
  async getNearbyStores(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: NearbyStoresDto,
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

    return this.storesService.getNearbyStores(payload.accountId, query);
  }
}