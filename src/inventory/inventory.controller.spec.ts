import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { InventoryClass, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { MESSAGES } from '../constants';
import { FetchInventoryQueryDto } from './dto/fetch-inventory.dto';
import {
  mockInventoryBatchResponse,
  mockInventoryResponse,
} from '../../test/mockData/inventory';
import { CreateCategoryArrayDto } from './dto/create-category.dto';

describe('InventoryController', () => {
  let controller: InventoryController;
  let inventoryService: InventoryService;
  let mockPrismaService: DeepMockProxy<PrismaClient>;

  const mockInventoryService = {
    createInventory: jest.fn(),
    getInventories: jest.fn(),
    fetchInventoryBatchDetails: jest.fn(),
    createInventoryCategory: jest.fn(),
    getInventoryTabs: jest.fn(),
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
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    inventoryService = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Create Inventory', () => {
    it('should create inventory', async () => {
      const mockResult = {
        message: MESSAGES.INVENTORY_CREATED,
      };

      mockInventoryService.createInventory.mockResolvedValue(mockResult);

      const result = await controller.create(createInventoryDto, mockFile);

      expect(inventoryService.createInventory).toHaveBeenCalledWith(
        createInventoryDto,
        mockFile,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw a BadRequestException when inventory category is invalid', async () => {
      mockInventoryService.createInventory.mockRejectedValue(
        new BadRequestException(
          'Invalid inventorySubCategoryId or inventoryCategoryId',
        ),
      );

      await expect(
        controller.create(createInventoryDto, mockFile),
      ).rejects.toThrow(BadRequestException);

      expect(inventoryService.createInventory).toHaveBeenCalledWith(
        createInventoryDto,
        mockFile,
      );
    });
  });

  describe('Get Inventories', () => {
    it('should return a list of paginated inventories', async () => {
      const query: FetchInventoryQueryDto = { page: '1', limit: '10' };
      mockInventoryService.getInventories.mockResolvedValueOnce(
        mockInventoryResponse,
      );

      const result = await controller.getInventories(query);
      expect(result).toBeTruthy();
      // expect(result.inventories.length).toBeGreaterThan(0);
      expect(mockInventoryService.getInventories).toHaveBeenCalledWith(query);
    });
  });

  describe('Fetch Inventory Batch Details', () => {
    it('should return an inventory Batch details if found', async () => {
      mockInventoryService.fetchInventoryBatchDetails.mockResolvedValueOnce(
        mockInventoryBatchResponse,
      );

      const result = await controller.getInventoryBatchDetails(
        mockInventoryBatchResponse.id,
      );
      expect(result).toHaveProperty('id');
      expect(
        mockInventoryService.fetchInventoryBatchDetails,
      ).toHaveBeenCalledWith(mockInventoryBatchResponse.id);
    });

    it('should throw NotFoundException if inventory Batch details is not found', async () => {
      mockInventoryService.fetchInventoryBatchDetails.mockRejectedValueOnce(
        new NotFoundException(MESSAGES.BATCH_NOT_FOUND),
      );

      await expect(
        controller.getInventoryBatchDetails('nonexistent-id'),
      ).rejects.toThrow(new NotFoundException(MESSAGES.BATCH_NOT_FOUND));
      expect(
        mockInventoryService.fetchInventoryBatchDetails,
      ).toHaveBeenCalledWith('nonexistent-id');
    });
  });

  describe('createInventoryCategory', () => {
    it('should create categories successfully', async () => {
      const createCategoryDto: CreateCategoryArrayDto = {
        categories: [
          {
            name: 'Electronics',
            parentId: null,
            subCategories: [{ name: 'Battery Charger' }],
          },
        ],
      };

      mockInventoryService.createInventoryCategory.mockResolvedValueOnce({
        message: MESSAGES.CREATED,
      });

      const result =
        await controller.createInventoryCategory(createCategoryDto);

      expect(result.message).toBe(MESSAGES.CREATED);
      expect(mockInventoryService.createInventoryCategory).toHaveBeenCalledWith(
        createCategoryDto.categories,
      );
    });

    it('should throw BadRequestException when parentId is invalid', async () => {
      const createCategoryDto: CreateCategoryArrayDto = {
        categories: [
          {
            name: 'Invalid Category',
            parentId: 'nonexistent-id',
            subCategories: [],
          },
        ],
      };

      mockInventoryService.createInventoryCategory.mockRejectedValueOnce(
        new BadRequestException('Invalid Parent Id'),
      );

      await expect(
        controller.createInventoryCategory(createCategoryDto),
      ).rejects.toThrow(new BadRequestException('Invalid Parent Id'));

      expect(mockInventoryService.createInventoryCategory).toHaveBeenCalledWith(
        createCategoryDto.categories,
      );
    });
  });

  describe('Fetch Inventory Tabs', () => {
    it('should return an inventory Batch Tabs if ID valid', async () => {
      mockInventoryService.getInventoryTabs.mockResolvedValueOnce([
        {
          name: 'Details',
          url: '/inventory/batch/672a7ded6e6ef96f18f3646c',
        },
        {
          name: 'History',
          url: '/inventory/672a7ded6e6ef96f18f3646c/history',
        },
        {
          name: 'Stats',
          url: '/inventory/672a7ded6e6ef96f18f3646c/stats',
        },
      ]);

      const result = await controller.getInventoryTabs(
        mockInventoryBatchResponse.id,
      );

      expect(result.length).toBeGreaterThan(1);
      expect(
        mockInventoryService.getInventoryTabs,
      ).toHaveBeenCalledWith(mockInventoryBatchResponse.id);
    });

    it('should throw NotFoundException if inventory Batch ID is not found', async () => {
      mockInventoryService.getInventoryTabs.mockRejectedValueOnce(
        new NotFoundException(MESSAGES.BATCH_NOT_FOUND),
      );

      await expect(
        controller.getInventoryTabs('nonexistent-id'),
      ).rejects.toThrow(new NotFoundException(MESSAGES.BATCH_NOT_FOUND));
      expect(mockInventoryService.getInventoryTabs).toHaveBeenCalledWith(
        'nonexistent-id',
      );
    });
  });
});
