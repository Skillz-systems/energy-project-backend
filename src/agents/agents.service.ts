import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAgentDto } from './dto/create-agent.dto';
import { PrismaService } from '../prisma/prisma.service';
import { generateRandomPassword } from '../utils/generate-pwd';
import { hashPassword } from '../utils/helpers.util';
import { GetAgentsDto } from './dto/get-agent.dto';
import { MESSAGES } from '../constants';
import { ObjectId } from 'mongodb';
import {
  ActionEnum,
  AgentCategory,
  Prisma,
  SalesStatus,
  SubjectEnum,
  TokenType,
  UserStatus,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from '../users/entity/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../mailer/email.service';

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private readonly Email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async create(createAgentDto: CreateAgentDto, userId) {
    const { email, location, category, ...otherData } = createAgentDto;

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
      throw new ConflictException(`Agent with email ${email} already exists`);
    }

    const existingAgentId = await this.prisma.agent.findFirst({
      where: { agentId },
    });

    if (existingAgentId) {
      throw new ConflictException('Agent with the agent ID already exists');
    }

    const password = generateRandomPassword(30);
    const hashedPassword = await hashPassword(password);

    let defaultRole = await this.prisma.role.findFirst({
      where: {
        role: 'AssignedAgent',
        permissions: {
          some: {
            subject: SubjectEnum.Assignments,
            action: ActionEnum.manage,
          },
        },
      },
    });

    if (!defaultRole) {
      defaultRole = await this.prisma.role.create({
        data: {
          role: 'AssignedAgent',
          permissions: {
            create: {
              subject: SubjectEnum.Assignments,
              action: ActionEnum.manage,
            },
          },
        },
      });
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        location,
        roleId: defaultRole.id,
        ...otherData,
      },
    });

    await this.prisma.agent.create({
      data: {
        agentId,
        userId: newUser.id,
        category,
      },
    });

    if (category != AgentCategory.BUSINESS) {
      const resetToken = uuidv4();
      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getFullYear() + 1);

      const token = await this.prisma.tempToken.create({
        data: {
          token: resetToken,
          expiresAt: expirationTime,
          token_type: TokenType.email_verification,
          userId: newUser.id,
        },
      });

      const platformName = 'A4T Energy';
      const clientUrl = this.config.get<string>('CLIENT_URL');

      const createPasswordUrl = `${clientUrl}create-password/${newUser.id}/${token.token}/`;

      await this.Email.sendMail({
        userId: newUser.id,
        to: email,
        from: this.config.get<string>('MAIL_FROM'),
        subject: `Welcome to ${platformName} Agent Platform - Let's Get You Started!`,
        template: './new-user-onboarding',
        context: {
          firstname: `Agent ${newUser.firstname}`,
          userEmail: email,
          platformName,
          createPasswordUrl,
          supportEmail: this.config.get<string>('MAIL_FROM') || 'a4t@gmail.com',
        },
      });
    }

    return newUser;
  }

  async getAll(getProductsDto: GetAgentsDto) {
    const {
      page = 1,
      limit = 100,
      status,
      sortField,
      sortOrder,
      search,
      createdAt,
      updatedAt,
    } = getProductsDto;

    const whereConditions: Prisma.AgentWhereInput = {
      AND: [
        search
          ? {
              user: {
                OR: [
                  { firstname: { contains: search, mode: 'insensitive' } },
                  { lastname: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                  { username: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {},
        status ? { user: { status } } : {},
        createdAt ? { createdAt: { gte: new Date(createdAt) } } : {},
        updatedAt ? { updatedAt: { gte: new Date(updatedAt) } } : {},
      ],
    };

    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);

    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const orderBy = {
      [sortField || 'createdAt']: sortOrder || 'asc',
    };

    // Fetch Agents with pagination and filters
    const agents = await this.prisma.agent.findMany({
      where: whereConditions,
      include: {
        user: true,
      },
      skip,
      take,
      orderBy: {
        user: orderBy,
      },
    });

    const total = await this.prisma.agent.count({
      where: whereConditions,
    });

    return {
      agents: agents.map((agent) => ({
        ...agent,
        user: plainToInstance(UserEntity, agent.user),
      })),
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

  async assignProductsToAgent(
    agentId: string,
    productIds: string[],
    assignedBy: string,
  ) {
    await this.findOne(agentId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products not found');
    }

    const alreadyAssigned = await this.prisma.agentProduct.findMany({
      where: {
        agentId,
        productId: { in: productIds },
      },
      select: { productId: true },
    });

    if (alreadyAssigned.length > 0) {
      const assignedIds = alreadyAssigned.map((p) => p.productId).join(', ');
      throw new BadRequestException(
        `Agent has already been assigned the following product(s): ${assignedIds}`,
      );
    }

    await this.prisma.agentProduct.createMany({
      data: productIds.map((productId) => ({
        agentId,
        productId,
        assignedBy,
      })),
    });

    return { message: 'Products assigned successfully' };
  }

  async unassignProductsFromAgent(agentId: string, productIds: string[]) {
    await this.findOne(agentId);

    const assigned = await this.prisma.agentProduct.findMany({
      where: {
        agentId,
        productId: { in: productIds },
      },
    });

    if (assigned.length === 0) {
      throw new BadRequestException(
        'No matching product-agent assignments found',
      );
    }

    const failed = [];
    for (const product of assigned) {
      const isInUse = await this.prisma.sales.findFirst({
        where: {
          agentId,
          saleItems: { some: { productId: product.productId } },
          status: {
            not: SalesStatus.CANCELLED,
          },
        },
      });

      if (isInUse) {
        failed.push(product.productId);
      }
    }

    if (failed.length > 0) {
      throw new BadRequestException(
        `Cannot unassign products that are in use: ${failed.join(', ')}`,
      );
    }

    await this.prisma.agentProduct.deleteMany({
      where: {
        agentId,
        productId: { in: productIds },
      },
    });

    return { message: 'Products unassigned successfully' };
  }

  async assignCustomersToAgent(
    agentId: string,
    customerIds: string[],
    assignedBy: string,
  ) {
    await this.findOne(agentId);

    const existing = await this.prisma.agentCustomer.findMany({
      where: {
        agentId,
        customerId: { in: customerIds },
      },
    });

    if (existing.length > 0) {
      const ids = existing.map((c) => c.customerId).join(', ');
      throw new BadRequestException(
        `Agent already assigned to customer(s): ${ids}`,
      );
    }

    await this.prisma.agentCustomer.createMany({
      data: customerIds.map((customerId) => ({
        agentId,
        customerId,
        assignedBy,
      })),
    });

    return { message: 'Customers assigned successfully' };
  }

  async unassignCustomersFromAgent(agentId: string, customerIds: string[]) {
    const assigned = await this.prisma.agentCustomer.findMany({
      where: {
        agentId,
        customerId: { in: customerIds },
      },
    });

    if (assigned.length === 0) {
      throw new BadRequestException(
        'No matching customer-agent assignments found',
      );
    }

    await this.prisma.agentCustomer.deleteMany({
      where: {
        agentId,
        customerId: { in: customerIds },
      },
    });

    return { message: 'Customers unassigned successfully' };
  }

  async getAgentUserId(agentId: string): Promise<string> {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });
    return agent?.userId;
  }

  async getAgentDashboardStats(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true, wallet: true },
    });

    if (!agent || agent.category !== AgentCategory.NORMAL) {
      throw new BadRequestException('Invalid agent or category');
    }

    const salesStats = await this.getSalesStatistics(agent.userId);
    const customerStats = await this.getCustomerStatistics(agentId);
    const walletInfo = await this.getWalletInfo(agentId);
    const recentTransactions = await this.getRecentTransactions(agentId);
    const monthlySalesData = await this.getMonthlySalesData(agent.userId);
    const transactionLineData = await this.getTransactionLineData(agentId);

    return {
      overview: {
        totalSales: salesStats.totalValue,
        salesCount: salesStats.count,
        totalCustomers: customerStats.total,
        walletBalance: walletInfo.balance,
      },
      salesStatistics: {
        totalValue: salesStats.totalValue,
        totalCount: salesStats.count,
        completedSales: salesStats.completed,
        pendingSales: salesStats.pending,
        monthlySalesData,
      },
      customerStatistics: {
        total: customerStats.total,
        assigned: customerStats.assigned,
      },
      walletInfo: {
        balance: walletInfo.balance,
        recentTransactions,
      },
      charts: {
        salesGraph: monthlySalesData,
        transactionGraph: transactionLineData,
      },
    };
  }

  private async getSalesStatistics(userId: string) {
    const sales = await this.prisma.sales.findMany({
      where: { creatorId: userId },
      include: { saleItems: true },
    });

    const totalValue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const completed = sales.filter(
      (sale) => sale.status === SalesStatus.COMPLETED,
    ).length;
    const pending = sales.filter(
      (sale) => sale.status !== SalesStatus.COMPLETED,
    ).length;

    return {
      totalValue,
      count: sales.length,
      completed,
      pending,
    };
  }

  private async getCustomerStatistics(agentId: string) {
    const assignedCustomers = await this.prisma.agentCustomer.count({
      where: { agentId },
    });

    return {
      total: assignedCustomers,
      assigned: assignedCustomers,
    };
  }

  private async getWalletInfo(agentId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { agentId },
    });

    return {
      balance: wallet?.balance || 0,
    };
  }

  private async getRecentTransactions(agentId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        createdAt: true,
        status: true,
      },
    });
  }

  private async getMonthlySalesData(userId: string) {
    const currentYear = new Date().getFullYear();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const salesData = await this.prisma.sales.groupBy({
      by: ['createdAt'],
      where: {
        creatorId: userId,
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    const monthlyData = months.map((month) => ({
      month,
      sales: 0,
      value: 0,
    }));

    // Populate with actual data
    salesData.forEach((data) => {
      const monthIndex = new Date(data.createdAt).getMonth();
      monthlyData[monthIndex].sales += data._count.id;
      monthlyData[monthIndex].value += data._sum.totalPrice || 0;
    });

    return monthlyData;
  }

  private async getTransactionLineData(agentId: string) {
    const currentYear = new Date().getFullYear();
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];

    const transactionData = await this.prisma.walletTransaction.groupBy({
      by: ['createdAt'],
      where: {
        agentId,
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    const monthlyData = months.map((month) => ({
      month,
      amount: 0,
      count: 0,
    }));

    // Populate with actual data
    transactionData.forEach((data) => {
      const monthIndex = new Date(data.createdAt).getMonth();
      monthlyData[monthIndex].amount += data._sum.amount || 0;
      monthlyData[monthIndex].count += data._count.id;
    });

    return monthlyData;
  }

  async getAgentsByCategory(category: AgentCategory) {
    return this.prisma.agent.findMany({
      where: { category },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  private generateAgentNumber(): number {
    return Math.floor(10000000 + Math.random() * 90000000);
  }

  // Helper function to validate MongoDB ObjectId
  private isValidObjectId(id: string): boolean {
    return ObjectId.isValid(id);
  }
}
