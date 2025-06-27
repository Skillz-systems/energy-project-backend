import { Test, TestingModule } from '@nestjs/testing';
import { TermiiService } from './termii.service';

describe('TermiiService', () => {
  let service: TermiiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TermiiService],
    }).compile();

    service = module.get<TermiiService>(TermiiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
