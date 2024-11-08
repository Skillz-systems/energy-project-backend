import {
  PrismaClient,
  SubjectEnum,
  ActionEnum,
  InventoryStatus,
  InventoryClass,
} from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Upsert Roles and Permissions
  // const adminRole = await prisma.role.upsert({
  //   where: { role: 'admin' },
  //   update: {},
  //   create: {
  //     role: 'admin',
  //     permissions: {
  //       create: [
  //         {
  //           action: ActionEnum.manage,
  //           subject: SubjectEnum.all,
  //         },
  //       ],
  //     },
  //   },
  // });

  // const customerRole = await prisma.role.upsert({
  //   where: { role: 'customer' },
  //   update: {},
  //   create: {
  //     role: 'customer',
  //     permissions: {
  //       create: [
  //         {
  //           action: ActionEnum.manage,
  //           subject: SubjectEnum.User,
  //         },
  //       ],
  //     },
  //   },
  // });

  // console.log({ adminRole, customerRole });

  // Seed Category

  await prisma.category.deleteMany();

  
  await prisma.category.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      name: faker.commerce.department(),
      type: faker.helpers.arrayElement(['INVENTORY', 'PRODUCT']),
    })),
  });

  const insertedInventoryCategories = await prisma.category.findMany();
  const inventoryCategoryIds = insertedInventoryCategories.map(
    (category) => category.id,
  );

  // Seed Inventories
  await prisma.inventory.deleteMany();
  await prisma.inventory.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      name: faker.commerce.productName(),
      manufacturerName: faker.person.fullName(),
      inventoryCategoryId: faker.helpers.arrayElement(inventoryCategoryIds),
      inventorySubCategoryId: faker.helpers.arrayElement(inventoryCategoryIds),
    })),
  });

  const adminRole = await prisma.role.upsert({
    where: { role: 'admin' },
    update: {},
    create: {
      role: 'admin',
      permissions: {
        create: [
          {
            action: ActionEnum.manage,
            subject: SubjectEnum.all,
          },
        ],
      },
    },
  });

  // Seed Users
  await prisma.user.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      firstname: faker.person.firstName(),
      lastname: faker.person.lastName(),
      username: faker.internet.username(),
      password: faker.internet.password(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      location: faker.location.city(),
      roleId: adminRole.id,
    })),
  });

  // Retrieve inserted users
  const users = await prisma.user.findMany();
  const userIds = users.map((user) => user.id);

  // Seed Agents
  await prisma.agent.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      email: faker.internet.email(),
      password: faker.internet.password(),
    })),
  });

  // Retrieve inserted agents
  const agents = await prisma.agent.findMany();
  const agentIds = agents.map((agent) => agent.id);

  // Seed Customers
  await prisma.customer.deleteMany();
  await prisma.customer.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      fullname: faker.person.fullName(),
      longitude: faker.location.longitude(),
      latitude: faker.location.latitude(),
      location: faker.location.streetAddress(),
      createdBy: faker.helpers.arrayElement(['user', 'agent']),
      createdByUserId: faker.helpers.arrayElement(userIds),
      createdByAgentId: faker.helpers.arrayElement(agentIds),
    })),
  });

  // Seed InventoryBatches
  await prisma.inventoryBatch.deleteMany();
  await prisma.inventoryBatch.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      name: faker.commerce.productName(),
      dateOfManufacture: faker.date.past().toISOString().split('T')[0], // Format as YYYY-MM-DD
      sku: '813h3b89b9u2',
      image: faker.image.url(),
      batchNumber: Math.floor(10000000 + Math.random() * 90000000), // Random batch number
      costOfItem: parseFloat(faker.commerce.price()), // Random cost of item
      price: parseFloat(faker.commerce.price()), // Random price
      numberOfStock: faker.number.int({ min: 1, max: 100 }), // Random stock number
      remainingQuantity: faker.number.int({ min: 1, max: 100 }), // Random remaining quantity
      status: InventoryStatus.IN_STOCK, // Default status
      class: InventoryClass.REFURBISHED, // Set according to your class enum or data
      inventoryId: faker.helpers.arrayElement(inventoryCategoryIds), // Set the inventory ID
    })),
  });

  console.log('Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
