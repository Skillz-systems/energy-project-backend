import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { Express } from 'express';
import { CsvUploadService } from './csv-upload.service';
import {
  CsvFileUploadDto,
  CsvUploadResponseDto,
  CsvUploadStatsDto,
  ProcessCsvDto,
  ValidationResultDto,
  BatchProcessRequestDto,
  SessionStatsRequestDto,
} from './dto/csv-upload.dto';

@ApiTags('CSV Data Migration')
@Controller('csv-upload')
export class CsvUploadController {
  constructor(private readonly csvUploadService: CsvUploadService) {}

  @Post('validate')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Validate CSV/Excel file structure for sales data',
    description:
      'Upload and validate sales CSV file structure without processing data. Checks for required columns and data integrity.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Sales CSV file to validate',
    type: CsvFileUploadDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result with column mapping and data preview',
    type: ValidationResultDto,
  })
  @HttpCode(HttpStatus.OK)
  async validateFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ValidationResultDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedTypes.includes(fileExtension)) {
      throw new BadRequestException(
        'Only CSV and Excel files are allowed (.csv, .xlsx, .xls)',
      );
    }

    // Validate file size (max 100MB for Excel, 50MB for CSV)
    const maxSize =
      fileExtension === '.csv' ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
      );
    }

    return await this.csvUploadService.validateSalesFile(file);
  }

  @Post('process')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Process and import sales data from CSV/Excel file',
    description:
      'Upload and process sales file with automatic data transformation, entity creation, and relationship management.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Sales file to process with optional processing parameters',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV or Excel file containing sales data',
        },
        batchSize: {
          type: 'integer',
          minimum: 10,
          maximum: 500,
          default: 50,
          description: 'Number of records to process per batch',
        },
        skipValidation: {
          type: 'boolean',
          default: false,
          description: 'Skip validation if already validated',
        },
        createMissingEntities: {
          type: 'boolean',
          default: true,
          description: 'Create missing products, categories, etc.',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File processing started with session tracking',
    type: CsvUploadResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async processFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() processCsvDto: ProcessCsvDto,
  ): Promise<CsvUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedTypes.includes(fileExtension)) {
      throw new BadRequestException(
        'Only CSV and Excel files are allowed (.csv, .xlsx, .xls)',
      );
    }

    // Validate file size
    const maxSize =
      fileExtension === '.csv' ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
      );
    }

    return await this.csvUploadService.processSalesFile(file, processCsvDto);
  }

  @Post('process-batch')
  @ApiOperation({
    summary: 'Process specific batch of validated sales data',
    description:
      'Process a specific batch of pre-validated sales data from an ongoing session',
  })
  @ApiBody({
    description: 'Batch processing request',
    type: BatchProcessRequestDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Batch processing result with detailed statistics',
    type: CsvUploadStatsDto,
  })
  @HttpCode(HttpStatus.OK)
  async processBatch(
    @Body() batchRequest: BatchProcessRequestDto,
  ): Promise<CsvUploadStatsDto> {
    return await this.csvUploadService.processBatch(
      batchRequest.sessionId,
      batchRequest.batchIndex,
    );
  }

  @Post('get-upload-stats')
  @ApiOperation({
    summary: 'Get upload session statistics',
    description:
      'Retrieve detailed statistics for an ongoing upload session including progress, errors, and created records',
  })
  @ApiBody({
    description: 'Session stats request',
    type: SessionStatsRequestDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed upload statistics with entity breakdown',
    type: CsvUploadStatsDto,
  })
  @HttpCode(HttpStatus.OK)
  async getUploadStats(
    @Body() statsRequest: SessionStatsRequestDto,
  ): Promise<CsvUploadStatsDto> {
    return await this.csvUploadService.getUploadStats(statsRequest.sessionId);
  }

  @Post('cancel-session')
  @ApiOperation({
    summary: 'Cancel an ongoing upload session',
    description:
      'Cancel processing for a specific session and cleanup resources',
  })
  @ApiBody({
    description: 'Session to cancel',
    type: SessionStatsRequestDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Session cancellation result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        sessionId: { type: 'string' },
        rollbackCompleted: { type: 'boolean' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async cancelSession(@Body() cancelRequest: SessionStatsRequestDto): Promise<{
    success: boolean;
    message: string;
    sessionId: string;
    rollbackCompleted: boolean;
  }> {
    return await this.csvUploadService.cancelSession(cancelRequest.sessionId);
  }

  @Post('retry-failed')
  @ApiOperation({
    summary: 'Retry processing failed records',
    description: 'Retry processing of failed records from a completed session',
  })
  @ApiBody({
    description: 'Session to retry failed records',
    type: SessionStatsRequestDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Retry processing result',
    type: CsvUploadResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async retryFailedRecords(
    @Body() retryRequest: SessionStatsRequestDto,
  ): Promise<CsvUploadResponseDto> {
    return await this.csvUploadService.retryFailedRecords(
      retryRequest.sessionId,
    );
  }
}
