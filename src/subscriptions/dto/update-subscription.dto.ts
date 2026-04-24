import { IsIn } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsIn(['BRONZE', 'SILVER', 'GOLD'])
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
}