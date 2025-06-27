import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDeviceDto } from './dto/create-device.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { createReadStream } from 'fs';
import * as csvParser from 'csv-parser';
import { MESSAGES } from '../constants';
import { Prisma } from '@prisma/client';
import { ListDevicesQueryDto } from './dto/list-devices.dto';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';

@Injectable()
export class DeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openPayGo: OpenPayGoService,
  ) {}

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

  async createBatchDeviceTokens(filePath: string) {
    const rows = await this.parseCsv(filePath);
    console.log({ filePath, rows });

    const filteredRows = rows.filter(
      (row) => row['Serial_Number'] && row['Key'],
    );

    const data = filteredRows.map((row) => ({
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

    const deviceTokens = [];
    const processedDevices = [];

    for (const deviceData of data) {
      try {
        const device = await this.prisma.device.upsert({
          where: { serialNumber: deviceData.serialNumber },
          update: {
            key: deviceData.key,
            timeDivider: deviceData.timeDivider,
            firmwareVersion: deviceData.firmwareVersion,
            hardwareModel: deviceData.hardwareModel,
            startingCode: deviceData.startingCode,
            restrictedDigitMode: deviceData.restrictedDigitMode,
            updatedAt: new Date(),
          },
          create: {
            serialNumber: deviceData.serialNumber,
            key: deviceData.key,
            count: deviceData.count,
            timeDivider: deviceData.timeDivider,
            firmwareVersion: deviceData.firmwareVersion,
            hardwareModel: deviceData.hardwareModel,
            startingCode: deviceData.startingCode,
            restrictedDigitMode: deviceData.restrictedDigitMode,
            isTokenable: true,
          },
        });

        const duration = -1

        const token = await this.openPayGo.generateToken(
          deviceData,
          duration,
          Number(device.count),
        );

        await this.prisma.device.update({
          where: { id: device.id },
          data: { count: String(token.newCount) },
        });

        // Store token in database
        await this.prisma.tokens.create({
          data: {
            deviceId: device.id,
            token: String(token.finalToken),
            // duration: -1,
            duration,
          },
        });

        deviceTokens.push({
          deviceId: device.id,
          deviceSerialNumber: device.serialNumber,
          deviceKey: device.key,
          deviceToken: token.finalToken,
          duration,
        });

        processedDevices.push(device);
      } catch (error) {
        console.error(
          `Error processing device ${deviceData.serialNumber}:`,
          error,
        );
      }
    }

    return {
      message: MESSAGES.CREATED,
      devicesProcessed: processedDevices.length,
      deviceTokens,
    };
  }

  async generateSingleDeviceToken(deviceId: string, tokenDuration: number) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    // if (!device.isTokenable) {
    //   throw new BadRequestException('This device is not tokenable');
    // }

    try {
      const token = await this.openPayGo.generateToken(
        {
          key: device.key,
          timeDivider: device.timeDivider,
          restrictedDigitMode: device.restrictedDigitMode,
          startingCode: device.startingCode,
        } as any,
        tokenDuration,
        Number(device.count),
      );

      await this.prisma.device.update({
        where: { id: deviceId },
        data: { count: String(token.newCount) },
      });

      const savedToken = await this.prisma.tokens.create({
        data: {
          deviceId: device.id,
          token: String(token.finalToken),
          duration: tokenDuration,
        },
      });

      return {
        message: 'Token generated successfully',
        deviceId: device.id,
        deviceSerialNumber: device.serialNumber,
        tokenId: savedToken.id,
        deviceToken: token.finalToken,
        tokenDuration:
          tokenDuration === -1 ? 'Forever' : `${tokenDuration} days`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate token: ${error.message}`,
      );
    }
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
      fetchFormat,
    } = query;

    // console.log({ fetchFormat });

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

        // fetchFormat === 'used'
        //   ? { isUsed: true }
        //   : fetchFormat === 'unused'
        //     ? { isUsed: false }
        //     : {},

        hardwareModel
          ? { hardwareModel: { contains: hardwareModel, mode: 'insensitive' } }
          : {},
        isTokenable
          ? {
              isTokenable,
            }
          : {},
        createdAt ? { createdAt: { gte: new Date(createdAt) } } : {},
        updatedAt ? { updatedAt: { gte: new Date(updatedAt) } } : {},
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

    const orderBy = {
      [sortField || 'createdAt']: sortOrder || 'asc',
    };

    const totalCount = await this.prisma.device.count({
      where: filterConditions,
    });

    const result = await this.prisma.device.findMany({
      skip,
      take,
      where: {},
      include: {
        _count: {
          select: {
            tokens: true,
          },
        },
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
      include: {
        tokens: true,
      },
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
