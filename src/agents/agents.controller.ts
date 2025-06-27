import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesAndPermissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesAndPermissionsGuard } from '../auth/guards/roles.guard';
import { ActionEnum, Agent, SubjectEnum } from '@prisma/client';
import { GetAgentsDto } from './dto/get-agent.dto';
import { GetSessionUser } from '../auth/decorators/getUser';

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Agents}`],
  })
  @ApiBearerAuth('access_token')
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT token used for authentication',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer <token>',
    },
  })
  @ApiBody({
    type: CreateAgentDto,
    description: 'Json structure for request payload',
  })
  @ApiOkResponse({
    description: 'Create agent',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '67484835c95cd2fe2f0ac63e' },
        agentId: { type: 'number', example: 52520059 },
        userId: { type: 'string', example: '67484835c95cd2fe2f0ac63d' },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-11-28T10:38:45.906Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-11-28T10:38:45.906Z',
        },
        deletedAt: { type: 'string', nullable: true, example: null },
      },
    },
  })
  @ApiBadRequestResponse({})
  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  async create(
    @Body() CreateAgentDto: CreateAgentDto,
    @GetSessionUser('id') id: string,
  ) {
    return await this.agentsService.create(CreateAgentDto, id);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Agents}`],
  })
  @ApiBearerAuth('access_token')
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT token used for authentication',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer <token>',
    },
  })
  @Get()
  @ApiOkResponse({
    description: 'Fetch all agents with pagination',
    schema: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '6742722249c6bcb5fb8b296f' },
              agentId: { type: 'number', example: 94350766 },
              userId: { type: 'string', example: '6742722249c6bcb5fb8b296e' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-11-24T00:24:02.180Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-11-24T00:24:02.180Z',
              },
              deletedAt: { type: 'string', nullable: true, example: null },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '6742722249c6bcb5fb8b296e' },
                  firstname: { type: 'string', example: 'daniel' },
                  lastname: { type: 'string', example: 'paul' },
                  username: { type: 'string', nullable: true, example: null },
                  password: { type: 'string', example: '$argon2id$...' },
                  email: { type: 'string', example: 'john.doe12@example.com' },
                  phone: { type: 'string', nullable: true, example: null },
                  location: { type: 'string', example: '1234 Street' },
                  addressType: { type: 'string', example: 'HOME' },
                  staffId: { type: 'string', nullable: true, example: null },
                  longitude: { type: 'string', nullable: true, example: null },
                  latitude: { type: 'string', nullable: true, example: null },
                  emailVerified: { type: 'boolean', example: true },
                  isBlocked: { type: 'boolean', example: false },
                  status: { type: 'string', example: 'barred' },
                  roleId: {
                    type: 'string',
                    example: '670189eb3253ce51203d2c03',
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2024-11-24T00:24:02.162Z',
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time',
                    example: '2024-11-24T00:24:02.162Z',
                  },
                  deletedAt: { type: 'string', nullable: true, example: null },
                  lastLogin: { type: 'string', nullable: true, example: null },
                },
              },
            },
          },
        },
        total: { type: 'number', example: 3 },
        page: { type: 'number', example: 1 },
        lastPage: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
      },
    },
  })
  @ApiOperation({
    summary: 'Fetch all agents with pagination',
    description: 'Fetch all agents with pagination',
  })
  @ApiBadRequestResponse({})
  @ApiExtraModels(GetAgentsDto)
  @HttpCode(HttpStatus.OK)
  async getAllAgents(@Query() GetAgentsDto: GetAgentsDto) {
    return this.agentsService.getAll(GetAgentsDto);
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Agents}`],
  })
  @ApiBearerAuth('access_token')
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT token used for authentication',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer <token>',
    },
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the agent to fetch',
  })
  @ApiOkResponse({
    description: 'Details of an agent',
    schema: {
      type: 'object',

      properties: {
        id: { type: 'string', example: '6742722249c6bcb5fb8b296f' },
        agentId: { type: 'number', example: 94350766 },
        userId: { type: 'string', example: '6742722249c6bcb5fb8b296e' },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-11-24T00:24:02.180Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-11-24T00:24:02.180Z',
        },
        deletedAt: { type: 'string', nullable: true, example: null },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '6742722249c6bcb5fb8b296e' },
            firstname: { type: 'string', example: 'daniel' },
            lastname: { type: 'string', example: 'paul' },
            username: { type: 'string', nullable: true, example: null },
            password: { type: 'string', example: '$argon2id$...' },
            email: { type: 'string', example: 'john.doe12@example.com' },
            phone: { type: 'string', nullable: true, example: null },
            location: { type: 'string', example: '1234 Street' },
            addressType: { type: 'string', example: 'HOME' },
            staffId: { type: 'string', nullable: true, example: null },
            longitude: { type: 'string', nullable: true, example: null },
            latitude: { type: 'string', nullable: true, example: null },
            emailVerified: { type: 'boolean', example: true },
            isBlocked: { type: 'boolean', example: false },
            status: { type: 'string', example: 'barred' },
            roleId: { type: 'string', example: '670189eb3253ce51203d2c03' },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-11-24T00:24:02.162Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-11-24T00:24:02.162Z',
            },
            deletedAt: { type: 'string', nullable: true, example: null },
            lastLogin: { type: 'string', nullable: true, example: null },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found.',
  })
  @Get(':id')
  @ApiOperation({
    summary: 'Fetch agent details',
    description: 'This endpoint allows a permitted user fetch a agent details.',
  })
  async getAgent(@Param('id') id: string): Promise<Agent> {
    const agent = await this.agentsService.findOne(id);

    return agent;
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Agents}`],
  })
  @ApiBearerAuth('access_token')
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT token used for authentication',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer <token>',
    },
  })
  @ApiOkResponse({
    description: 'Fetch Agent statistics',
    schema: {
      type: 'object',

      properties: {
        total: { type: 'number', example: 3 },
        active: { type: 'number', example: 2 },
        barred: { type: 'number', example: 1 },
      },
    },
  })
  @ApiOperation({
    summary: 'Fetch Agent statistics',
    description: 'Fetch Agent statistics',
  })
  @ApiBadRequestResponse({})
  @HttpCode(HttpStatus.OK)
  @Get('/statistics/view')
  async getAgentsStatistics() {
    return this.agentsService.getAgentsStatistics();
  }

  @UseGuards(JwtAuthGuard, RolesAndPermissionsGuard)
  @RolesAndPermissions({
    permissions: [`${ActionEnum.manage}:${SubjectEnum.Agents}`],
  })
  @ApiBearerAuth('access_token')
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT token used for authentication',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer <token>',
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Agent id to fetch tabs',
  })
  @ApiOkResponse({
    description: 'Fetch Agent statistics',
    isArray: true,
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Agents Details' },
          url: {
            type: 'string',
            example: '/agent/6742722249c6bcb5fb8b296f/details',
          },
          count: { type: 'number', nullable: true, example: null },
        },
        examples: {
          fixedExample: {
            value: [
              {
                name: 'Agents Details',
                url: '/agent/6742722249c6bcb5fb8b296f/details',
              },
              {
                name: 'Customers',
                url: '/agent/6742722249c6bcb5fb8b296f/customers',
                count: 0,
              },
              {
                name: 'Inventory',
                url: '/agent/6742722249c6bcb5fb8b296f/inventory',
                count: 0,
              },
              {
                name: 'Transactions',
                url: '/agent/6742722249c6bcb5fb8b296f/transactions',
                count: 0,
              },
              {
                name: 'Stats',
                url: '/agent/6742722249c6bcb5fb8b296f/stats',
              },
              {
                name: 'Sales',
                url: '/agent/6742722249c6bcb5fb8b296f/sales',
                count: 0,
              },
              {
                name: 'Tickets',
                url: '/agent/6742722249c6bcb5fb8b296f/tickets',
                count: 0,
              },
            ],
          },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Fetch Agent Tabs for a particular agent',
    description: 'Fetch Agent Tabs for a particular agent',
  })
  @ApiBadRequestResponse({})
  @HttpCode(HttpStatus.OK)
  @Get(':id/tabs')
  async getInventoryTabs(@Param('id') agentId: string) {
    return this.agentsService.getAgentTabs(agentId);
  }
}
