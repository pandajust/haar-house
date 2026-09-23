import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * 种子脚本：创建默认店铺 + 管理员账号。
 * 幂等：已存在则跳过。
 *
 * 运行：npx ts-node prisma/seed.ts
 */
async function main() {
  // 默认店铺
  const shopName = '默认理发店';
  let shop = await prisma.shop.findFirst({ where: { name: shopName } });
  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        name: shopName,
        phone: '000-00000000',
        address: '默认地址',
        businessHours: [
          { weekday: 1, start: '09:00', end: '21:00' },
          { weekday: 2, start: '09:00', end: '21:00' },
          { weekday: 3, start: '09:00', end: '21:00' },
          { weekday: 4, start: '09:00', end: '21:00' },
          { weekday: 5, start: '09:00', end: '21:00' },
          { weekday: 6, start: '09:00', end: '21:00' },
          { weekday: 0, start: '10:00', end: '20:00' },
        ],
      },
    });
    console.log(`[seed] 已创建店铺: ${shop.name} (${shop.id})`);
  } else {
    console.log(`[seed] 店铺已存在: ${shop.name}`);
  }

  // 默认管理员
  const username = 'admin';
  const existing = await prisma.staff.findUnique({ where: { username } });
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const staff = await prisma.staff.create({
      data: {
        shopId: shop.id,
        name: '店主',
        phone: '13800000000',
        username,
        passwordHash,
        role: 'owner',
      },
    });
    console.log(`[seed] 已创建管理员: ${username} / admin123 (${staff.id})`);
  } else {
    console.log(`[seed] 管理员已存在: ${username}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });