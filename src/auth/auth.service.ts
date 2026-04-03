import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private signToken(payload: { accountId: string; app: 'DD'; unifiedUserId?: string | null }) {
    return this.jwt.sign(payload);
  }

  async register(email: string, password: string) {
    const existing = await this.prisma.account.findFirst({
      where: { app: 'DD', email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Account already exists for this email (DD).');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const account = await this.prisma.account.create({
      data: {
        app: 'DD',
        email,
        passwordHash,
        ddProfile: { create: {} },
      },
      select: { id: true, unifiedUserId: true, email: true },
    });

    const token = this.signToken({
      accountId: account.id,
      app: 'DD',
      unifiedUserId: account.unifiedUserId,
    });

    return { token, accountId: account.id, email: account.email };
  }

  async login(email: string, password: string) {
    const account = await this.prisma.account.findFirst({
      where: { app: 'DD', email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        unifiedUserId: true,
        ddProfile: { select: { id: true } },
      },
    });

    if (!account) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const ok = await bcrypt.compare(password, account.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password.');
    }   

    if (!account.ddProfile) {
      await this.prisma.ddProfile.create({ data: { accountId: account.id } });
    }

    const token = this.signToken({
      accountId: account.id,
      app: 'DD',
      unifiedUserId: account.unifiedUserId,
    });

    return { token, accountId: account.id, email: account.email };
  }
}       