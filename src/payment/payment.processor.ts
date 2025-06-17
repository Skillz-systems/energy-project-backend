import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentService } from './payment.service';

@Processor('payment-queue')
export class PaymentProcessor extends WorkerHost {
  constructor(private readonly paymentService: PaymentService) {
    super();
  }

  async process(job: Job<{ tx_ref: string; transaction_id: number }>) {
   console.log(`[PROCESSOR] Processing job: ${job.id}, type: ${job.name}`);

   // Check job name to determine what to do
   if (job.name === 'verify-payment') {
     const { tx_ref, transaction_id } = job.data;
     console.log(`[PROCESSOR] Processing payment: ${tx_ref}`);

     try {
       await this.paymentService.verifyPayment(tx_ref, transaction_id);
       console.log(`[PROCESSOR] Payment verified: ${tx_ref}`);
       return { success: true, tx_ref };
     } catch (error) {
       console.error(`[PROCESSOR] Payment error: ${error.message}`);
       throw error; // Rethrow to trigger retry
     }
   }

   return { processed: true };
  }

  @OnWorkerEvent('completed')
  onCompleted() {
    console.log('Completed Payment Queue ✅');
  }
}
