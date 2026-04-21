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

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED'],
  CONFIRMED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(accountId: string, body: any) {
    const { stores } = body;

    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      throw new BadRequestException('Invalid stores payload');
    }

    const createdOrder = await this.prisma.order.create({
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
    });

    return this.getOrderById(accountId, createdOrder.id);
  }

  async getOrders(accountId: string) {
    const orders = await this.prisma.order.findMany({
      where: { accountId },
      include: {
        storeOrders: {
          include: {
            store: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.mapOrderResponse(order));
  }

  async getDriverActiveOrders() {
    const orders = await this.prisma.order.findMany({
      where: {
        storeOrders: {
          some: {
            status: {
              not: 'DELIVERED',
            },
          },
        },
      },
      include: {
        storeOrders: {
          where: {
            status: {
              not: 'DELIVERED',
            },
          },
          include: {
            store: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.mapOrderResponse(order));
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
            store: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrderResponse(order);
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

    const currentStatuses = [
      ...new Set(existingOrder.storeOrders.map((storeOrder) => storeOrder.status)),
    ];

    if (currentStatuses.length !== 1) {
      throw new BadRequestException(
        'Order has mixed store order statuses and cannot be updated together',
      );
    }

    const currentStatus = currentStatuses[0] as OrderStatus;
    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];

    if (!allowedNextStatuses.includes(status as OrderStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${status}`,
      );
    }

    await this.prisma.storeOrder.updateMany({
      where: {
        orderId: existingOrder.id,
      },
      data: {
        status,
      },
    });

    return this.getOrderById(accountId, orderId);
  }

  async previewFromRecipeScout(body: any) {
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Invalid items payload');
    }

    const matched: any[] = [];
    const unmatched: any[] = [];

    for (const item of items) {
      const rawName = item.name;
      const name = rawName?.trim();

      if (!name) {
        unmatched.push({ requestedName: rawName });
        continue;
      }

      const quantity =
        typeof item.quantity === 'number' && Number.isInteger(item.quantity) && item.quantity > 0
          ? item.quantity
          : 1;

      const product = await this.prisma.product.findFirst({
        where: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      });

      if (!product) {
        unmatched.push({ requestedName: rawName });
        continue;
      }

      const storeProducts = await this.prisma.storeProduct.findMany({
        where: {
          productId: product.id,
          inStock: true,
        },
        include: {
          store: true,
        },
        orderBy: {
          pricePence: 'asc',
        },
      });

      if (!storeProducts.length) {
        unmatched.push({ requestedName: rawName });
        continue;
      }

      matched.push({
        requestedName: rawName,
        productId: product.id,
        productName: product.name,
        quantity,
        availableAt: storeProducts.map((sp) => ({
          storeId: sp.storeId,
          storeName: sp.store.name,
          pricePence: sp.pricePence,
        })),
      });
    }

    return {
      matched,
      unmatched,
      countMatched: matched.length,
      countUnmatched: unmatched.length,
    };
  }

  async createFromRecipeScout(accountId: string, body: any) {
    const preview = await this.previewFromRecipeScout(body);

    if (!preview.matched.length) {
      throw new BadRequestException('No matched items found to create an order');
    }

    const groupedByStore = new Map<
      string,
      {
        storeId: string;
        items: Array<{
          productId: string;
          quantity: number;
        }>;
      }
    >();

    for (const matchedItem of preview.matched) {
      const cheapestStore = [...matchedItem.availableAt].sort(
        (a, b) => a.pricePence - b.pricePence,
      )[0];

      if (!groupedByStore.has(cheapestStore.storeId)) {
        groupedByStore.set(cheapestStore.storeId, {
          storeId: cheapestStore.storeId,
          items: [],
        });
      }

      groupedByStore.get(cheapestStore.storeId)!.items.push({
        productId: matchedItem.productId,
        quantity: matchedItem.quantity,
      });
    }

    const stores = Array.from(groupedByStore.values());
    const createdOrder = await this.createOrder(accountId, { stores });

    return {
      createdOrder,
      unmatched: preview.unmatched,
      countMatched: preview.countMatched,
      countUnmatched: preview.countUnmatched,
    };
  }

  private mapOrderResponse(order: any) {
    return {
      id: order.id,
      accountId: order.accountId,
      createdAt: order.createdAt,
      storeOrders: order.storeOrders.map((storeOrder: any) => ({
        id: storeOrder.id,
        orderId: storeOrder.orderId,
        storeId: storeOrder.storeId,
        storeName: storeOrder.store?.name ?? null,
        status: storeOrder.status,
        createdAt: storeOrder.createdAt,
        items: storeOrder.items.map((item: any) => ({
          id: item.id,
          storeOrderId: item.storeOrderId,
          productId: item.productId,
          productName: item.product?.name ?? null,
          brand: item.product?.brand ?? null,
          unit: item.product?.unit ?? null,
          quantity: item.quantity,
          pricePence: item.pricePence,
        })),
      })),
    };
  }
}