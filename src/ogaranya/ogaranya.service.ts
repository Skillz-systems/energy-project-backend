import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto'; 
import ft from 'node-fetch';

@Injectable()
export class OgaranyaService {
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly token: string;
  private readonly privateKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('OGARANYA_BASE_URL');
    this.merchantId = this.config.get<string>('OGARANYA_MERCHANT_ID');
    this.token = this.config.get<string>('OGARANYA_TOKEN');
    this.privateKey = this.config.get<string>('OGARANYA_PRIVATE_KEY');
  }

  private generatePublicKey(): string {
    return crypto.createHash('sha512').update(this.token + this.privateKey).digest('hex');
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Token': this.token,
      'Public_key': this.generatePublicKey(),
    };
  }

  async createUserWallet(walletData: {
    firstname: string;
    surname: string;
    account_name?: string;
    phone: string;
    gender: string;
    dob: string;
    bvn: string;
  }) {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/wallet`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(walletData),
    });
    return response.json();
  }

  async creditUserWallet(data: {
    phone: string;
    account_number: string;
    amount: string;
  }) {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/wallet/credit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async debitUserWallet(data: {
    phone: string;
    account_number: string;
    amount: string;
    payment_gateway_code: string;
  }) {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/wallet/debit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getWalletInfo(data: {
    phone: string;
    account_number: string;
  }) {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/wallet/info`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getWalletHistory(data: {
    phone: string;
    account_number: string;
    from: string;
    to: string;
  }) {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/wallet/history`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async createOrder(data: {
    amount: string;
    msisdn: string;
    desc: string;
    reference: string;
  }) {
    const url = `${this.baseUrl}/${this.merchantId}/pay/NG`
    const response = await ft(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async initiatePayment(data: {
    amount: string;
    msisdn: string;
    desc: string;
    reference: string;
    child_merchant_id?: string;
  }, paymentGatewayCode: string) {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/pay/NG/${paymentGatewayCode}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async checkPaymentStatus(orderReference: string) {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/payment/${orderReference}/status/NG`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async getPaymentGateways() {
    const response = await ft(`${this.baseUrl}/${this.merchantId}/payment/gateway`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return response.json();
  }
}