import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesDto } from '../sales/dto/create-sales.dto';
import { PaginationQueryDto } from '../utils/dto/pagination.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ContractService {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async createContract(dto: CreateSalesDto, initialAmountPaid: number) {
    return await this.prisma.contract.create({
      data: {
        initialAmountPaid,
        nextOfKinFullName: dto.nextOfKinDetails.fullName,
        nextOfKinRelationship: dto.nextOfKinDetails.relationship,
        nextOfKinPhoneNumber: dto.nextOfKinDetails.phoneNumber,
        nextOfKinHomeAddress: dto.nextOfKinDetails.homeAddress,
        nextOfKinEmail: dto.nextOfKinDetails.email,
        nextOfKinDateOfBirth: dto.nextOfKinDetails.dateOfBirth,
        nextOfKinNationality: dto.nextOfKinDetails.nationality,
        guarantorFullName: dto.guarantorDetails.fullName,
        guarantorPhoneNumber: dto.guarantorDetails.phoneNumber,
        guarantorHomeAddress: dto.guarantorDetails.homeAddress,
        guarantorEmail: dto.guarantorDetails.email,
        guarantorIdType: dto.guarantorDetails.identificationDetails.idType,
        guarantorIdNumber: dto.guarantorDetails.identificationDetails.idNumber,
        guarantorIdIssuingCountry:
          dto.guarantorDetails.identificationDetails.issuingCountry,
        guarantorIdIssueDate:
          dto.guarantorDetails.identificationDetails.issueDate,
        guarantorIdExpirationDate:
          dto.guarantorDetails.identificationDetails.expirationDate,
        guarantorNationality: dto.guarantorDetails.nationality,
        guarantorDateOfBirth: dto.guarantorDetails.dateOfBirth,
        idType: dto.identificationDetails.idType,
        idNumber: dto.identificationDetails.idNumber,
        issuingCountry: dto.identificationDetails.issuingCountry,
        issueDate: dto.identificationDetails.issueDate,
        expirationDate: dto.identificationDetails.expirationDate,
        fullNameAsOnID: dto.identificationDetails.fullNameAsOnID,
        addressAsOnID: dto.identificationDetails.addressAsOnID,
      },
    });
  }

  async getAllContracts(query: PaginationQueryDto) {
    const { page = 1, limit = 100 } = query;
    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);

    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const totalCount = await this.prisma.contract.count({
      where: {
        sale: {
          some: {},
        },
      },
    });

    const contracts = await this.prisma.contract.findMany({
      where: {
        sale: {
          some: {},
        },
      },
      include: {
        sale: {
          include: {
            customer: true,
            saleItems: {
              include: {
                product: {
                  include: {
                    inventories: {
                      include: {
                        inventory: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      skip,
      take,
    });

    return {
      contracts,
      total: totalCount,
      page,
      limit,
      totalPages: limitNumber === 0 ? 0 : Math.ceil(totalCount / limitNumber),
    };
  }

  async getContract(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: {
        id,
      },
      include: {
        sale: {
          include: {
            customer: true,
            saleItems: {
              include: {
                product: {
                  include: {
                    inventories: {
                      include: {
                        inventory: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!contract) return new BadRequestException(`Contract ${id} not found`);

    return contract;
  }

  async uploadSignage(id: string, file: Express.Multer.File) {
    const contract = await this.prisma.contract.findUnique({
      where: {
        id,
      },
    });

    if (!contract) return new BadRequestException(`Contract ${id} not found`);
    if (contract.signedContractUrl)
      return new BadRequestException(`Contract ${id} already signed`);

    const signedContractUrl = (await this.uploadContractSignage(file))
      .secure_url;

    await this.prisma.contract.update({
      where: {
        id,
      },
      data: {
        signedContractUrl,
        signedAt: new Date(),
      },
    });
  }

  private async uploadContractSignage(file: Express.Multer.File) {
    return await this.cloudinary.uploadFile(file).catch((e) => {
      throw e;
    });
  }
}
