import { Controller, Post, Body, Headers } from '@nestjs/common';
import { FlutterwaveService } from './flutterwave.service';

@Controller('flutterwave')
export class FlutterwaveController {
  constructor(private readonly flutterwaveService: FlutterwaveService) {}

  @Post('webhooks')
  async handleWebhook(
    @Headers('verif-hash') signature: string,
    @Body() payload: any,
  ) {
    // Verify webhook signature
    const isValid = await this.flutterwaveService.verifyWebhookSignature(
      signature,
      payload,
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Process the webhook payload
    return { status: 'success' };
  }
}
