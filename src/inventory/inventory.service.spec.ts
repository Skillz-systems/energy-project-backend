import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CategoryTypes,
  InventoryClass,
  InventoryStatus,
  PrismaClient,
} from '@prisma/client';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MESSAGES } from '../constants';
import { FetchInventoryQueryDto } from './dto/fetch-inventory.dto';
import {
  mockInventoryBatchResponse,
  mockInventoryResponse,
} from '../../test/mockData/inventory';

describe('InventoryService', () => {
  let service: InventoryService;

  let mockPrismaService: DeepMockProxy<PrismaClient>;

  const mockCloudinaryService = {
    uploadFile: jest.fn().mockResolvedValue({
      secure_url: 'http://example.com/image.png',
    }),
  };

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

  beforeEach(async () => {
    mockPrismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInventory', () => {
    it('should create an inventory item successfully', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat123',
        name: 'Test Category',
        parentId: 'parentCat123',
        type: CategoryTypes.INVENTORY,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.inventory.findFirst.mockResolvedValue(null);

      mockPrismaService.inventory.create.mockResolvedValue({
        id: 'inv123',
        name: 'Test Item',
        createdAt: new Date(),
        updatedAt: new Date(),
        manufacturerName: 'Test Manufacturer',
        inventoryCategoryId: 'cat123',
        inventorySubCategoryId: 'subcat123',
        deletedAt: null,
      });

      mockPrismaService.inventoryBatch.create.mockResolvedValue({
        id: 'inv123',
        name: 'Test Item',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        dateOfManufacture: '2024-01-01',
        sku: 'SKU12345',
        image: 'http://example.com/image.png',
        batchNumber: 123456,
        costOfItem: 50,
        price: 100,
        numberOfStock: 100,
        inventoryId: 'inv123',
        remainingQuantity: 100,
        status: InventoryStatus.IN_STOCK,
        class: InventoryClass.REGULAR,
      });

      const result = await service.createInventory(
        createInventoryDto,
        mockFile,
      );

      const mockResult = {
        message: MESSAGES.INVENTORY_CREATED,
      };

      expect(result).toEqual(mockResult);
      expect(mockCloudinaryService.uploadFile).toHaveBeenCalled();
      expect(mockPrismaService.inventory.create).toHaveBeenCalled();
      expect(mockPrismaService.inventoryBatch.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when category is invalid', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(
        service.createInventory(createInventoryDto, {} as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Get Inventories', () => {
    it('should return paginated users', async () => {
      mockPrismaService.inventory.findMany.mockResolvedValueOnce(
        mockInventoryResponse,
      );
      mockPrismaService.inventory.count.mockResolvedValueOnce(1);

      const paginatedInventory = {
        inventories: mockInventoryResponse,
        total: 1,
        page: '1',
        limit: '10',
        totalPages: 1,
      };

      const query: FetchInventoryQueryDto = { page: '1', limit: '10' };

      const result = await service.getInventories(query);
      expect(result).toEqual(paginatedInventory);
      expect(mockPrismaService.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('Fetch Inventory Batch Details', () => {
    it('should return an Inventory Batch Details', async () => {
      mockPrismaService.inventoryBatch.findUnique.mockResolvedValue(
        mockInventoryBatchResponse,
      );

      const result = await service.fetchInventoryBatchDetails(
        mockInventoryBatchResponse.id,
      );

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.inventoryBatch.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException if Inventory Batch Details does not exist', async () => {
      mockPrismaService.inventoryBatch.findUnique.mockResolvedValue(null);

      await expect(
        service.fetchInventoryBatchDetails('nonexistent-id'),
      ).rejects.toThrow(new NotFoundException(MESSAGES.BATCH_NOT_FOUND));
    });
  });

  describe('createInventoryCategory', () => {
    it('should create a new category when no conflicts exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValueOnce(null);

      mockPrismaService.category.findFirst.mockResolvedValueOnce({
        id: 'cat123',
        parentId: null,
        type: CategoryTypes.INVENTORY,
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.category.create.mockResolvedValueOnce({
        id: 'cat123',
        parentId: null,
        type: CategoryTypes.INVENTORY,
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const categories = [
        {
          name: 'Electronics',
          parentId: 'valid-parent-id',
          subCategories: [{ name: 'Battery Charger' }],
        },
      ];

      const result = await service.createInventoryCategory(categories);

      expect(result.message).toBe(MESSAGES.CREATED);
      expect(mockPrismaService.category.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if parentId is invalid', async () => {
      mockPrismaService.category.findFirst.mockResolvedValueOnce(null);
      mockPrismaService.category.findFirst.mockRejectedValue(null);
      const categories = [
        {
          name: 'Invalid Category',
          parentId: 'nonexistent-id',
          subCategories: [],
        },
      ];

      await expect(service.createInventoryCategory(categories)).rejects.toThrow(
        new BadRequestException('Invalid Parent Id'),
      );
    });
  });

  describe('Fetch Inventory Tabs', () => {
    it('should return an Inventory Batch Tabs if ID valid', async () => {
      mockPrismaService.inventoryBatch.findUnique.mockResolvedValue(
        mockInventoryBatchResponse,
      );

      const result = await service.getInventoryTabs(
        mockInventoryBatchResponse.id,
      );

      expect(result.length).toBeGreaterThan(1);
      expect(mockPrismaService.inventoryBatch.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException if Inventory Batch ID is not found', async () => {
      mockPrismaService.inventoryBatch.findUnique.mockResolvedValue(null);

      await expect(service.getInventoryTabs('nonexistent-id')).rejects.toThrow(
        new NotFoundException(MESSAGES.BATCH_NOT_FOUND),
      );
    });
  });
});
