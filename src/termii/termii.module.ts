import { Module } from '@nestjs/common';
import { TermiiService } from './termii.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TermiiController } from './termii.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [TermiiController],
  providers: [TermiiService],
})
export class TermiiModule {}
