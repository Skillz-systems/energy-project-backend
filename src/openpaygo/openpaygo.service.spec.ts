import { Test, TestingModule } from '@nestjs/testing';
import { OpenPayGoService } from './openpaygo.service';

describe('OpenPayGoService', () => {
  let service: OpenPayGoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenPayGoService],
    }).compile();

    service = module.get<OpenPayGoService>(OpenPayGoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
