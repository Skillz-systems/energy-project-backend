import { PrismaClient, TokenType, User, UserStatus } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../mailer/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { BadRequestException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { MESSAGES } from '../constants';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let configService: ConfigService;

  let mockPrismaService: DeepMockProxy<PrismaClient>;

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  const testData = {
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@example.com',
    phone: '09062736182',
    role: '66dce4173c5d3b2fd5f5728',
    location: 'Abuja',
  };

  const fakeData: User = {
    id: 'user-id',
    firstname: 'John',
    lastname: 'Doe',
    username: 'johndoe',
    password: 'hashed-password',
    email: 'john.doe@example.com',
    phone: '1234567890',
    location: 'Some Location',
    staffId: 'staff-id',
    roleId: 'role-id',
    status: UserStatus.active,
    isBlocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    lastLogin: new Date(),
  };

  const tokenData = {
    id: 'token-id',
    userId: 'user-id',
    token_type: TokenType.password_reset,
    token: 'token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'mail.from') {
        return 'no-reply@a4tenergy.com';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    mockPrismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Add User', () => {
    it('should create a new user and send email', async () => {
      const dto: CreateUserDto = { ...testData };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.role.findFirst as jest.Mock).mockResolvedValue({
        id: 'role-id',
        name: 'admin',
      });

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        ...dto,
      });

      const result = await service.addUser(dto);

      expect(result).toEqual({ id: 'user-id', ...dto });
      expect(prisma.user.create).toHaveBeenCalled();

      expect(mockEmailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: dto.email,
          subject: expect.any(String),
          from: null,
          template: expect.any(String),
          context: expect.objectContaining({
            firstname: dto.firstname,
            loginUrl: expect.any(String),
            platformName: expect.any(String),
            supportEmail: null,
            tempPassword: expect.any(String),
            userEmail: dto.email,
          }),
        }),
      );
    });

    it('should throw BadRequestException if email already exists', async () => {
      const dto: CreateUserDto = {
        ...testData,
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.addUser(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
    });

    it('should throw BadRequestException if role does not exist', async () => {
      const { role, ...dataWithoutRole } = testData;
      const dto: CreateUserDto = {
        ...dataWithoutRole,
        role: 'non-existent-role-id',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.role.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.addUser(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { id: dto.role },
      });
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDTO: ForgotPasswordDTO = {
      email: testData.email,
    };
    const existingUser: Partial<User> = {
      id: 'user-id',
      firstname: 'John',
      email: 'john.doe@example.com',
    };

    it('should throw error if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.forgotPassword(forgotPasswordDTO)).rejects.toThrow(
        new BadRequestException('User not found'),
      );
    });

    it('should send a reset password email if user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(fakeData);
      mockPrismaService.tempToken.findFirst.mockResolvedValue(null);

      await service.forgotPassword(forgotPasswordDTO);

      expect(mockPrismaService.tempToken.create).toHaveBeenCalled();
      expect(mockEmailService.sendMail).toHaveBeenCalled();
    });
  });

  describe('verifyResetToken', () => {
    it('should verify reset token', async () => {
      const resetToken = 'valid-token';

      mockPrismaService.tempToken.findFirst.mockResolvedValue(tokenData);
      const result = await service.verifyResetToken(resetToken);
      expect(result).toEqual({ message: MESSAGES.TOKEN_VALID });
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      mockPrismaService.tempToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyResetToken('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto = {
      newPassword: 'new-password',
      confirmNewPassword: 'new-password',
      resetToken: 'valid-token',
    };

    it('should reset password successfully', async () => {
      mockPrismaService.tempToken.findFirst.mockResolvedValue(tokenData);
      mockPrismaService.user.update.mockResolvedValue(fakeData);
      mockPrismaService.tempToken.update.mockResolvedValue(null);

      const result = await service.resetPassword(resetPasswordDto);

      expect(result).toEqual({ message: MESSAGES.PWD_RESET_SUCCESS });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { password: expect.any(String) },
      });
      expect(mockPrismaService.tempToken.update).toHaveBeenCalledWith({
        where: { id: tokenData.id },
        data: {
          token: null,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException if token is invalid or expired', async () => {
      mockPrismaService.tempToken.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});