import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.storeProduct.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();

  await prisma.store.createMany({
    data: [
      {
        name: 'Tesco Huddersfield',
        address: '1 New Street',
        city: 'Huddersfield',
        postcode: 'HD1 1AA',
        latitude: 53.6485,
        longitude: -1.7821,
      },
      {
        name: 'Asda Huddersfield',
        address: '2 Leeds Road',
        city: 'Huddersfield',
        postcode: 'HD1 2BB',
        latitude: 53.6502,
        longitude: -1.7798,
      },
      {
        name: 'Aldi Huddersfield',
        address: '3 Wakefield Road',
        city: 'Huddersfield',
        postcode: 'HD1 3CC',
        latitude: 53.6469,
        longitude: -1.7849,
      },
      {
        name: 'Morrisons Leeds',
        address: '4 City Square',
        city: 'Leeds',
        postcode: 'LS1 4DD',
        latitude: 53.7988,
        longitude: -1.5491,
      },
    ],
  });

  const milk = await prisma.product.create({
    data: { name: 'Semi-skimmed Milk', brand: 'DairyCo', unit: '1L' },
  });

  const bread = await prisma.product.create({
    data: { name: 'White Bread', brand: 'BakeHouse', unit: '800g' },
  });

  const eggs = await prisma.product.create({
    data: { name: 'Eggs', brand: 'FarmFresh', unit: '12 pack' },
  });

  const apples = await prisma.product.create({
    data: { name: 'Apples', brand: 'FreshPick', unit: '6 pack' },
  });

  const allStores = await prisma.store.findMany({
    select: { id: true, name: true },
  });

  const s = (name: string) => allStores.find((x) => x.name === name)!.id;

  await prisma.storeProduct.createMany({
    data: [
      { storeId: s('Tesco Huddersfield'), productId: milk.id, pricePence: 125, inStock: true },
      { storeId: s('Tesco Huddersfield'), productId: bread.id, pricePence: 110, inStock: true },
      { storeId: s('Tesco Huddersfield'), productId: eggs.id, pricePence: 240, inStock: true },

      { storeId: s('Asda Huddersfield'), productId: apples.id, pricePence: 199, inStock: true },
      { storeId: s('Asda Huddersfield'), productId: milk.id, pricePence: 135, inStock: true },

      { storeId: s('Aldi Huddersfield'), productId: milk.id, pricePence: 105, inStock: true },
      { storeId: s('Aldi Huddersfield'), productId: bread.id, pricePence: 95, inStock: true },
      { storeId: s('Aldi Huddersfield'), productId: eggs.id, pricePence: 220, inStock: false },

      { storeId: s('Morrisons Leeds'), productId: apples.id, pricePence: 210, inStock: true },
      { storeId: s('Morrisons Leeds'), productId: bread.id, pricePence: 120, inStock: true },
    ],
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });