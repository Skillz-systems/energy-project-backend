import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';

@Module({
  controllers: [DeviceController],
  providers: [DeviceService, OpenPayGoService],
})
export class DeviceModule {}
