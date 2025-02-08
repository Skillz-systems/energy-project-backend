import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { PrismaService } from '../prisma/prisma.service';
import { generateRandomPassword } from '../utils/generate-pwd';
import * as argon from 'argon2';
import { hashPassword } from '../utils/helpers.util';
import { GetAgentsDto } from './dto/get-agent.dto';
import { MESSAGES } from '../constants';
import { ObjectId } from 'mongodb';
import { AddressType, UserStatus } from '@prisma/client';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  async create(createAgentDto: CreateAgentDto, userId) {
    const { email, addressType, location, ...otherData } = createAgentDto;

    const agentId = this.generateAgentNumber();

    const existingEmail = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check if email or agentId already exists
    const existingAgent = await this.prisma.agent.findFirst({
      where: { userId },
    });

    if (existingAgent) {
      throw new ConflictException(
        'Agent with the provided userId already exists',
      );
    }

    const existingAgentId = await this.prisma.agent.findFirst({
      where: { agentId },
    });

    if (existingAgentId) {
      throw new ConflictException('Agent with the agent ID already exists');
    }

    const password = generateRandomPassword(30);
    const hashedPassword = await hashPassword(password);

    // Fetch the default role for agents
    const defaultRole = await this.prisma.role.findFirst({
      where: {
        permissions: {
          some: {
            subject: 'Agents',
            action: 'manage',
          },
        },
      },
    });

    if (!defaultRole) {
      throw new NotFoundException('Default role for agents not found');
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        addressType: addressType as AddressType, // Explicitly cast if needed
        location,
        roleId: defaultRole.id,
        ...otherData,
      },
    });

    const newAgent = await this.prisma.agent.create({
      data: {
        agentId,
        userId: newUser.id,
      },
    });

    return newAgent;
  }

  async getAll(getProductsDto: GetAgentsDto) {
    const {
      page = 1,
      limit = 100,
      status,
      createdAt,
      updatedAt,
    } = getProductsDto;

    const whereConditions: any = {};

    // Apply filtering conditions
    if (status) whereConditions.status = status;
    if (createdAt) whereConditions.createdAt = { gte: new Date(createdAt) };
    if (updatedAt) whereConditions.updatedAt = { gte: new Date(updatedAt) };

    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);

    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;
    // Fetch products with pagination and filters
    const agents = await this.prisma.agent.findMany({
      where: whereConditions,
      include: {
        user: true,
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await this.prisma.agent.count({
      where: whereConditions,
    });

    return {
      agents,
      total,
      page,
      limit,
      totalPages: limitNumber === 0 ? 0 : Math.ceil(total / limitNumber),
    };
  }

  async findOne(id: string) {
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException(`Invalid permission ID: ${id}`);
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!agent) {
      throw new NotFoundException(MESSAGES.AGENT_NOT_FOUND);
    }

    return agent;
  }

  async getAgentsStatistics() {
    // Count all agents
    const allAgents = await this.prisma.agent.count();

    // Count active agents by checking the status in the related User model
    const activeAgentsCount = await this.prisma.agent.count({
      where: {
        user: {
          status: UserStatus.active,
        },
      },
    });

    // Count barred agents by checking the status in the related User model
    const barredAgentsCount = await this.prisma.agent.count({
      where: {
        user: {
          status: UserStatus.barred,
        },
      },
    });

    // Throw an error if no agents are found
    if (!allAgents) {
      throw new NotFoundException('No agents found.');
    }

    return {
      total: allAgents,
      active: activeAgentsCount,
      barred: barredAgentsCount,
    };
  }

  async getAgentTabs(agentId: string) {
    if (!this.isValidObjectId(agentId)) {
      throw new BadRequestException(`Invalid permission ID: ${agentId}`);
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        user: {
          include: {
            _count: {
              select: { createdCustomers: true },
            },
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(MESSAGES.AGENT_NOT_FOUND);
    }

    const tabs = [
      {
        name: 'Agents Details',
        url: `/agent/${agentId}/details`,
      },
      {
        name: 'Customers',
        url: `/agent/${agentId}/customers`,
        count: agent.user._count.createdCustomers,
      },
      {
        name: 'Inventory',
        url: `/agent/${agentId}/inventory`,
        count: 0,
      },
      {
        name: 'Transactions',
        url: `/agent/${agentId}/transactions`,
        count: 0,
      },
      {
        name: 'Stats',
        url: `/agent/${agentId}/stats`,
      },
      {
        name: 'Sales',
        url: `/agent/${agentId}/sales`,
        count: 0,
      },
      {
        name: 'Tickets',
        url: `/agent/${agentId}/tickets`,
        count: 0,
      },
    ];

    return tabs;
  }

  private generateAgentNumber(): number {
    return Math.floor(10000000 + Math.random() * 90000000);
  }

  // Helper function to validate MongoDB ObjectId
  private isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id);
  }
}
