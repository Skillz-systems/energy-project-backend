import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as Flutterwave from 'flutterwave-node-v3';
import { PaymentStatus } from '@prisma/client';

interface PaymentPayload {
  amount: number;
  email: string;
  saleId: string;
  name?: string;
  phone?: string;
}

@Injectable()
export class FlutterwaveService {
  private flw: any;

  private flwBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.flw = new Flutterwave(
      this.configService.get<string>('FLW_PUBLIC_KEY'),
      this.configService.get<string>('FLW_SECRET_KEY'),
    );

    this.flwBaseUrl = 'https://api.flutterwave.com/v3';
  }

  async generatePaymentLink(paymentDetails: PaymentPayload) {
    const { amount, email, saleId } = paymentDetails;

    const transactionRef = `sale-${saleId}-${Date.now()}`;
    const payload = {
      amount,
      tx_ref: transactionRef,
      currency: 'NGN',
      enckey: this.configService.get<string>('FLW_ENCRYPTION_KEY'),
      customer: {
        email,
      },
      payment_options: 'banktransfer',
      customizations: {
        title: 'Product Purchase',
        description: `Payment for sale ${saleId}`,
        logo: this.configService.get<string>('COMPANY_LOGO_URL'),
      },
      redirect_url: this.configService.get<string>('PAYMENT_REDIRECT_URL'),
      meta: {
        saleId,
      },
    };

    const payment = await this.prisma.payment.create({
      data: {
        saleId,
        amount,
        transactionRef,
        paymentDate: new Date(),
      },
    });

    // Currently, i cannot find a method in the flutterwave
    // sdk to create payment links. That is the
    // reason for the fallback axios request.
    const url = `${this.flwBaseUrl}/payments`;
    try {
      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.configService.get<string>('FLW_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
      });

      if (data.status !== 'success') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            paymentResponse: data,
          },
        });
        throw new HttpException(
          `Payment link not generated ${data.message}`,
          500,
        );
      }
      return data.data;
    } catch (error) {
      console.log({ error });
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          paymentResponse: error,
        },
      });
      throw new Error(`Failed to generate payment link: ${error.message}`);
    }
  }

  async generateStaticAccount(
    saleId: string,
    monthlyPayment: number,
    email: string,
    installmentDuration: string,
    bvn: string,
  ) {
    try {
      const payload = {
        //   amount: monthlyPayment,
        // frequency: installmentDuration,
        bvn,
        is_permanent: true,
        narration: `Please make a bank transfer for the installment payment of sale ${saleId}`,
        email,
      };

      const response = await this.flw.VirtualAcct.create(payload);

      if (response.status !== 'success') {
        throw new HttpException(
          response.message || 'Failed to generate virtual account',
          400,
        );
      }
      return response.data;
    } catch (error) {
      console.log({ error });
      throw new Error(`Failed to generate static account: ${error.message}`);
    }
  }

  async verifyTransaction(transactionId: number) {
    try {
      const response = await this.flw.Transaction.verify({ id: transactionId });

      if (response.status !== 'success' && response.status !== 'completed') {
        throw new HttpException(
          response.message || 'Failed to verify transaction',
          400,
        );
      }
      return response;
    } catch (error) {
      console.log({ error });

      throw new Error(`Failed to verify transaction: ${error.message}`);
    }
  }

  async refundPayment(transactionId: number, amountToRefund: number) {
    try {
      const response = await this.flw.Transaction.refund({
        id: transactionId,
        amount: amountToRefund,
      });
      if (response.status !== 'success' && response.status !== 'completed') {
        throw new HttpException(
          response.message || 'Failed to perform refund',
          400,
        );
      }
      return response;
    } catch (error) {
      console.log({ error });

      throw new Error(`Failed to verify transaction: ${error.message}`);
    }
  }

  async verifyWebhookSignature(signature: string, payload: any) {
    const secretHash = this.configService.get<string>(
      'FLUTTERWAVE_SECRET_HASH',
    );
    // Implement signature verification logic here
    return true; // Replace with actual verification
  }
}
