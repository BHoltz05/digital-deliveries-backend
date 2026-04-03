import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [StoresController],
  providers: [StoresService],
})
export class StoresModule {}