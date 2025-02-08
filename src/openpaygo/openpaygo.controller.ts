import { Controller } from '@nestjs/common';
import { OpenPayGoService } from './openpaygo.service';

@Controller('openpaygo')
export class OpenpaygoController {
  constructor(private readonly OpenPayGoService: OpenPayGoService) {}
}
