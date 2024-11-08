import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import {
  CategoryTypes,
  //   CategoryTypes,
  InventoryClass,
  //   InventoryStatus,
  PrismaClient,
} from '@prisma/client';
// import { MESSAGES } from '../src/constants';
import { CreateInventoryDto } from '../src/inventory/dto/create-inventory.dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { RolesAndPermissionsGuard } from '../src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt.guard';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import {
  mockInventoryBatchResponse,
  mockInventoryResponse,
} from '../test/mockData/inventory';
import { MESSAGES } from '../src/constants';

describe('InventoryController (e2e)', () => {
  let app: INestApplication;
  let prisma: DeepMockProxy<PrismaClient>;

  const mockFile = {
    originalname: 'test.png',
    buffer: Buffer.from(''),
    mimetype: 'image/png',
  } as Express.Multer.File;

  const createInventoryDto: CreateInventoryDto = {
    name: 'Test Inventory',
    manufacturerName: 'Test Manufacturer',
    inventoryCategoryId: 'cat123',
    inventorySubCategoryId: 'subcat123',
    numberOfStock: '100',
    price: '100',
    class: InventoryClass.REGULAR,
    inventoryImage: mockFile,
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn(),
  };

  beforeAll(async () => {
    prisma = mockDeep<PrismaClient>();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(CloudinaryService)
      .useValue(mockCloudinaryService)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesAndPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/inventory/create (POST)', () => {
    // it('should create an inventory item successfully', async () => {
    //   prisma.category.findFirst.mockResolvedValue({
    //     id: 'cat123',
    //     name: 'Test Category',
    //     parentId: null,
    //     type: CategoryTypes.INVENTORY,
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //   });

    //   mockCloudinaryService.uploadFile.mockResolvedValue({
    //     secure_url: 'http://example.com/image.png',
    //   });

    //   prisma.inventory.findFirst.mockResolvedValue(null);

    //   prisma.inventory.create.mockResolvedValue({
    //     id: 'inv123',
    //     name: 'Test Item',
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     manufacturerName: 'Test Manufacturer',
    //     inventoryCategoryId: 'cat123',
    //     inventorySubCategoryId: 'subCat123',
    //     deletedAt: null,
    //   });

    //   prisma.inventoryBatch.create.mockResolvedValue({
    //     id: 'inv123',
    //     name: 'Test Item',
    //     createdAt: new Date(),
    //     updatedAt: new Date(),
    //     deletedAt: null,
    //     dateOfManufacture: '2024-01-01',
    //     sku: 'SKU12345',
    //     image: 'http://example.com/image.png',
    //     batchNumber: 123456,
    //     costOfItem: 50,
    //     price: 100,
    //     numberOfStock: 100,
    //     inventoryId: 'inv123',
    //     remainingQuantity: 100,
    //     status: InventoryStatus.IN_STOCK,
    //     class: InventoryClass.REGULAR,
    //   });

    //   const response = await request(app.getHttpServer())
    //     .post('/inventory/create')
    //     .set('Authorization', 'Bearer <token>')
    //     .field('name', createInventoryDto.name)
    //     .field('manufacturerName', createInventoryDto.manufacturerName)
    //     .field('dateOfManufacture', createInventoryDto.dateOfManufacture || '')
    //     .field('sku', createInventoryDto.sku || '')
    //     .field('costOfItem', createInventoryDto.costOfItem || '')
    //     .field('price', createInventoryDto.price)
    //     .field('class', createInventoryDto.class)
    //     .field('numberOfStock', createInventoryDto.numberOfStock)
    //     .field('inventoryCategoryId', createInventoryDto.inventoryCategoryId)
    //     .field(
    //       'inventorySubCategoryId',
    //       createInventoryDto.inventorySubCategoryId,
    //     )
    //     .attach(
    //       'inventoryImage',
    //       Buffer.from('test content'),
    //       'test.png',
    //     );

    //   expect(mockCloudinaryService.uploadFile).toHaveBeenCalled();
    //   expect(response.status).toBe(HttpStatus.CREATED);
    //   expect(response.body).toEqual({
    //     message: MESSAGES.INVENTORY_CREATED,
    //   });
    // });

    it('should return a 400 error when category is invalid', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/inventory/create')
        .set('Authorization', 'Bearer <token>')
        .field('name', createInventoryDto.name)
        .field('manufacturerName', createInventoryDto.manufacturerName)
        .field('dateOfManufacture', createInventoryDto.dateOfManufacture || '')
        .field('sku', createInventoryDto.sku || '')
        .field('costOfItem', createInventoryDto.costOfItem || '')
        .field('price', createInventoryDto.price)
        .field('class', createInventoryDto.class)
        .field('numberOfStock', createInventoryDto.numberOfStock)
        .field('inventoryCategoryId', createInventoryDto.inventoryCategoryId)
        .field(
          'inventorySubCategoryId',
          createInventoryDto.inventorySubCategoryId,
        )
        .attach(
          'inventoryImage',
          createInventoryDto.inventoryImage.buffer,
          'test.png',
        );

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.message).toContain(
        'Invalid inventorySubCategoryId or inventoryCategoryId',
      );
    });
  });

  describe('List users', () => {
    it('/users (GET)', async () => {
      prisma.inventory.findMany.mockResolvedValueOnce(mockInventoryResponse);
      prisma.inventory.count.mockResolvedValueOnce(1);

      const response = await request(app.getHttpServer())
        .get('/inventory?page=1&limit=10')
        .expect(200);

      expect(response.body.inventories.length).toBeGreaterThan(0);
      expect(response.body.total).toBeTruthy();
      expect(response.body.page).toBeTruthy();
      expect(response.body.limit).toBeTruthy();
    });
  });

  describe('Fetch Inventory Batch Details', () => {
    it('/Inventory Batch details (GET)', async () => {
      prisma.inventoryBatch.findUnique.mockResolvedValue(
        mockInventoryBatchResponse,
      );

      const response = await request(app.getHttpServer())
        .get('/inventory/batch/672a7e32493902cd46999f69')
        .expect(200);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveProperty('id');
    });

    it('should throw NotFoundException if Inventory Batch Details does not exist', async () => {
      prisma.inventoryBatch.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/inventory/batch/672a7e32493902cd46999f69')
        .expect(404);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toContain(MESSAGES.BATCH_NOT_FOUND);
    });
  });

  describe('Create Inventory Category (e2e)', () => {
    it('should create a new inventory category with subcategories', async () => {
      const createCategoryDto = {
        categories: [
          {
            name: 'Electronics',
            parentId: null,
            subCategories: [{ name: 'Battery Charger' }],
          },
        ],
      };

      prisma.category.findUnique.mockResolvedValueOnce(null);
      prisma.category.create.mockResolvedValueOnce({
        id: 'cat123',
        parentId: null,
        type: CategoryTypes.INVENTORY,
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/inventory/category/create')
        .send(createCategoryDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.message).toBe(MESSAGES.CREATED);
    });

    it('should return an error when parentId is invalid', async () => {
      const createCategoryDto = {
        categories: [
          {
            name: 'Invalid Category',
            parentId: 'nonexistent-id',
            subCategories: [],
          },
        ],
      };
      prisma.category.findUnique.mockResolvedValueOnce(null);
      prisma.category.findFirst.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .post('/inventory/category/create')
        .send(createCategoryDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Invalid Parent Id');
    });
  });

  describe('Fetch Inventory Tabs', () => {
    it('/Inventory Batch Tabs (GET)', async () => {
      prisma.inventoryBatch.findUnique.mockResolvedValue(
        mockInventoryBatchResponse,
      );

      const response = await request(app.getHttpServer())
        .get('/inventory/672a7e32493902cd46999f69/tabs')
        .expect(200);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.length).toBeGreaterThan(1);
    });

    it('should throw NotFoundException if Inventory Batch ID is not found', async () => {
      prisma.inventoryBatch.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/inventory/672a7e32493902cd46999f69/tabs')
        .expect(404);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body.message).toContain(MESSAGES.BATCH_NOT_FOUND);
    });
  });
});
