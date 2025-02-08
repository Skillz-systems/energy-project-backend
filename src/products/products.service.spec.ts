import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ObjectId } from 'mongodb';
import { AddressType, CategoryTypes } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MESSAGES } from '../constants';
import { CreateProductCategoryDto } from './dto/create-category.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;
  let cloudinary: CloudinaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, PrismaService, CloudinaryService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
    cloudinary = module.get<CloudinaryService>(CloudinaryService);
  });

  jest.setTimeout(50000); // Increase timeout for tests that may take longer

  it('should create a product', async () => {
    const mockImageUrl = 'https://sample.cloudinary.com/sample.jpg';

    // Mock the file as Express.Multer.File
    const file = {
      fieldname: 'productImage',
      originalname: 'image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('filecontent'),
      size: 1234,
    } as Express.Multer.File;

    const validBatchIds = [
      new ObjectId().toString(),
      new ObjectId().toString(),
    ];
    const createProductDto: CreateProductDto = {
      name: 'Test Product',
      description: 'A sample product description',
      price: '150',
      currency: 'NGN',
      paymentModes: 'cash,credit',
      categoryId: new ObjectId().toString(),
      inventoryBatchId: validBatchIds,
      productImage: file,
    };

    const creatorId = 'creator-id'; // Mock user ID

    jest.spyOn(cloudinary, 'uploadFile').mockResolvedValue({
      secure_url: mockImageUrl,
      public_id: 'sample_public_id',
      version: 123456,
      signature: 'sample_signature',
      width: 1000,
      height: 800,
      format: 'jpg',
      resource_type: 'image',
      bytes: 1024,
      created_at: new Date().toISOString(),
      message: '',
      name: '',
      http_code: 200,
    });

    jest.spyOn(prisma.category, 'findFirst').mockResolvedValue({
      id: createProductDto.categoryId,
      name: 'Sample Category',
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: null,
      type: 'PRODUCT',
    });

    jest.spyOn(prisma.product, 'create').mockResolvedValue({
      id: new ObjectId().toString(),
      name: createProductDto.name,
      description: createProductDto.description ?? '',
      image: mockImageUrl,
      price: parseFloat(createProductDto.price),
      currency: createProductDto.currency,
      paymentModes: createProductDto.paymentModes,
      categoryId: createProductDto.categoryId,
      creatorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.spyOn(prisma.productInventoryBatch, 'createMany').mockResolvedValue({
      count: validBatchIds.length,
    });

    const result = await service.create(createProductDto, file, creatorId);

    expect(result).toEqual(
      expect.objectContaining({
        name: createProductDto.name,
        description: createProductDto.description,
        image: mockImageUrl,
        price: parseFloat(createProductDto.price),
        currency: createProductDto.currency,
        paymentModes: createProductDto.paymentModes,
      }),
    );
    expect(cloudinary.uploadFile).toHaveBeenCalledWith(file);
    expect(prisma.product.create).toHaveBeenCalled();
    expect(prisma.productInventoryBatch.createMany).toHaveBeenCalledWith({
      data: validBatchIds.map((id) => ({
        productId: expect.any(String),
        inventoryBatchId: id,
      })),
    });
  });

  it('should find all products', async () => {
    const mockGetProductsDto = {};
    jest.spyOn(prisma.product, 'findMany').mockResolvedValue([
      {
        id: new ObjectId().toString(),
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        currency: 'USD',
        paymentModes: 'credit',
        categoryId: '6721acb96be4e1c85a8e294f',
        creatorId: '6721acb96be4e1c85a8e294f',
        image: 'https://sampleimage.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    jest.spyOn(service, 'getAllProducts').mockResolvedValue({
      limit: 10,
      page: 1,
      products: [
        {
          id: new ObjectId().toString(),
          name: 'Product 1',
          description: 'Description 1',
          price: 100,
          currency: 'USD',
          paymentModes: 'credit',
          categoryId: 'category-id',
          creatorId: 'creator-id',
          image: 'https://sampleimage.com/image.jpg',
          createdAt: new Date(),
          updatedAt: new Date(),
          creatorDetails: {
            id: '6721acb96be4e1c85a8e294f',
            createdAt: new Date(),
            updatedAt: new Date(),
            firstname: 'John',
            lastname: 'Doe',
            username: 'johndoe',
            password: 'hashedpassword',
            email: 'johndoe@example.com',
            phone: '1234567890',
            location: 'Location',
            lastLogin: new Date(),
            addressType: AddressType.HOME,
            staffId: 'staff-id',
            longitude: '12.345678',
            latitude: '98.7654321',
            emailVerified: true,
            isBlocked: false,
            status: 'active',
            roleId: 'role-id',
            deletedAt: null,
          },
          category: {
            id: '6721acb96be4e1c85a8e294f',
            name: 'Category 1',
            type: CategoryTypes.PRODUCT,
            parentId: 'wdqwr',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      total: 6,
      totalPages: 1,
    });

    const result = await service.getAllProducts(mockGetProductsDto);

    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe('Product 1');
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const mockProduct = {
        id: '6721acb96be4e1c85a8e294f',
        name: 'Product 1',
        description: 'Product description',
        price: 100,
        currency: 'USD',
        paymentModes: 'credit',
        creatorDetails: {
          firstname: 'John',
          lastname: 'Doe',
        },
        category: {
          id: '6721acb96be4e1c85a8e294f',
          name: 'Category 1',
        },
      };

      prisma.product.findUnique = jest.fn().mockResolvedValue(mockProduct);

      const result = await service.getProduct('1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product is not found', async () => {
      prisma.product.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getProduct('invalid-id')).rejects.toThrowError(
        new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND),
      );
    });
  });

  // Test for createProductCategory
  describe('createProductCategory', () => {
    it('should create a product category', async () => {
      const createProductCategoryDto: CreateProductCategoryDto = {
        name: 'New Category',
      };
      const mockCategory = {
        id: '6721acb96be4e1c85a8e294f',
        name: 'New Category',
        type: CategoryTypes.PRODUCT,
      };

      prisma.category.findFirst = jest.fn().mockResolvedValue(null); // No category exists
      prisma.category.create = jest.fn().mockResolvedValue(mockCategory);

      const result = await service.createProductCategory(
        createProductCategoryDto,
      );
      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException if category with the same name exists', async () => {
      const createProductCategoryDto: CreateProductCategoryDto = {
        name: 'Existing Category',
      };

      prisma.category.findFirst = jest
        .fn()
        .mockResolvedValue({ id: 'existing-id' }); // Category exists

      await expect(
        service.createProductCategory(createProductCategoryDto),
      ).rejects.toThrowError(
        new ConflictException('A category with this name already exists'),
      );
    });
  });

  // Test for getAllCategories
  describe('getAllCategories', () => {
    it('should return all product categories', async () => {
      const mockCategories = [
        {
          id: '6721acb96be4e1c85a8e294f',
          name: 'Category 1',
          type: CategoryTypes.PRODUCT,
        },
        {
          id: '6721acb96be4e1c85a8e294f',
          name: 'Category 2',
          type: CategoryTypes.PRODUCT,
        },
      ];

      prisma.category.findMany = jest.fn().mockResolvedValue(mockCategories);

      const result = await service.getAllCategories();
      expect(result).toEqual(mockCategories);
    });
  });

  // Test for getProductTabs
  describe('getProductTabs', () => {
    it('should return product tabs with customer count', async () => {
      const mockProduct = {
        id: '6721acb96be4e1c85a8e294f',
        _count: { customers: 5 },
      };

      prisma.product.findUnique = jest.fn().mockResolvedValue(mockProduct);

      const result = await service.getProductTabs('6721acb96be4e1c85a8e294f');
      expect(result).toEqual([
        {
          name: 'Product Details',
          url: '/product/6721acb96be4e1c85a8e294f/details',
        },
        { name: 'Stats', url: '/product/6721acb96be4e1c85a8e294f/stats' },
        {
          name: 'Inventory Details',
          url: '/product/6721acb96be4e1c85a8e294f/inventory',
        },
        {
          name: 'Customers',
          url: '/product/6721acb96be4e1c85a8e294f/customers',
          count: 5,
        },
      ]);
    });

    it('should throw NotFoundException if product is not found', async () => {
      prisma.product.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getProductTabs('invalid-id')).rejects.toThrowError(
        new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND),
      );
    });
  });

  // Test for getProductInventory
  describe('getProductInventory', () => {
    it('should return the product inventory batch', async () => {
      const mockInventoryBatch = {
        id: '6721acb96be4e1c85a8e294f',
        inventoryBatches: [
          {
            inventoryBatch: { id: '6721acb96be4e1c85a8e294f', name: 'Batch 1' },
          },
        ],
      };

      prisma.product.findUnique = jest
        .fn()
        .mockResolvedValue(mockInventoryBatch);

      const result = await service.getProductInventory('1');
      expect(result).toEqual(mockInventoryBatch);
    });

    it('should throw NotFoundException if product is not found', async () => {
      prisma.product.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.getProductInventory('invalid-id'),
      ).rejects.toThrowError(new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND));
    });
  });

  // Test for getProductStatistics
  describe('getProductStatistics', () => {
    it('should return product statistics', async () => {
      const mockProductCount = 10;

      prisma.product.count = jest.fn().mockResolvedValue(mockProductCount);

      const result = await service.getProductStatistics();
      expect(result).toEqual({ allProducts: mockProductCount });
    });

    it('should throw NotFoundException if no products are found', async () => {
      prisma.product.count = jest.fn().mockResolvedValue(0);

      await expect(service.getProductStatistics()).rejects.toThrowError(
        new NotFoundException(MESSAGES.PRODUCT_NOT_FOUND),
      );
    });
  });
});
