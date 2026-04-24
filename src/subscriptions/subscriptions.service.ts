import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMySubscription(accountId: string) {
    const subscription = await this.prisma.ddSubscription.findUnique({
      where: { accountId },
    });

    return {
      subscription,
    };
  }

  async updateMySubscription(accountId: string, dto: UpdateSubscriptionDto) {
    const renewsAt = new Date();
    renewsAt.setDate(renewsAt.getDate() + 30);

    const subscription = await this.prisma.ddSubscription.upsert({
      where: { accountId },
      update: {
        tier: dto.tier,
        active: true,
        renewsAt,
      },
      create: {
        accountId,
        tier: dto.tier,
        active: true,
        renewsAt,
      },
    });

    return {
      message: 'Subscription updated',
      subscription,
    };
  }
}