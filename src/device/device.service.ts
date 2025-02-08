import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { createReadStream } from 'fs';
import * as csvParser from 'csv-parser';
import { MESSAGES } from '../constants';
import { Prisma } from '@prisma/client';
import { ListDevicesQueryDto } from './dto/list-devices.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadBatchDevices(filePath: string) {
    const rows = await this.parseCsv(filePath);

    const filteredRows = rows.filter(
      (row) => row['Serial_Number'] && row['Key'],
    );

    await this.mapDevicesToModel(filteredRows);
    return { message: MESSAGES.CREATED };
  }

  async createDevice(createDeviceDto: CreateDeviceDto) {
    const device = await this.fetchDevice({
      serialNumber: createDeviceDto.serialNumber,
    });

    if (device) throw new BadRequestException(MESSAGES.DEVICE_EXISTS);

    return await this.prisma.device.create({
      data: createDeviceDto,
    });
  }

  async devicesFilter(
    query: ListDevicesQueryDto,
  ): Promise<Prisma.DeviceWhereInput> {
    const {
      search,
      serialNumber,
      startingCode,
      key,
      hardwareModel,
      isTokenable,
      createdAt,
      updatedAt,
    } = query;

    const filterConditions: Prisma.DeviceWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { serialNumber: { contains: search, mode: 'insensitive' } },
                { startingCode: { contains: search, mode: 'insensitive' } },
                { key: { contains: search, mode: 'insensitive' } },
                { hardwareModel: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        serialNumber
          ? { serialNumber: { contains: serialNumber, mode: 'insensitive' } }
          : {},
        startingCode
          ? { startingCode: { contains: startingCode, mode: 'insensitive' } }
          : {},
        key ? { key: { contains: key, mode: 'insensitive' } } : {},
        hardwareModel
          ? { hardwareModel: { contains: hardwareModel, mode: 'insensitive' } }
          : {},
        isTokenable
          ? {
              isTokenable,
            }
          : {},
        createdAt ? { createdAt: new Date(createdAt) } : {},
        updatedAt ? { updatedAt: new Date(updatedAt) } : {},
      ],
    };

    return filterConditions;
  }

  async fetchDevices(query: ListDevicesQueryDto) {
    const { page = 1, limit = 100, sortField, sortOrder } = query;

    const filterConditions = await this.devicesFilter(query);

    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);

    const skip = (pageNumber - 1) * limitNumber;
    const take = limitNumber;

    const orderBy = sortField
      ? {
          [sortField]: sortOrder || 'asc',
        }
      : undefined;

    const totalCount = await this.prisma.device.count({
      where: filterConditions,
    });

    const result = await this.prisma.device.findMany({
      skip,
      take,
      where: {
        ...filterConditions,
      },
      orderBy,
    });

    return {
      devices: result,
      total: totalCount,
      page,
      limit,
      totalPages: limitNumber === 0 ? 0 : Math.ceil(totalCount / limitNumber),
    };
  }

  async fetchDevice(fieldAndValue: Prisma.DeviceWhereUniqueInput) {
    return await this.prisma.device.findUnique({
      where: { ...fieldAndValue },
    });
  }

  async updateDevice(id: string, updateDeviceDto: UpdateDeviceDto) {
    await this.validateDeviceExistsAndReturn({ id });

    return await this.prisma.device.update({
      where: { id },
      data: updateDeviceDto,
    });
  }

  async deleteDevice(id: string) {
    await this.validateDeviceExistsAndReturn({ id });
    await this.prisma.device.delete({
      where: { id },
    });

    return { message: MESSAGES.DELETED };
  }

  async validateDeviceExistsAndReturn(
    fieldAndValue: Prisma.DeviceWhereUniqueInput,
  ) {
    const device = await this.fetchDevice(fieldAndValue);

    if (!device) throw new BadRequestException(MESSAGES.DEVICE_NOT_FOUND);

    return device;
  }

  private async parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results = [];
      createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => {
          const normalizedData = Object.keys(data).reduce((acc, key) => {
            const normalizedKey = key.trim().replace(/\s+/g, '_'); // Replace spaces with underscores
            acc[normalizedKey] = data[key];
            return acc;
          }, {});
          results.push(normalizedData);
        })
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  private async mapDevicesToModel(rows: Record<string, string>[]) {
    const data = rows.map((row) => ({
      serialNumber: row['Serial_Number'],
      deviceName: row['Device_Name'],
      key: row['Key'],
      count: row['Count'],
      timeDivider: row['Time_Divider'],
      firmwareVersion: row['Firmware_Version'],
      hardwareModel: row['Hardware_Model'],
      startingCode: row['Starting_Code'],
      restrictedDigitMode: row['Restricted_Digit_Mode'] == '1',
      isTokenable: row['Tokenable'] == '1',
    }));

    for (const device of data) {
      await this.prisma.device.upsert({
        where: { serialNumber: device.serialNumber },
        update: {},
        create: { ...device },
      });
    }
  }
}
