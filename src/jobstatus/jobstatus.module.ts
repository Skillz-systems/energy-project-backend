import { Module } from '@nestjs/common';
import { JobStatusService } from './jobstatus.service';
import { BullModule } from '@nestjs/bullmq';
import { DeviceService } from 'src/device/device.service';
import { OpenPayGoService } from 'src/openpaygo/openpaygo.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'device-processing',
    }),
  ],

  providers: [JobStatusService, OpenPayGoService, DeviceService],
  exports: [BullModule],
})
export class JobstatusModule {}
