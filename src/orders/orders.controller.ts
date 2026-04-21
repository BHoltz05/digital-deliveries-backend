import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Headers,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
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

  @Post()
  async createOrder(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: any,
  ) {
    const payload = await this.validateToken(authorization);
    return this.ordersService.createOrder(payload.accountId, body);
  }

  @Get()
  async getOrders(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const payload = await this.validateToken(authorization);
    return this.ordersService.getOrders(payload.accountId);
  }

  @Get('driver/active')
  async getDriverActiveOrders(
    @Headers('authorization') authorization: string | undefined,
  ) {
    await this.validateToken(authorization);
    return this.ordersService.getDriverActiveOrders();
  }

  @Post('from-recipescout/preview')
  async previewFromRecipeScout(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: any,
  ) {
    await this.validateToken(authorization);
    return this.ordersService.previewFromRecipeScout(body);
  }

  @Post('from-recipescout/create')
  async createFromRecipeScout(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: any,
  ) {
    const payload = await this.validateToken(authorization);
    return this.ordersService.createFromRecipeScout(payload.accountId, body);
  }

  @Get(':id')
  async getOrderById(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') orderId: string,
  ) {
    const payload = await this.validateToken(authorization);
    return this.ordersService.getOrderById(payload.accountId, orderId);
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') orderId: string,
    @Body() body: any,
  ) {
    const payload = await this.validateToken(authorization);
    return this.ordersService.updateOrderStatus(payload.accountId, orderId, body);
  }
}