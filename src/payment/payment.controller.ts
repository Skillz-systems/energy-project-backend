import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  // UnauthorizedException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
    @InjectQueue('payment-queue') private paymentQueue: Queue,
  ) {}

  @ApiOperation({ summary: 'Verify payment callback' })
  @ApiQuery({
    name: 'tx_ref',
    type: String,
    description: 'Transaction reference',
  })
  @ApiQuery({
    name: 'transaction_id',
    type: Number,
    description: 'Transaction ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  @HttpCode(HttpStatus.OK)
  @Get('verify/callback')
  async verifyPayment(
    @Query('tx_ref') tx_ref: string,
    @Query('transaction_id') transaction_id: number,
  ) {
    try {
      console.log('[CONTROLLER] Starting payment verification for:', {
        tx_ref,
        transaction_id,
      });

      // Check if queue is ready
      await this.paymentQueue.waitUntilReady();
      console.log('[CONTROLLER] Queue is ready');

      const job = await this.paymentQueue.add(
        'verify-payment',
        { tx_ref, transaction_id },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
          delay: 1000, // Add small delay to ensure job is processed
        },
      );

      console.log('[CONTROLLER] Job added successfully:', {
        jobId: job.id,
        jobName: job.name,
        jobData: job.data,
      });

      // Get queue stats for debugging
      const waiting = await this.paymentQueue.getWaiting();
      const active = await this.paymentQueue.getActive();
      const completed = await this.paymentQueue.getCompleted();
      const failed = await this.paymentQueue.getFailed();

      console.log('[CONTROLLER] Queue stats:', {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      });

      return {
        message: 'Payment verification initiated successfully',
        jobId: job.id,
        status: 'processing',
      };
    } catch (error) {
      console.error('[CONTROLLER] Error adding job to queue:', error);

      // Fallback to direct processing if queue fails
      console.log('[CONTROLLER] Falling back to direct processing');
      try {
        await this.paymentService.verifyPayment(tx_ref, transaction_id);
        return { message: 'Payment verified directly (queue failed)' };
      } catch (directError) {
        console.error(
          '[CONTROLLER] Direct processing also failed:',
          directError,
        );
        throw new BadRequestException('Payment verification failed');
      }
    }
  }

  @Get('queue/stats')
  async getQueueStats() {
    try {
      await this.paymentQueue.waitUntilReady();

      const waiting = await this.paymentQueue.getWaiting();
      const active = await this.paymentQueue.getActive();
      const completed = await this.paymentQueue.getCompleted();
      const failed = await this.paymentQueue.getFailed();

      return {
        queueName: this.paymentQueue.name,
        stats: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        },
        recentJobs: {
          waiting: waiting
            .slice(0, 5)
            .map((job) => ({ id: job.id, name: job.name, data: job.data })),
          active: active
            .slice(0, 5)
            .map((job) => ({ id: job.id, name: job.name, data: job.data })),
          completed: completed
            .slice(0, 5)
            .map((job) => ({
              id: job.id,
              name: job.name,
              returnvalue: job.returnvalue,
            })),
          failed: failed
            .slice(0, 5)
            .map((job) => ({
              id: job.id,
              name: job.name,
              failedReason: job.failedReason,
            })),
        },
      };
    } catch (error) {
      console.error('[DEBUG] Error getting queue stats:', error);
      return { error: error.message };
    }
  }

  @Post('test-queue')
  async testQueue() {
    try {
      console.log('[TEST] Testing queue...');

      await this.paymentQueue.waitUntilReady();
      console.log('[TEST] Queue is ready');

      const job = await this.paymentQueue.add(
        'test-job',
        { message: 'This is a test job', timestamp: new Date().toISOString() },
        { removeOnComplete: false, removeOnFail: false },
      );

      console.log('[TEST] Test job added:', job.id);

      return { message: 'Test job added', jobId: job.id };
    } catch (error) {
      console.error('[TEST] Error testing queue:', error);
      return { error: error.message };
    }
  }

  @Post('flw-webhook')
  async handleWebhook(
    @Headers('verif-hash') signature: string,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    // const FLW_WEBHOOK_SECRET = this.config.get<string>('FLW_WEBHOOK_SECRET');

    // if (FLW_WEBHOOK_SECRET !== signature) {
    //   throw new UnauthorizedException();
    // }

    await this.paymentService.verifyWebhookSignature(payload);

    res.status(200).end();
  }
}
