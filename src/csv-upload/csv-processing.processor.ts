// csv-processing.processor.ts - CREATE this new file
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { CsvUploadService } from './csv-upload.service';
import { DataMappingService } from './data-mapping.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Processor('csv-processing')
export class CsvProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(CsvProcessingProcessor.name);

  constructor(
    private readonly csvUploadService: CsvUploadService,
    private readonly dataMappingService: DataMappingService,
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { sessionId, rowData, rowIndex, generatedDefaults } = job.data;

    try {
      await job.updateProgress(10);

      // Process the sales row (move the logic from processSalesRow here)
      const result = await this.processSalesRowInQueue(
        rowData,
        generatedDefaults,
        rowIndex,
        // job,
      );

      // Update session stats
      await this.csvUploadService.updateSessionProgress(sessionId, {
        processed: true,
        success: true,
        result,
      });

      await job.updateProgress(100);
      return result;
    } catch (error) {
      this.logger.error(`Error processing row ${rowIndex}:`, error);

      // Update session with error
      await this.csvUploadService.updateSessionProgress(sessionId, {
        processed: true,
        success: false,
        error: error.message,
        rowData,
        rowIndex,
      });

      throw error;
    }
  }

  private async processSalesRowInQueue(
    row: any,
    generatedDefaults: any,
    rowIndex: number,
  ): Promise<any> {
    await this.csvUploadService.processSalesRow(
      row,
      generatedDefaults,
      rowIndex,
    );

    return { success: true };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed:`, error);
  }
}
