import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaymentMethod,
  PaymentMode,
  PaymentStatus,
  SalesStatus,
} from '@prisma/client';
import { EmailService } from '../mailer/email.service';
import { ConfigService } from '@nestjs/config';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';
import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { TermiiService } from '../termii/termii.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly Email: EmailService,
    private readonly config: ConfigService,
    private readonly openPayGo: OpenPayGoService,
    private readonly flutterwaveService: FlutterwaveService,
    private readonly termiiService: TermiiService,
  ) {}

  async generatePaymentLink(
    saleId: string,
    amount: number,
    email: string,
    transactionRef: string,
  ) {
    return this.flutterwaveService.generatePaymentLink({
      saleId,
      amount,
      email,
      transactionRef,
    });
  }

  async generatePaymentPayload(
    saleId: string,
    amount: number,
    email: string,
    transactionRef: string,
    type: PaymentMethod = PaymentMethod.ONLINE,
  ) {
    if (type === PaymentMethod.ONLINE) {
      await this.prisma.payment.create({
        data: {
          saleId,
          amount,
          transactionRef,
          paymentDate: new Date(),
        },
      });
    }

    const sale = await this.prisma.sales.findFirst({
      where: {
        id: saleId,
      },
      include: {
        saleItems: {
          include: {
            product: true,
            devices: true,
          },
        },
      },
    });

    const financialMargins = await this.prisma.financialSettings.findFirst();

    return {
      sale,
      financialMargins,
      paymentData: {
        amount,
        tx_ref: transactionRef,
        currency: type === PaymentMethod.ONLINE ? 'NGN' : undefined,
        customer: {
          email,
        },
        payment_options:
          type === PaymentMethod.ONLINE ? 'banktransfer' : undefined,
        customizations: {
          title: 'Product Purchase',
          description: `Payment for sale ${saleId}`,
          logo: this.config.get<string>('COMPANY_LOGO_URL'),
        },
        meta: {
          saleId,
        },
      },
    };
  }

  async generateStaticAccount(
    saleId: string,
    email: string,
    bvn: string,
    transactionRef: string,
  ) {
    return this.flutterwaveService.generateStaticAccount(
      saleId,
      email,
      bvn,
      transactionRef,
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

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: paymentExist.id },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
          },
        }),
        this.prisma.paymentResponses.create({
          data: {
            paymentId: paymentExist.id,
            data: refundResponse,
          },
        }),
      ]);

      throw new BadRequestException(
        'This sale is cancelled already. Refund Initialised!',
      );
    }

    if (paymentExist.paymentStatus !== PaymentStatus.COMPLETED) {
      const [paymentData] = await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: paymentExist.id },
          data: {
            paymentStatus: PaymentStatus.COMPLETED,
          },
        }),
        this.prisma.paymentResponses.create({
          data: {
            paymentId: paymentExist.id,
            data: res,
          },
        }),
      ]);

      await this.handlePostPayment(paymentData);
    }

    return 'success';
  }

  async handlePostPayment(paymentData: any) {
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

          await this.prisma.tokens.create({
            data: {
              deviceId: device.id,
              token: String(token.finalToken),
              duration: tokenDuration,
            },
          });
        }
      }
    }

    console.log({ deviceTokens });

    if (deviceTokens.length) {
      if (sale.customer.email) {
        await this.Email.sendMail({
          to: sale.customer.email,
          from: this.config.get<string>('MAIL_FROM'),
          subject: `Here are your device tokens`,
          template: './device-tokens',
          context: {
            tokens: JSON.stringify(deviceTokens, undefined, 4),
          },
        });
      }

      if (sale.customer.phone) {
        try {
          await this.termiiService.sendDeviceTokensSms(
            sale.customer.phone,
            deviceTokens,
            sale.customer.firstname || sale.customer.lastname,
          );
          console.log('Device tokens SMS sent successfully');
        } catch (error) {
          console.error('Failed to send device tokens SMS:', error);
        }
      } else {
        console.warn('Customer phone number not available for SMS');
      }
    }

    if (
      sale.paymentMethod === PaymentMethod.ONLINE &&
      sale.installmentAccountDetailsId &&
      !sale.deliveredAccountDetails
    ) {
      if (sale.customer.email) {
        await this.Email.sendMail({
          to: sale.customer.email,
          from: this.config.get<string>('MAIL_FROM'),
          subject: `Here is your account details for installment payments`,
          template: './installment-account-details',
          context: {
            details: JSON.stringify(
              sale.installmentAccountDetails,
              undefined,
              4,
            ),
          },
        });
      }

      if (sale.customer.phone) {
        try {
          const accountMessage = this.formatInstallmentAccountMessage(
            sale.installmentAccountDetails,
            sale.customer.firstname || sale.customer.lastname,
          );

          await this.termiiService.sendSms({
            to: sale.customer.phone,
            message: accountMessage,
          });
          console.log('Installment account details SMS sent successfully');
        } catch (error) {
          console.error(
            'Failed to send installment account details SMS:',
            error,
          );
        }
      }

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

  private formatInstallmentAccountMessage(
    accountDetails: any,
    customerName?: string,
  ): string {
    const greeting = customerName ? `Dear ${customerName},` : 'Dear Customer,';

    let message = `${greeting}\n\nYour installment payment details:\n\n`;
    message += `Bank: ${accountDetails.bankName}\n`;
    message += `Account: ${accountDetails.accountNumber}\n`;
    message += `Name: ${accountDetails.accountName}\n\n`;
    message += `Use these details for monthly payments.\n\nThank you!`;

    return message;
  }

  async verifyWebhookSignature(payload: any) {
    const txRef = payload?.data?.tx_ref;
    const status = payload?.data?.status;

    if (!txRef || status !== 'successful') {
      console.error('Invalid webhook payload:', payload);
      return;
    }

    const paymentExist = await this.prisma.payment.findUnique({
      where: { transactionRef: txRef },
    });

    if (!paymentExist) {
      console.warn(`Payment not found for txRef: ${txRef}`);
      return;
    }

    await this.prisma.$transaction([
      this.prisma.paymentResponses.create({
        data: {
          paymentId: paymentExist.id,
          data: payload,
        },
      }),
    ]);

    console.log(`Payment updated successfully for txRef: ${txRef}`);
    console.log({ payload });
  }
}
