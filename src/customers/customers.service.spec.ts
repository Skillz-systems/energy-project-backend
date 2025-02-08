import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ActionEnum, PrismaClient, SubjectEnum } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { fakeData } from '../../src/../test/mockData/user';
import { MESSAGES } from '../constants';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mockUsersResponseData } from '../../src/../test/mockData/user';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from '../users/entity/user.entity';
import { ListUsersQueryDto } from '../users/dto/list-users.dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: PrismaService;

  let mockPrismaService: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    mockPrismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Create Customer', () => {
    const mockDto: CreateCustomerDto = {
      firstname: 'James',
      lastname: 'Lewis',
      email: 'jo2@example.com',
      phone: '+1234567890',
      addressType: 'HOME',
      location: 'New York, USA',
      longitude: '',
      latitude: '',
    };

    it('should create customer if email does not exist', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...fakeData,
        role: { id: 'role-id', role: 'customerUser' },
      });
      (prisma.role.upsert as jest.Mock).mockResolvedValue({
        id: 'role-id',
        role: 'customerUser',
      });
      (prisma.permission.findFirst as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve(null)) // First call (for read permission)
        .mockImplementationOnce(() => Promise.resolve(null));

      (prisma.permission.create as jest.Mock)
        .mockResolvedValueOnce({
          id: 'permission-read-id',
          action: ActionEnum.read,
          subject: SubjectEnum.Customers,
        })
        .mockResolvedValueOnce({
          id: 'permission-write-id',
          action: ActionEnum.write,
          subject: SubjectEnum.Customers,
        });

      (prisma.role.update as jest.Mock).mockResolvedValue({
        id: 'role-id',
        role: 'customerUser',
      });

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...mockDto,
      });
      const result = await service.createCustomer('creator-id', mockDto);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toEqual({ message: MESSAGES.CREATED });
    });

    it('should throw error if email already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-id',
      });

      await expect(
        service.createCustomer('creator-id', mockDto),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: mockDto.email },
      });
    });
  });

  describe('List Customers', () => {
    it('should return paginated customers', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce(
        mockUsersResponseData,
      );
      mockPrismaService.user.count.mockResolvedValueOnce(1);

      const paginatedUsers = {
        customers: plainToInstance(UserEntity, mockUsersResponseData),
        total: 1,
        page: '1',
        limit: '10',
        totalPages: 1,
      };

      const query: ListUsersQueryDto = { page: '1', limit: '10' };

      const result = await service.getCustomers(query);
      expect(result).toEqual(paginatedUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('fetchCustomer', () => {
    it('should return a customer', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUsersResponseData[0],
      );

      const result = await service.getCustomer('66e9fe02014ca14746800d33');

      expect(result).toEqual(
        plainToInstance(UserEntity, mockUsersResponseData[0]),
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: '66e9fe02014ca14746800d33',
          customerDetails: {
            isNot: null,
          },
        },
        include: { role: { include: { permissions: true } } },
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCustomer('nonexistent-id')).rejects.toThrow(
        new NotFoundException(MESSAGES.USER_NOT_FOUND),
      );
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUsersResponseData[0],
      );
      mockPrismaService.customer.delete.mockResolvedValue({} as any);
      mockPrismaService.user.delete.mockResolvedValue({} as any);

      const result = await service.deleteCustomer('66e9fe02014ca14746800d33');

      expect(result).toEqual({ message: MESSAGES.DELETED });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '66e9fe02014ca14746800d33' },
      });
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteCustomer('nonexistent-id')).rejects.toThrow(
        new NotFoundException(MESSAGES.USER_NOT_FOUND),
      );
    });
  });

  describe('Fetch Customer Tabs', () => {
    const customerId = '672a7ded6e6ef96f18f3646c';

    it('should return customer Tabs if ID valid', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: '6740a7bfb60744d3c6e298b1',
        type: 'lead',
        createdBy: 'submarine',
        creatorId: '66e9fe02014ca14746800d33',
        agentId: null,
        userId: '6740a7bfb60744d3c6e298b0',
      });

      const result = await service.getCustomerTabs(customerId);

      expect(result.length).toBeGreaterThan(1);
      expect(prisma.customer.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException if Inventory Batch ID is not found', async () => {
      mockPrismaService.inventoryBatch.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerTabs('nonexistent-id')).rejects.toThrow(
        new NotFoundException(MESSAGES.USER_NOT_FOUND),
      );
    });
  });
});
