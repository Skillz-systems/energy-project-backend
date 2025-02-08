"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const faker_1 = require("@faker-js/faker");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.category.deleteMany();
    await prisma.category.createMany({
        data: Array.from({ length: 10 }).map(() => ({
            name: faker_1.faker.commerce.department(),
            type: faker_1.faker.helpers.arrayElement(['INVENTORY', 'PRODUCT']),
        })),
    });
    const insertedInventoryCategories = await prisma.category.findMany();
    const inventoryCategoryIds = insertedInventoryCategories.map((category) => category.id);
    await prisma.inventory.deleteMany();
    await prisma.inventory.createMany({
        data: Array.from({ length: 10 }).map(() => ({
            name: faker_1.faker.commerce.productName(),
            manufacturerName: faker_1.faker.person.fullName(),
            inventoryCategoryId: faker_1.faker.helpers.arrayElement(inventoryCategoryIds),
            inventorySubCategoryId: faker_1.faker.helpers.arrayElement(inventoryCategoryIds),
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
                        action: client_1.ActionEnum.manage,
                        subject: client_1.SubjectEnum.all,
                    },
                ],
            },
        },
    });
    await prisma.user.createMany({
        data: Array.from({ length: 10 }).map(() => ({
            firstname: faker_1.faker.person.firstName(),
            lastname: faker_1.faker.person.lastName(),
            username: faker_1.faker.internet.username(),
            password: faker_1.faker.internet.password(),
            email: faker_1.faker.internet.email(),
            phone: faker_1.faker.phone.number(),
            location: faker_1.faker.location.city(),
            roleId: adminRole.id,
        })),
    });
    const users = await prisma.user.findMany();
    const userIds = users.map((user) => user.id);
    await prisma.agent.createMany({
        data: Array.from({ length: 10 }).map(() => ({
            userId: faker_1.faker.helpers.arrayElement(userIds),
        })),
    });
    const agents = await prisma.agent.findMany();
    const agentIds = agents.map((agent) => agent.id);
    await prisma.customer.deleteMany();
    await prisma.customer.createMany({
        data: Array.from({ length: 10 }).map(() => ({
            createdBy: faker_1.faker.helpers.arrayElement(['user', 'agent']),
            creatorId: faker_1.faker.helpers.arrayElement(userIds),
            userId: faker_1.faker.helpers.arrayElement(userIds),
            agentId: faker_1.faker.helpers.arrayElement(agentIds),
            type: 'lead',
        })),
    });
    await prisma.inventoryBatch.deleteMany();
    await prisma.inventoryBatch.createMany({
        data: Array.from({ length: 10 }).map(() => ({
            name: faker_1.faker.commerce.productName(),
            dateOfManufacture: faker_1.faker.date.past().toISOString().split('T')[0],
            sku: '813h3b89b9u2',
            image: faker_1.faker.image.url(),
            batchNumber: Math.floor(10000000 + Math.random() * 90000000),
            costOfItem: parseFloat(faker_1.faker.commerce.price()),
            price: parseFloat(faker_1.faker.commerce.price()),
            numberOfStock: faker_1.faker.number.int({ min: 1, max: 100 }),
            remainingQuantity: faker_1.faker.number.int({ min: 1, max: 100 }),
            status: client_1.InventoryStatus.IN_STOCK,
            class: client_1.InventoryClass.REFURBISHED,
            inventoryId: faker_1.faker.helpers.arrayElement(inventoryCategoryIds),
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
//# sourceMappingURL=seed.js.map