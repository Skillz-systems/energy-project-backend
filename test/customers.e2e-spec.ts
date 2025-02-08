import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ActionEnum, PrismaClient, SubjectEnum } from '@prisma/client';
import { JwtAuthGuard } from '../src/auth/guards/jwt.guard';
import { RolesAndPermissionsGuard } from '../src/auth/guards/roles.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';
import { fakeData } from './mockData/user';
import { MESSAGES } from '../src/constants';
import { mockUsersResponseData } from './mockData/user';

describe('CustomersController (e2e)', () => {
  let app: INestApplication;
  let mockPrismaService: DeepMockProxy<PrismaClient>;

  beforeAll(async () => {
    mockPrismaService = mockDeep<PrismaClient>();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'abc123' };
          return true;
        },
      })
      .overrideGuard(RolesAndPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe(' Create customer', () => {
    const mockDto = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      addressType: 'HOME',
      location: 'New York',
    };

    it('should create a new customer', async () => {
      (mockPrismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...fakeData,
        role: { id: 'role-id', role: 'customerUser' },
      });
      (mockPrismaService.role.upsert as jest.Mock).mockResolvedValue({
        id: 'role-id',
        role: 'customerUser',
      });
      (mockPrismaService.permission.findFirst as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve(null)) // First call (for read permission)
        .mockImplementationOnce(() => Promise.resolve(null));

      (mockPrismaService.permission.create as jest.Mock)
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

      (mockPrismaService.role.update as jest.Mock).mockResolvedValue({
        id: 'role-id',
        role: 'customerUser',
      });

      (mockPrismaService.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...mockDto,
      });

      const response = await request(app.getHttpServer())
        .post('/customers/create')
        .send(mockDto)

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        message: MESSAGES.CREATED,
      });
    });

  });

   describe('List Customers', () => {
     it('/customers (GET)', async () => {
       mockPrismaService.user.findMany.mockResolvedValueOnce(
         mockUsersResponseData,
       );
       mockPrismaService.user.count.mockResolvedValueOnce(1);

       const response = await request(app.getHttpServer())
         .get('/customers?page=1&limit=10')
         .expect(200);

       expect(response.body.customers.length).toBeGreaterThan(0);
       expect(response.body.total).toBeTruthy();
       expect(response.body.page).toBeTruthy();
       expect(response.body.limit).toBeTruthy();
     });
   });

    describe('Fetch Customer Tabs', () => {
      it('/Customer Tabs (GET)', async () => {
        mockPrismaService.customer.findUnique.mockResolvedValue({
          id: '6740a7bfb60744d3c6e298b1',
          type: 'lead',
          createdBy: 'submarine',
          creatorId: '66e9fe02014ca14746800d33',
          agentId: null,
          userId: '6740a7bfb60744d3c6e298b0',
        });

        const response = await request(app.getHttpServer())
          .get('/customers/672a7e32493902cd46999f69/tabs')
          .expect(200);

        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.length).toBeGreaterThan(1);
      });

      it('should throw NotFoundException if Customer ID is not found', async () => {
        mockPrismaService.customer.findUnique.mockResolvedValue(null);

        const response = await request(app.getHttpServer())
          .get('/customers/672a7e32493902cd46999f69/tabs')
          .expect(404);

        expect(response.status).toBe(HttpStatus.NOT_FOUND);
        expect(response.body.message).toContain(MESSAGES.USER_NOT_FOUND);
      });
    });
});
