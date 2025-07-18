import { Module } from '@nestjs/common';
import { InstallerService } from './installer.service';
import { InstallerController } from './installer.controller';

@Module({
  controllers: [InstallerController],
  providers: [InstallerService],
})
export class InstallerModule {}
