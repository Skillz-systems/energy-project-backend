import { Controller } from '@nestjs/common';
import { CronjobsService } from './cronjobs.service';

@Controller('cronjobs')
export class CronjobsController {
  constructor(private readonly cronjobsService: CronjobsService) {}
}
