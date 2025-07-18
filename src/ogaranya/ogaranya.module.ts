import { Module } from '@nestjs/common';
import { OgaranyaService } from './ogaranya.service';

@Module({
  providers: [OgaranyaService],
})
export class OgaranyaModule {}
