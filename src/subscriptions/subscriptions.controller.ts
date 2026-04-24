import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionsService } from './subscriptions.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
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

  @Get('me')
  async getMySubscription(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const payload = await this.validateToken(authorization);
    return this.subscriptionsService.getMySubscription(payload.accountId);
  }

  @Patch('me')
  async updateMySubscription(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    const payload = await this.validateToken(authorization);
    return this.subscriptionsService.updateMySubscription(payload.accountId, dto);
  }
}