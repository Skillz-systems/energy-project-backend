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
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { EmailService } from '../mailer/email.service';
import { ConfigService } from '@nestjs/config';
import { OpenPayGoService } from '../openpaygo/openpaygo.service';
// import { FlutterwaveService } from '../flutterwave/flutterwave.service';
import { TermiiService } from '../termii/termii.service';
import { OgaranyaService } from '../ogaranya/ogaranya.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly Email: EmailService,
    private readonly config: ConfigService,
    private readonly openPayGo: OpenPayGoService,
    private readonly ogaranyaService: OgaranyaService,
    private readonly walletService: WalletService,
    private readonly termiiService: TermiiService,
  ) {}

  // async generatePaymentLink(
  //   saleId: string,
  //   amount: number,
  //   email: string,
  //   transactionRef: string,
  // ) {
  //   return this.flutterwaveService.generatePaymentLink({
  //     saleId,
  //     amount,
  //     email,
  //     transactionRef,
  //   });
  // }

  async generateWalletTopUpPayment(
    agentId: string,
    amount: number,
    reference: string,
  ) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const paymentData = {
      amount: amount.toString(),
      msisdn: agent.user.phone || '2348000000000',
      desc: `Wallet top-up for agent ${agent.agentId}`,
      reference,
    };

    try {
      const orderResponse = await this.ogaranyaService.createOrder(paymentData);

      const wallet = await this.prisma.wallet.findUnique({
        where: { agentId },
      });

      if (orderResponse.status === 'success') {
        const topUpRequest = await this.prisma.walletTransaction.create({
          data: {
            ogaranyaOrderId: orderResponse.data.order_id,
            ogaranyaOrderRef: orderResponse.data.order_reference,
            ogaranyaSmsNumber: orderResponse.data.msisdn_to_send_to,
            ogaranyaSmsMessage: orderResponse.data.message,
            walletId: wallet.id,
            agentId,
            type: WalletTransactionType.CREDIT,
            amount,
            previousBalance: wallet.balance,
            newBalance: wallet.balance + amount,
            reference,
            description: 'Wallet Topup',
            status: WalletTransactionStatus.PENDING,
          },
        });

        return {
          topUpId: topUpRequest.id,
          orderId: orderResponse.data.order_id,
          orderReference: orderResponse.data.order_reference,
          message: orderResponse.data.message,
          smsNumber: orderResponse.data.msisdn_to_send_to,
          amount,
          reference,
        };
      }

      throw new BadRequestException('Failed to create top-up order');
    } catch (error) {
      throw new BadRequestException(
        `Top-up initiation failed: ${error.message}`,
      );
    }
  }

  async verifyPaymentManually(transactionRef: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef },
      include: { sale: true },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with reference ${transactionRef} not found`,
      );
    }

    if (payment.paymentStatus === PaymentStatus.COMPLETED) {
      return {
        status: 'already_completed',
        message: 'Payment already verified and completed',
        payment,
      };
    }

    try {
      const verificationRef = payment.ogaranyaOrderRef || transactionRef;
      const paymentStatus =
        await this.ogaranyaService.checkPaymentStatus(verificationRef);

      if (paymentStatus.status === 'success') {
        if (paymentStatus.data.status === 'SUCCESSFUL') {
          // Update payment status
          const updatedPayment = await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              paymentStatus: PaymentStatus.COMPLETED,
              updatedAt: new Date(),
            },
          });

          // Store verification response
          await this.prisma.paymentResponses.create({
            data: {
              paymentId: payment.id,
              data: paymentStatus,
            },
          });

          // Process post-payment actions
          await this.handlePostPayment(updatedPayment);

          return {
            status: 'verified',
            message: 'Payment verified successfully',
            payment: updatedPayment,
          };
        } else {
          return {
            status: 'pending',
            message: 'Payment not yet completed. Please try again later.',
            paymentStatus: paymentStatus.data.status,
          };
        }
      } else {
        throw new BadRequestException('Failed to verify payment with Ogaranya');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      throw new BadRequestException(
        'Payment verification failed. Please try again.',
      );
    }
  }

  async verifyWalletTopUpManually(reference: string) {
    const topUpRequest = await this.prisma.walletTransaction.findUnique({
      where: { reference },
      include: { agent: { include: { user: true } } },
    });

    if (!topUpRequest) {
      throw new NotFoundException(
        `Top-up request with reference ${reference} not found`,
      );
    }

    if (topUpRequest.status === WalletTransactionStatus.COMPLETED) {
      return {
        status: 'already_completed',
        message: 'Top-up already verified and completed',
        topUpRequest,
      };
    }

    try {
      // Use order reference for verification
      const verificationRef = topUpRequest.ogaranyaOrderRef || reference;
      const paymentStatus =
        await this.ogaranyaService.checkPaymentStatus(verificationRef);

      if (paymentStatus.status === 'success') {
        if (paymentStatus.data.status === 'SUCCESSFUL') {
          // Credit wallet
          const walletTransaction = await this.walletService.creditWallet(
            topUpRequest.agentId,
            topUpRequest.amount,
            reference,
            `Wallet top-up verified via Ogaranya`,
          );

          // Update top-up status
          const updatedTopUp = await this.prisma.walletTransaction.update({
            where: { id: topUpRequest.id },
            data: {
              status: WalletTransactionStatus.COMPLETED,
              updatedAt: new Date(),
            },
          });

          return {
            status: 'verified',
            message: 'Wallet top-up verified successfully',
            amount: topUpRequest.amount,
            newBalance: walletTransaction.newBalance,
            topUpRequest: updatedTopUp,
          };
        } else {
          return {
            status: 'pending',
            message: 'Payment not yet completed. Please try again later.',
            paymentStatus: paymentStatus.data.status,
          };
        }
      } else {
        throw new BadRequestException('Failed to verify top-up with Ogaranya');
      }
    } catch (error) {
      // Log error and update status
      console.error('Top-up verification error:', error);

      await this.prisma.walletTransaction.update({
        where: { id: topUpRequest.id },
        data: { status: WalletTransactionStatus.FAILED },
      });

      throw new BadRequestException(
        'Top-up verification failed. Please try again.',
      );
    }
  }

  async generatePaymentPayload(
    saleId: string,
    amount: number,
    email: string,
    transactionRef: string,
    type: PaymentMethod = PaymentMethod.ONLINE,
  ) {
    const sale = await this.prisma.sales.findFirst({
      where: { id: saleId },
      include: {
        saleItems: {
          include: {
            product: true,
            devices: true,
          },
        },
        customer: true,
      },
    });

    const financialMargins = await this.prisma.financialSettings.findFirst();

    let paymentResponse;
    let payment;

    if (type === PaymentMethod.ONLINE) {
      const paymentData = {
        amount: amount.toString(),
        msisdn: sale.customer.phone || '2348000000000',
        desc: `Payment for sale ${saleId}`,
        reference: transactionRef,
      };

      console.log({ paymentData });

      try {
        paymentResponse = await this.ogaranyaService.createOrder(paymentData);

        if (paymentResponse.status === 'success') {
          // Store payment with Ogaranya data
          payment = await this.prisma.payment.create({
            data: {
              saleId,
              amount,
              transactionRef,
              paymentDate: new Date(),
              ogaranyaOrderId: paymentResponse.data.order_id,
              ogaranyaOrderRef: paymentResponse.data.order_reference,
              ogaranyaSmsNumber: paymentResponse.data.msisdn_to_send_to,
              ogaranyaSmsMessage: paymentResponse.data.message,
              paymentStatus: PaymentStatus.PENDING,
            },
          });
        } else {
          throw new BadRequestException(
            'Failed to create payment order with Ogaranya',
          );
        }
      } catch (error) {
        throw new BadRequestException(
          `Payment initiation failed: ${error.message}`,
        );
      }
    }

    return {
      sale,
      financialMargins,
      payment,
      paymentData: {
        amount,
        tx_ref: transactionRef,
        ogaranyaResponse: paymentResponse,
        smsInstructions: paymentResponse?.data?.message,
        smsNumber: paymentResponse?.data?.msisdn_to_send_to,
      },
    };
  }

  async getPendingPayments(agentId?: string) {
    const where: any = {
      paymentStatus: PaymentStatus.PENDING,
    };

    if (agentId) {
      const agent = await this.prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (agent) {
        where.sale = {
          creatorId: agent.userId,
        };
      }
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        sale: {
          include: {
            customer: {
              select: {
                firstname: true,
                lastname: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingTopUps(agentId: string) {
    return this.prisma.walletTransaction.findMany({
      where: {
        agentId,
        status: WalletTransactionStatus.PENDING,
        type: WalletTransactionType.CREDIT,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // async generateStaticAccount(
  //   saleId: string,
  //   email: string,
  //   bvn: string,
  //   transactionRef: string,
  // ) {
  //   return this.flutterwaveService.generateStaticAccount(
  //     saleId,
  //     email,
  //     bvn,
  //     transactionRef,
  //   );
  // }

  // async verifyPayment(ref: string | number, transaction_id: number) {
  //   const paymentExist = await this.prisma.payment.findUnique({
  //     where: {
  //       transactionRef: ref as string,
  //     },
  //     include: {
  //       sale: true,
  //     },
  //   });

  //   if (!paymentExist)
  //     throw new BadRequestException(`Payment with ref: ${ref} does not exist.`);

  //   const res = await this.flutterwaveService.verifyTransaction(transaction_id);

  //   if (
  //     paymentExist.paymentStatus === PaymentStatus.FAILED &&
  //     paymentExist.sale.status === SalesStatus.CANCELLED
  //   ) {
  //     const refundResponse = await this.flutterwaveService.refundPayment(
  //       transaction_id,
  //       res.data.charged_amount,
  //     );

  //     await this.prisma.$transaction([
  //       this.prisma.payment.update({
  //         where: { id: paymentExist.id },
  //         data: {
  //           paymentStatus: PaymentStatus.REFUNDED,
  //         },
  //       }),
  //       this.prisma.paymentResponses.create({
  //         data: {
  //           paymentId: paymentExist.id,
  //           data: refundResponse,
  //         },
  //       }),
  //     ]);

  //     throw new BadRequestException(
  //       'This sale is cancelled already. Refund Initialised!',
  //     );
  //   }

  //   if (paymentExist.paymentStatus !== PaymentStatus.COMPLETED) {
  //     const [paymentData] = await this.prisma.$transaction([
  //       this.prisma.payment.update({
  //         where: { id: paymentExist.id },
  //         data: {
  //           paymentStatus: PaymentStatus.COMPLETED,
  //         },
  //       }),
  //       this.prisma.paymentResponses.create({
  //         data: {
  //           paymentId: paymentExist.id,
  //           data: res,
  //         },
  //       }),
  //     ]);

  //     await this.handlePostPayment(paymentData);
  //   }

  //   return 'success';
  // }

  async verifyOgaranyaPayment(orderReference: string) {
    const paymentStatus =
      await this.ogaranyaService.checkPaymentStatus(orderReference);

    if (
      paymentStatus.status === 'success' &&
      paymentStatus.data.status === 'SUCCESSFUL'
    ) {
      const payment = await this.prisma.payment.findFirst({
        where: { transactionRef: orderReference },
        include: { sale: true },
      });

      if (!payment) {
        throw new BadRequestException(
          `Payment with ref: ${orderReference} does not exist.`,
        );
      }

      if (payment.paymentStatus !== PaymentStatus.COMPLETED) {
        const [paymentData] = await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { paymentStatus: PaymentStatus.COMPLETED },
          }),
          this.prisma.paymentResponses.create({
            data: {
              paymentId: payment.id,
              data: paymentStatus,
            },
          }),
        ]);

        await this.handlePostPayment(paymentData);
      }
    }

    return paymentStatus;
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

    const installmentInfo = this.calculateInstallmentProgress(
      sale,
      paymentData.amount,
    );

    console.log({ installmentInfo });

   await this.prisma.sales.update({
      where: { id: sale.id },
      data: {
        totalPaid: {
          increment: paymentData.amount,
        },
        // status:
        //   sale.totalPaid + paymentData.amount >= sale.totalPrice
        //     ? SalesStatus.COMPLETED
        //     : SalesStatus.IN_INSTALLMENT,

        remainingInstallments: installmentInfo.newRemainingDuration,
        status: installmentInfo.newStatus,
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
          // const monthlyPayment =
          //   (saleItem.totalPrice - saleItem.installmentStartingPrice) /
          //   saleItem.installmentDuration;
          // const monthsCovered = Math.floor(paymentData.amount / monthlyPayment);
          // tokenDuration = monthsCovered * 30; // Convert months to days

          tokenDuration =
            installmentInfo.monthsCovered == -1
              ? installmentInfo.monthsCovered
              : installmentInfo.monthsCovered * 30;
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
  }

  private calculateInstallmentProgress(sale: any, paymentAmount: number) {
    const currentTotalPaid = sale.totalPaid - sale.totalMiscellaneousPrice;
    const newTotalPaid = currentTotalPaid + paymentAmount;
    const totalPrice = sale.totalPrice;
    const monthlyPayment = sale.totalMonthlyPayment;
    const currentRemainingDuration = sale.remainingInstallments || 0;
    const originalDuration = sale.totalInstallmentDuration || 0;

    // Check if sale is fully paid
    if (newTotalPaid >= totalPrice) {
      return {
        newStatus: SalesStatus.COMPLETED,
        newRemainingDuration: 0,
        monthsCovered: -1, // Forever token
      };
    }

    // For non-installment sales, don't change duration
    if (monthlyPayment <= 0) {
      return {
        newStatus:
          newTotalPaid >= totalPrice
            ? SalesStatus.COMPLETED
            : SalesStatus.UNPAID,
        newRemainingDuration: currentRemainingDuration,
        monthsCovered: 0,
      };
    }

    const totalMonthsCoveredByAllPayments = Math.floor(
      newTotalPaid / monthlyPayment,
    );
    const previousMonthsCovered = Math.floor(currentTotalPaid / monthlyPayment);

    // Months covered by this specific payment
    const monthsCoveredByThisPayment =
      totalMonthsCoveredByAllPayments - previousMonthsCovered;

    let newRemainingDuration = Math.max(
      0,
      originalDuration - totalMonthsCoveredByAllPayments,
    );

    const remainingBalance = totalPrice - newTotalPaid;
    if (remainingBalance <= monthlyPayment && remainingBalance > 0) {
      newRemainingDuration = Math.min(newRemainingDuration, 1);
    }

    const newStatus =
      newRemainingDuration === 0
        ? SalesStatus.COMPLETED
        : SalesStatus.IN_INSTALLMENT;

    return {
      newStatus,
      newRemainingDuration,
      monthsCovered: monthsCoveredByThisPayment,
    };
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
