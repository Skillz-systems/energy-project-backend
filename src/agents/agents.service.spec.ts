import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from './agents.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { fakeData } from '../../test/mockData/user';

describe('AgentsService', () => {
  let service: AgentsService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new agent successfully', async () => {
      const createAgentDto = {
        email: 'test@agent.com',
        location: 'Test Location',
        addressType: 'WORK',
        firstname: 'John',
        lastname: 'Doe',
        username: 'john.doe',
        phone: '1234567890',
        longitude: '10.123456',
        latitude: '20.654321',
      };
      const userId = '12345';
      const mockUser = {
        id: '12345',
        email: createAgentDto.email,
        location: createAgentDto.location,
        addressType: createAgentDto.addressType,
        firstname: createAgentDto.firstname,
        lastname: createAgentDto.lastname,
        username: createAgentDto.username,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        emailVerified: false,
        isBlocked: false,
        status: 'active',
        roleId: '670189eb3253ce51203d2c03',
        lastLogin:  new Date(),
      };
      const mockAgent = { id: '670189eb3253ce51203d2c03', userId: mockUser.id, agentId: 12345, createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, };

        prisma.role.findFirst.mockResolvedValueOnce({
          id:"66f6a3a8eda52d87ef51cbc8",
          role: "Agent",
          active: true,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          created_by: "66f6a3a8eda52d87ef51cbc8",
          permissionIds: ["670189eb3253ce51203d2c03", "670189eb3253ce51203d2c03" ]
        });

      prisma.user.create.mockResolvedValueOnce(fakeData);
      prisma.agent.create.mockResolvedValueOnce(mockAgent);

      const result = await service.create(createAgentDto as any, userId);

      expect(result).toEqual(mockAgent);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: createAgentDto.email }),
        }),
      );
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(fakeData);

      await expect(
        service.create({ email: 'test@agent.com' } as any, '12345'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getAll', () => {
    it('should return paginated agents list', async () => {
      const mockAgents = [
        { id: 'agent1', userId: 'user1' },
        { id: 'agent2', userId: 'user2' },
      ];

      prisma.agent.findMany.mockResolvedValue(mockAgents as any);
      prisma.agent.count.mockResolvedValue(2);

      const result = await service.getAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockAgents);
      expect(result.meta.total).toEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return an agent if found', async () => {
      const mockAgent = { id: '6721acb96be4e1c85a8e294f', userId: '6721acb57be4d2c85a8e294f' };
      prisma.agent.findUnique.mockResolvedValue(mockAgent as any);

      const result = await service.findOne('6721acb96be4e1c85a8e294f');

      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException if agent is not found', async () => {
      prisma.agent.findUnique.mockResolvedValue(null);

      await expect(service.findOne('6721acb96be4e1c85a8e294f')).rejects.toThrow(
        NotFoundException,
      );
    });
  });


  describe('getAgentsStatistics', () => {
    it('should return agents statistics', async () => {
      prisma.agent.count
        .mockResolvedValueOnce(10) // Total agents
        .mockResolvedValueOnce(6) // Active agents
        .mockResolvedValueOnce(4); // Barred agents
  
      const result = await service.getAgentsStatistics();
  
      expect(result).toEqual({
        total: 10,
        active: 6,
        barred: 4,
      });
    });
  
    it('should throw NotFoundException if no agents are found', async () => {
      prisma.agent.count.mockResolvedValue(0);
  
      await expect(service.getAgentsStatistics()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAgentTabs', () => {
    it('should return agent tabs', async () => {
      prisma.agent.findUnique.mockResolvedValue({
        id: '6721acb96be4e1c85a8e294f',
        user: {
          _count: { createdCustomers: 5 },
        },
      } as any);
  
      const result = await service.getAgentTabs('6721acb96be4e1c85a8e294f');
  
      expect(result).toEqual([
        { name: 'Agents Details', url: '/agent/6721acb96be4e1c85a8e294f/details' },
        { name: 'Customers', url: '/agent/6721acb96be4e1c85a8e294f/customers', count: 5 },
        { name: 'Inventory', url: '/agent/6721acb96be4e1c85a8e294f/inventory', count: 0 },
        { name: 'Transactions', url: '/agent/6721acb96be4e1c85a8e294f/transactions', count: 0 },
        { name: 'Stats', url: '/agent/6721acb96be4e1c85a8e294f/stats' },
        { name: 'Sales', url: '/agent/6721acb96be4e1c85a8e294f/sales', count: 0 },
        { name: 'Tickets', url: '/agent/6721acb96be4e1c85a8e294f/tickets', count: 0 },
      ]);
    });
  
    it('should throw BadRequestException for invalid ObjectId', async () => {
      const invalidId = 'invalidId';
  
      await expect(service.getAgentTabs(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });
  
    it('should throw NotFoundException if agent is not found', async () => {
      prisma.agent.findUnique.mockResolvedValue(null);
  
      await expect(service.getAgentTabs('6721acb96be4e1c85a8e294f')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  
  
});
