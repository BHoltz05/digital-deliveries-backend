import {
  Controller,
  Get,
  Headers,
  Query,
  Param,
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

  private async validateToken(authorization: string | undefined) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authorization.replace('Bearer ', '').trim();

    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Get('nearby')
  async getNearbyStores(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: NearbyStoresDto,
  ) {
    const payload = await this.validateToken(authorization);
    return this.storesService.getNearbyStores(payload.accountId, query);
  }

  // 🔥 NEW ENDPOINT
  @Get(':id/products')
  async getStoreProducts(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') storeId: string,
  ) {
    await this.validateToken(authorization);
    return this.storesService.getStoreProducts(storeId);
  }
}