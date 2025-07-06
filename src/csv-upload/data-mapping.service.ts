import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DefaultsGeneratorService } from './defaults-generator.service';
import { SalesRowDto } from './dto/csv-upload.dto';
import {
  SalesStatus,
  PaymentMode,
  CategoryTypes,
  IDType,
  AddressType,
  UserStatus,
  PaymentStatus,
  PaymentMethod,
  InventoryClass,
} from '@prisma/client';

@Injectable()
export class DataMappingService {
  private readonly logger = new Logger(DataMappingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultsGenerator: DefaultsGeneratorService,
  ) {}

  async transformSalesRowToEntities(row: SalesRowDto, generatedDefaults: any) {
    this.logger.debug('Transforming sales row to database entities');

    // Extract and clean data from the row
    const extractedData = this.extractAndValidateData(row);

    // Transform to database entities
    const transformedData = {
      agentData: this.transformAgentData(extractedData, generatedDefaults),
      customerData: this.transformCustomerData(extractedData),
      productData: this.transformProductData(extractedData),
      inventoryData: this.transformInventoryData(extractedData),
      deviceData: this.transformDeviceData(extractedData),
      contractData: this.shouldCreateContract(extractedData)
        ? this.transformContractData(extractedData)
        : null,
      saleData: this.transformSaleData(extractedData),
      paymentData: this.hasInitialPayment(extractedData)
        ? this.transformPaymentData(extractedData)
        : null,
    };

    return transformedData;
  }

  private extractAndValidateData(row: SalesRowDto) {
    // Extract and clean all data from the CSV row
    const extractedData = {
      // Agent information
      salesAgent: this.cleanString(row.salesAgent),

      // Customer basic info
      firstName: this.cleanString(row.firstName) || 'Unknown',
      lastName: this.cleanString(row.lastName) || 'Customer',
      phoneNumber: this.cleanPhoneNumber(row.phoneNumber),
      alternatePhoneNumber: this.cleanPhoneNumber(row.alternatePhoneNumber),

      // Address and location
      installationAddress: this.cleanString(row.installationAddress),
      lga: this.cleanString(row.lga),
      state: this.cleanString(row.state),
      latitude: this.cleanCoordinate(row.latitude),
      longitude: this.cleanCoordinate(row.longitude),

      // Personal details
      gender: this.normalizeGender(row.gender),

      // ID information
      idType: this.normalizeIdType(row.idType),
      idNumber: this.cleanString(row.idNumber),

      // File uploads (URLs or file references)
      passportPhotoUrl: this.cleanString(row.passportPhotoUrl),
      idImageUrl: this.cleanString(row.idImageUrl),
      signedContractUrl: this.cleanString(row.signedContractUrl),

      // Customer category
      customerCategory: this.normalizeCustomerCategory(row.customerCategory),

      // Guarantor information
      guarantorName: this.cleanString(row.guarantorName),
      guarantorNumber: this.cleanPhoneNumber(row.guarantorNumber),

      // Product and payment
      productType: this.cleanString(row.productType) || 'Unknown Product',
      paymentOption: this.normalizePaymentOption(row.paymentOption),
      initialDeposit: this.parseAmount(row.initialDeposit),

      // Device and installation
      serialNumber: this.cleanString(row.serialNumber),
      installerName: this.cleanString(row.installerName),

      // Date
      dateOfRegistration: this.parseDate(row.dateOfRegistration) || new Date(),
    };

    // Validate required fields
    this.validateRequiredFields(extractedData);

    return extractedData;
  }

  private transformAgentData(extractedData: any, generatedDefaults: any) {
    if (!extractedData.salesAgent) {
      return null;
    }

    const agentNames = this.parseFullName(extractedData.salesAgent);
    const username = this.generateUsername(
      agentNames.firstname,
      agentNames.lastname,
    );

    return {
      userData: {
        firstname: agentNames.firstname,
        lastname: agentNames.lastname,
        username: username,
        email: `${username}@gmail.com`,
        password: generatedDefaults.defaultPassword,
        // phone: this.defaultsGenerator.generateNigerianPhone(),
        // location: 'Field Agent',
        // addressType: AddressType.WORK,
        // status: UserStatus.active,
      },
      username,
      firstname: agentNames.firstname,
      lastname: agentNames.lastname,
    };
  }

  private transformCustomerData(extractedData: any) {
    // const email = this.generateCustomerEmail(
    //   extractedData.firstName,
    //   extractedData.lastName,
    //   extractedData.phoneNumber,
    // );
    const email = null

    return {
      firstname: extractedData.firstName,
      lastname: extractedData.lastName,
      phone: extractedData.phoneNumber,
      alternatePhone: extractedData.alternatePhoneNumber || null,
      gender: extractedData.gender || null,
      email: email,
      passportPhotoUrl: extractedData.passportPhotoUrl || null,

      addressType: AddressType.HOME,
      installationAddress: extractedData.installationAddress || null,
      lga: extractedData.lga || null,
      state: extractedData.state || null,
      location: extractedData.installationAddress || null,
      longitude: extractedData.longitude || null,
      latitude: extractedData.latitude || null,

      idType: extractedData.idType || null,
      idNumber: extractedData.idNumber || null,
      idImageUrl: extractedData.idImageUrl || null,

      status: UserStatus.active,
      type: extractedData.customerCategory,
    };
  }

  private transformProductData(extractedData: any) {
    const paymentModes = this.determinePaymentModes(
      extractedData.paymentOption,
    );

    return {
      name: extractedData.productType,
      // description: `Migrated product: ${extractedData.productType}`,
      // currency: 'NGN',
      paymentModes: paymentModes.join(','),
    };
  }

  private transformInventoryData(extractedData: any) {
    // const estimatedPrice = this.defaultsGenerator.estimateProductPrice(
    //   extractedData.productType,
    // );
    const estimatedPrice = 0.0;

    return {
      name: extractedData.productType,
      manufacturerName: 'Unknown',
      sku: this.defaultsGenerator.generateSKU(extractedData.productType),
      status: 'IN_STOCK',
      class: InventoryClass.REGULAR,
      price: estimatedPrice,
      costOfItem: estimatedPrice,
    };
  }

  private transformDeviceData(extractedData: any) {
    if (!extractedData.serialNumber) {
      return null;
    }

    return {
      serialNumber: extractedData.serialNumber,
      key: this.generateDeviceKey(),
      isUsed: true, // Will be marked as used when sold
    };
  }

  private transformContractData(extractedData: any) {
    return {
      initialAmountPaid: extractedData.initialDeposit || 0,

      // Guarantor information
      guarantorFullName: extractedData.guarantorName || null,
      guarantorPhoneNumber: extractedData.guarantorNumber || null,
      guarantorHomeAddress: null,
      guarantorEmail: null,
      guarantorIdType: null,
      guarantorIdNumber: null,
      guarantorIdIssuingCountry: null,
      guarantorIdIssueDate: null,
      guarantorIdExpirationDate: null,
      guarantorNationality: null,
      guarantorDateOfBirth: null,

      // Customer ID information
      idType: extractedData.idType || null,
      idNumber: extractedData.idNumber || null,
      issuingCountry: 'Nigeria',
      issueDate: null,
      expirationDate: null,
      fullNameAsOnID: `${extractedData.firstName} ${extractedData.lastName}`,
      addressAsOnID: extractedData.installationAddress || null,

      signedContractUrl: extractedData.signedContractUrl || null,
      signedAt: extractedData.dateOfRegistration,

      // Default next of kin info
      nextOfKinFullName: null,
      nextOfKinRelationship: null,
      nextOfKinPhoneNumber: null,
      nextOfKinHomeAddress: null,
      nextOfKinEmail: null,
      nextOfKinDateOfBirth: null,
      nextOfKinNationality: null,
    };
  }

  private transformSaleData(extractedData: any) {
    // const estimatedPrice = this.estimateProductPrice(extractedData.productType);
    const estimatedPrice = 144000;
    const paymentMode = this.getPaymentMode(extractedData.paymentOption);
    const totalPaid = extractedData.initialDeposit || 0;

    // Determine sale status based on payment
    let status: SalesStatus = SalesStatus.COMPLETED;
    if (paymentMode === PaymentMode.INSTALLMENT) {
      status = SalesStatus.IN_INSTALLMENT;
      // status =
      //   totalPaid >= estimatedPrice
      //     ? SalesStatus.COMPLETED
      //     : SalesStatus.IN_INSTALLMENT;
    } else {
      status = SalesStatus.COMPLETED;
      // status =
      //   totalPaid >= estimatedPrice
      //     ? SalesStatus.COMPLETED
      //     : SalesStatus.UNPAID;
    }

    return {
      category: CategoryTypes.PRODUCT,
      status: status,
      totalPrice: estimatedPrice,
      totalPaid: totalPaid,
      totalMonthlyPayment:
        paymentMode === PaymentMode.INSTALLMENT
          ? // ? this.calculateMonthlyPayment(estimatedPrice, totalPaid)
            6000
          : 0,
      installmentStartingPrice:
        paymentMode === PaymentMode.INSTALLMENT ? totalPaid : 0,
      totalInstallmentDuration:
        paymentMode === PaymentMode.INSTALLMENT ? 24 : 0,
      paymentMode: paymentMode,
    };
  }

  private transformPaymentData(extractedData: any) {
    if (!extractedData.initialDeposit || extractedData.initialDeposit <= 0) {
      return null;
    }

    return {
      amount: extractedData.initialDeposit,
      paymentStatus: PaymentStatus.COMPLETED,
      paymentDate: extractedData.dateOfRegistration,
      paymentMethod: PaymentMethod.ONLINE,
      notes: 'Initial deposit from CSV import',
    };
  }

  // Helper methods

  private cleanString(value: any): string | null {
    if (!value || typeof value !== 'string') return null;
    const cleaned = value.trim();
    return cleaned === '' || cleaned.toLowerCase() === 'nil' ? null : cleaned;
  }

  private cleanPhoneNumber(phone: any): string {
    // if (!phone) return this.defaultsGenerator.generateNigerianPhone();
    if (!phone) return 'nil';

    const cleaned = phone.toString().replace(/\D/g, '');

    return cleaned;

    // Handle Nigerian phone numbers
    // if (cleaned.startsWith('234')) {
    //   return cleaned;
    // } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    //   return '234' + cleaned.substring(1);
    // } else if (cleaned.length === 10) {
    //   return '234' + cleaned;
    // } else if (cleaned.length >= 10) {
    //   return '234' + cleaned.slice(-10);
    // }

    // return this.defaultsGenerator.generateNigerianPhone();
  }

  private cleanCoordinate(coord: any): string | null {
    if (!coord) return null;
    const num = parseFloat(coord.toString());
    return isNaN(num) ? null : num.toString();
  }

  private normalizeGender(gender: any): string | null {
    if (!gender) return null;
    const g = gender.toString().toLowerCase().trim();
    if (g.startsWith('m') || g === 'male') return 'Male';
    if (g.startsWith('f') || g === 'female') return 'Female';
    return null;
  }

  private normalizeIdType(idType: any): IDType | null {
    if (!idType) return null;

    const type = idType.toString().toLowerCase().trim();
    if (type.includes('nin') || type.includes('national')) return IDType.Nin;
    if (type.includes('passport')) return IDType.Passport;
    if (type.includes('driver') || type.includes('license'))
      return IDType.Driver_License;
    if (type.includes('voter')) return IDType.Voter_ID;
    if (type.includes('social') || type.includes('security'))
      return IDType.Social_Security_Number;

    return idType as IDType;
  }

  private normalizeCustomerCategory(category: any): string {
    if (!category) return 'purchase';
    const cat = category.toString().toLowerCase().trim();

    if (cat === 'lead') return 'lead';
    if (cat === 'purchase') return 'lead';
    else return 'residential';
  }

  private normalizePaymentOption(option: any): string {
    if (!option) return 'one_off';
    const opt = option.toString().toLowerCase().trim();
    if (opt.includes('install') || opt.includes('monthly'))
      return 'installment';
    return 'one_off';
  }

  private parseAmount(amount: any): number {
    if (!amount) return 0;

    // Remove currency symbols and clean
    const cleaned = amount.toString().replace(/[₦$,\s]/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? 0 : parsed;
  }

  private parseDate(dateString: any): Date | null {
    if (!dateString) return null;

    try {
      // Handle various date formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // Try DD/MM/YYYY format
      if (typeof dateString === 'string' && dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed
          const year = parseInt(parts[2]);

          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private parseFullName(fullName: string): {
    firstname: string;
    lastname: string;
  } {
    if (!fullName || fullName.trim() === '') {
      return { firstname: 'Unknown', lastname: 'Agent' };
    }

    const names = fullName
      .trim()
      .split(' ')
      .filter((name) => name.length > 0);

    if (names.length === 0) {
      return { firstname: 'Unknown', lastname: 'Agent' };
    } else if (names.length === 1) {
      return { firstname: names[0], lastname: 'Agent' };
    } else {
      return {
        firstname: names[0],
        lastname: names.slice(1).join(' '),
      };
    }
  }

  private generateUsername(firstname: string, lastname: string): string {
    const base = `${firstname.toLowerCase()}.${lastname.toLowerCase()}`;
    const timestamp = Date.now().toString().slice(-4);
    return `${base}.${timestamp}`;
  }

  private generateCustomerEmail(
    firstname: string,
    lastname: string,
    phone: string,
  ): string {
    const baseEmail = `${firstname.toLowerCase()}.${lastname.toLowerCase()}`;
    const phoneHash = phone.slice(-4);
    return `${baseEmail}.${phoneHash}@gmail.com`;
  }

  private determinePaymentModes(paymentOption: string): string[] {
    const option = paymentOption?.toLowerCase() || '';
    if (option.includes('install') || option.includes('monthly')) {
      return ['ONE_OFF', 'INSTALLMENT'];
    }
    return ['ONE_OFF'];
  }

  private getPaymentMode(paymentOption: string): PaymentMode {
    const option = paymentOption?.toLowerCase() || '';
    if (option.includes('install') || option.includes('monthly')) {
      return PaymentMode.INSTALLMENT;
    }
    return PaymentMode.ONE_OFF;
  }

  private calculateMonthlyPayment(
    totalPrice: number,
    initialDeposit: number,
  ): number {
    const remaining = totalPrice - initialDeposit;
    const months = 12; // Default 12-month installment
    return Math.ceil(remaining / months);
  }

  private generateDeviceKey(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private shouldCreateContract(extractedData: any): boolean {
    // Create contract if we have guarantor info, ID info, or it's an installment payment
    return !!(
      extractedData.guarantorName ||
      extractedData.idType ||
      extractedData.signedContractUrl ||
      extractedData.paymentOption?.toLowerCase().includes('install')
    );
  }

  private hasInitialPayment(extractedData: any): boolean {
    return !!(extractedData.initialDeposit && extractedData.initialDeposit > 0);
  }

  private validateRequiredFields(extractedData: any): void {
    const requiredFields = [
      { field: 'firstName', message: 'First name is required' },
      { field: 'lastName', message: 'Last name is required' },
      { field: 'phoneNumber', message: 'Phone number is required' },
      { field: 'productType', message: 'Product type is required' },
    ];

    const errors: string[] = [];

    for (const { field, message } of requiredFields) {
      if (!extractedData[field] || extractedData[field].trim() === '') {
        errors.push(message);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }
}
