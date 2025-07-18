import { Test, TestingModule } from '@nestjs/testing';
import { InstallerController } from './installer.controller';
import { InstallerService } from './installer.service';

describe('InstallerController', () => {
  let controller: InstallerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstallerController],
      providers: [InstallerService],
    }).compile();

    controller = module.get<InstallerController>(InstallerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
