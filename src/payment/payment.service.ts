import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMode, PaymentStatus, SalesStatus } from '@prisma/client';
import { EmailService } from '../mailer/email.service';
import { ConfigService } from '@nestjs/config';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly Email: EmailService,
    private readonly config: ConfigService,
    private readonly openPayGo: OpenPayGoService,
    private readonly flutterwaveService: FlutterwaveService,
  ) {}

  async generatePaymentLink(saleId: string, amount: number, email: string) {
    return this.flutterwaveService.generatePaymentLink({
      saleId,
      amount,
      email,
    });
  }

  async generatePaymentPayload(saleId: string, amount: number, email: string) {
    const transactionRef = `sale-${saleId}-${Date.now()}`;

    await this.prisma.payment.create({
      data: {
        saleId,
        amount,
        transactionRef,
        paymentDate: new Date(),
      },
    });

    return {
      amount,
      tx_ref: transactionRef,
      currency: 'NGN',
      customer: {
        email,
      },
      payment_options: 'banktransfer',
      customizations: {
        title: 'Product Purchase',
        description: `Payment for sale ${saleId}`,
        logo: this.config.get<string>('COMPANY_LOGO_URL'),
      },
      meta: {
        saleId,
      },
    };
  }

  async generateStaticAccount(
    saleId: string,
    monthlyPayment: number,
    email: string,
    installmentDuration: string,
    bvn: string,
  ) {
    return this.flutterwaveService.generateStaticAccount(
      saleId,
      monthlyPayment,
      email,
      installmentDuration,
      bvn,
    );
  }

  async verifyPayment(ref: string | number, transaction_id: number) {
    const paymentExist = await this.prisma.payment.findUnique({
      where: {
        transactionRef: ref as string,
      },
      include: {
        sale: true,
      },
    });

    if (!paymentExist)
      throw new BadRequestException(`Payment with ref: ${ref} does not exist.`);

    const res = await this.flutterwaveService.verifyTransaction(transaction_id);

    if (
      paymentExist.paymentStatus === PaymentStatus.FAILED &&
      paymentExist.sale.status === SalesStatus.CANCELLED
    ) {
      const refundResponse = await this.flutterwaveService.refundPayment(
        transaction_id,
        res.data.charged_amount,
      );

      await this.prisma.payment.update({
        where: { id: paymentExist.id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
          paymentResponse: refundResponse,
        },
      });

      throw new BadRequestException(
        'This sale is cancelled already. Refund Initialised!',
      );
    }

    if (paymentExist.paymentStatus !== PaymentStatus.COMPLETED) {
      const paymentData = await this.prisma.payment.update({
        where: { id: paymentExist.id },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          paymentResponse: res,
        },
      });

      await this.handlePostPayment(paymentData);
    }

    return 'success';
  }

  private async handlePostPayment(paymentData: any) {
    const sale = await this.prisma.sales.findUnique({
      where: { id: paymentData.saleId },
      include: {
        saleItems: {
          include: {
            product: true,
            devices: true,
            SaleRecipient: true,
          },
        },
        customer: true,
        installmentAccountDetails: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    const updatedSale = await this.prisma.sales.update({
      where: { id: sale.id },
      data: {
        totalPaid: {
          increment: paymentData.amount,
        },
        status:
          sale.totalPaid + paymentData.amount >= sale.totalPrice
            ? SalesStatus.COMPLETED
            : SalesStatus.IN_INSTALLMENT,
      },
    });

    // Process tokenable devices
    const deviceTokens = [];
    for (const saleItem of sale.saleItems) {
      const saleDevices = saleItem.devices;
      const tokenableDevices = saleDevices.filter(
        (device) => device.isTokenable,
      );
      if (tokenableDevices.length) {
        let tokenDuration: number;
        if (saleItem.paymentMode === PaymentMode.ONE_OFF) {
          // Generate forever token
          tokenDuration = -1; // Represents forever
        } else {
          // Calculate token duration based on payment
          const monthlyPayment =
            (saleItem.totalPrice - saleItem.installmentStartingPrice) /
            saleItem.installmentDuration;
          const monthsCovered = Math.floor(paymentData.amount / monthlyPayment);
          tokenDuration = monthsCovered * 30; // Convert months to days
        }

        for (const device of tokenableDevices) {
          const token = await this.openPayGo.generateToken(
            device,
            tokenDuration,
            Number(device.count),
          );

          deviceTokens.push({
            deviceSerialNumber: device.serialNumber,
            deviceKey: device.key,
            deviceToken: token.finalToken,
          });

          await this.prisma.device.update({
            where: {
              id: device.id,
            },
            data: {
              count: String(token.newCount),
            },
          });
        }
      }
    }

    if (deviceTokens.length) {
      await this.Email.sendMail({
        to: sale.customer.email,
        from: this.config.get<string>('EMAIL_USER'),
        subject: `Here are your device tokens`,
        template: './device-tokens',
        context: {
          tokens: JSON.stringify(deviceTokens, undefined, 4),
        },
      });
    }

    if (sale.installmentAccountDetailsId && !sale.deliveredAccountDetails) {
      await this.Email.sendMail({
        to: sale.customer.email,
        from: this.config.get<string>('EMAIL_USER'),
        subject: `Here is your account details for installment payments`,
        template: './installment-account-details',
        context: {
          details: JSON.stringify(sale.installmentAccountDetails, undefined, 4),
        },
      });

      await this.prisma.sales.update({
        where: {
          id: sale.id,
        },
        data: {
          deliveredAccountDetails: true,
        },
      });
    }

    return updatedSale;
  }
}
