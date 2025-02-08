import { Test, TestingModule } from '@nestjs/testing';
import { OpenpaygoController } from './openpaygo.controller';
import { OpenPayGoService } from './openpaygo.service';

describe('OpenpaygoController', () => {
  let controller: OpenpaygoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenpaygoController],
      providers: [OpenPayGoService],
    }).compile();

    controller = module.get<OpenpaygoController>(OpenpaygoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
