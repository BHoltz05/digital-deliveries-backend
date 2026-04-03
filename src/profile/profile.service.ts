import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateLocation(accountId: string, dto: UpdateLocationDto) {
    const postcode = dto.postcode?.trim().toUpperCase();

    const profile = await this.prisma.ddProfile.upsert({
      where: {
        accountId,
      },
      update: {
        postcode,
      },
      create: {
        accountId,
        postcode,
      },
    });

    return {
      message: 'Profile location updated successfully',
      profile,
    };
  }

  async getMe(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        email: true,
        app: true,
        ddProfile: {
          select: {
            id: true,
            postcode: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return account;
  }
}