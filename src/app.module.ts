import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoresModule } from './stores/stores.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [PrismaModule, AuthModule, StoresModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}