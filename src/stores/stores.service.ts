import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NearbyStoresDto } from './dto/nearby-stores.dto';

const DEMO_POSTCODE_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'HD1 1AA': { latitude: 53.6485, longitude: -1.7821 },
  'HD1 2BB': { latitude: 53.6502, longitude: -1.7798 },
  'HD1 3CC': { latitude: 53.6469, longitude: -1.7849 },
  'LS1 4DD': { latitude: 53.7988, longitude: -1.5491 },
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async getNearbyStores(accountId: string, query: NearbyStoresDto) {
    let userLatitude: number | null = null;
    let userLongitude: number | null = null;
    let resolvedPostcode: string | null = null;

    if (query.latitude && query.longitude) {
      userLatitude = Number(query.latitude);
      userLongitude = Number(query.longitude);
    } else {
      let postcode = query.postcode?.trim().toUpperCase();

      if (!postcode) {
        const profile = await this.prisma.ddProfile.findUnique({
          where: { accountId },
          select: { postcode: true },
        });

        if (!profile?.postcode) {
          throw new NotFoundException(
            'No coordinates provided and no saved profile postcode found',
          );
        }

        postcode = profile.postcode.trim().toUpperCase();
      }

      resolvedPostcode = postcode;

      const coords = DEMO_POSTCODE_COORDS[postcode];

      if (!coords) {
        throw new BadRequestException(
          `No demo coordinates found for postcode ${postcode}`,
        );
      }

      userLatitude = coords.latitude;
      userLongitude = coords.longitude;
    }

    const stores = await this.prisma.store.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const storesWithDistance = stores
      .map((store) => {
        const distanceKm = haversineDistanceKm(
          userLatitude!,
          userLongitude!,
          store.latitude!,
          store.longitude!,
        );

        return {
          ...store,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      searchOrigin: resolvedPostcode
        ? { type: 'postcode', postcode: resolvedPostcode }
        : {
            type: 'coordinates',
            latitude: userLatitude,
            longitude: userLongitude,
          },
      count: storesWithDistance.length,
      stores: storesWithDistance,
    };
  }
}