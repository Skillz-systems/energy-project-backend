import { Test, TestingModule } from '@nestjs/testing';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesAndPermissionsGuard } from '../auth/guards/roles.guard';

describe('AgentsController', () => {
  let controller: AgentsController;
  // let service: AgentsService;

  const mockAgentsService = {
    create: jest.fn(),
    getAll: jest.fn(),
    findOne: jest.fn(),
    getAgentsStatistics: jest.fn(),
    getAgentTabs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [{ provide: AgentsService, useValue: mockAgentsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesAndPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AgentsController>(AgentsController);
    // service = module.get<AgentsService>(AgentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new agent', async () => {
      const createAgentDto = { email: 'test@agent.com', location: 'Test' };
      const userId = '12345';
      const mockAgent = { id: 'agent123', userId };

      mockAgentsService.create.mockResolvedValue(mockAgent);

      const result = await controller.create(createAgentDto as any, userId);

      expect(result).toEqual(mockAgent);
      expect(mockAgentsService.create).toHaveBeenCalledWith(createAgentDto, userId);
    });
  });

  describe('getAllAgents', () => {
    it('should return paginated agents', async () => {
      const mockAgents = { data: [{ id: 'agent1' }], meta: { total: 1 } };
      mockAgentsService.getAll.mockResolvedValue(mockAgents);

      const result = await controller.getAllAgents({ page: 1, limit: 10 });

      expect(result).toEqual(mockAgents);
    });
  });

  describe('getAgent', () => {
    it('should return an agent if found', async () => {
      const mockAgent = { id: 'agent123', userId: '12345' };
      mockAgentsService.findOne.mockResolvedValue(mockAgent);

      const result = await controller.getAgent('agent123');

      expect(result).toEqual(mockAgent);
    });

    it('should throw NotFoundException if agent is not found', async () => {
      mockAgentsService.findOne.mockRejectedValue(new Error('Not Found'));

      await expect(controller.getAgent('agent123')).rejects.toThrow();
    });
  });
});
