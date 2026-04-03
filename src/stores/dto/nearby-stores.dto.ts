import { IsNumberString, IsOptional, IsString, Matches } from 'class-validator';

export class NearbyStoresDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, {
    message: 'postcode must be a valid UK postcode',
  })
  postcode?: string;

  @IsOptional()
  @IsNumberString()
  latitude?: string;

  @IsOptional()
  @IsNumberString()
  longitude?: string;
}