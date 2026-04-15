import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}