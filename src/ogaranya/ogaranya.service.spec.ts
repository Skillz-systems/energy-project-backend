import { Test, TestingModule } from '@nestjs/testing';
import { OgaranyaService } from './ogaranya.service';

describe('OgaranyaService', () => {
  let service: OgaranyaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OgaranyaService],
    }).compile();

    service = module.get<OgaranyaService>(OgaranyaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
