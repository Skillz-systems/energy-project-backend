import { Module } from '@nestjs/common';
import { OpenPayGoService } from './openpaygo.service';
import { OpenpaygoController } from './openpaygo.controller';

@Module({
  controllers: [OpenpaygoController],
  providers: [OpenPayGoService],
})
export class OpenpaygoModule {}
