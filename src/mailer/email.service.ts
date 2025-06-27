import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { IMail } from './interfaces/mail.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailService: MailerService,
    private readonly prisma: PrismaService,
  ) {}

  async sendMail(value: IMail) {
    try {
      console.log("hellyo from email service");
      await this.mailService.sendMail({
        ...value,
      });
      console.log("hellyo from email233 service");

      return 'Email Sent Successfully';
    } catch (error) {
      console.log(error);

      // to remove the user being created when the mailing fails
      if (value.userId) {
        await this.prisma.user.delete({
          where: {
            id: value.userId,
          },
        });
      }

      throw error;
    }
  }
}
