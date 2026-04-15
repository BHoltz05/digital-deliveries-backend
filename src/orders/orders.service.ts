import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VALID_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(accountId: string, body: any) {
    const { stores } = body;

    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      throw new BadRequestException('Invalid stores payload');
    }

    return this.prisma.order.create({
      data: {
        accountId,
        storeOrders: {
          create: await Promise.all(
            stores.map(async (store: any) => {
              const storeId = store.storeId;

              if (!store.items || !Array.isArray(store.items) || store.items.length === 0) {
                throw new BadRequestException(`Invalid items payload for store ${storeId}`);
              }

              const items = await Promise.all(
                store.items.map(async (item: any) => {
                  const storeProduct = await this.prisma.storeProduct.findUnique({
                    where: {
                      storeId_productId: {
                        storeId,
                        productId: item.productId,
                      },
                    },
                  });

                  if (!storeProduct) {
                    throw new BadRequestException(
                      `Product ${item.productId} not found in store ${storeId}`,
                    );
                  }

                  if (
                    typeof item.quantity !== 'number' ||
                    !Number.isInteger(item.quantity) ||
                    item.quantity < 1
                  ) {
                    throw new BadRequestException(
                      `Invalid quantity for product ${item.productId}`,
                    );
                  }

                  return {
                    productId: item.productId,
                    quantity: item.quantity,
                    pricePence: storeProduct.pricePence,
                  };
                }),
              );

              return {
                storeId,
                status: 'PENDING',
                items: {
                  create: items,
                },
              };
            }),
          ),
        },
      },
      include: {
        storeOrders: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  async getOrders(accountId: string) {
    return this.prisma.order.findMany({
      where: { accountId },
      include: {
        storeOrders: {
          include: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getOrderById(accountId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        accountId,
      },
      include: {
        storeOrders: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(accountId: string, orderId: string, body: any) {
    const status = body?.status as string | undefined;

    if (!status || !VALID_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(
        `Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`,
      );
    }

    const existingOrder = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        accountId,
      },
      include: {
        storeOrders: true,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    if (!existingOrder.storeOrders.length) {
      throw new NotFoundException('No store orders found for this order');
    }

    await this.prisma.storeOrder.updateMany({
      where: {
        orderId: existingOrder.id,
      },
      data: {
        status,
      },
    });

    return this.prisma.order.findFirst({
      where: {
        id: orderId,
        accountId,
      },
      include: {
        storeOrders: {
          include: {
            items: true,
          },
        },
      },
    });
  }
}