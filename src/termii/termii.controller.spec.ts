import { Test, TestingModule } from '@nestjs/testing';
import { TermiiController } from './termii.controller';
import { TermiiService } from './termii.service';

describe('TermiiController', () => {
  let controller: TermiiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TermiiController],
      providers: [TermiiService],
    }).compile();

    controller = module.get<TermiiController>(TermiiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
