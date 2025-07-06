import { Injectable, Logger } from '@nestjs/common';
import * as csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);

  async parseSalesFile(file: Express.Multer.File): Promise<{
    data: any[];
    headers: string[];
  }> {
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    this.logger.log(
      `Parsing sales file: ${file.originalname} (${fileExtension})`,
    );

    switch (fileExtension) {
      case '.csv':
        return await this.parseCsvFile(file.buffer);
      case '.xlsx':
      case '.xls':
        return await this.parseExcelFile(file.buffer);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }

  private async parseCsvFile(buffer: Buffer): Promise<{
    data: any[];
    headers: string[];
  }> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let headers: string[] = [];
      let isFirstRow = true;

      const stream = Readable.from(buffer.toString('utf-8'));

      stream
        .pipe(
          csvParser({
            separator: ',',
            mapHeaders: ({ header }) => {
              const cleanHeader = this.cleanHeader(header);
              if (isFirstRow) {
                headers.push(cleanHeader);
              }
              return cleanHeader;
            },
          }),
        )
        .on('headers', (headerList) => {
          headers = headerList.map((h) => this.cleanHeader(h));
          isFirstRow = false;
          this.logger.debug(`CSV Headers detected: ${headers.join(', ')}`);
        })
        .on('data', (data) => {
          // Clean up the data - remove empty fields and trim strings
          const cleanedData = this.cleanRowData(data);

          // Only add rows that have meaningful data
          if (this.hasValidData(cleanedData)) {
            results.push(cleanedData);
          }
        })
        .on('end', () => {
          this.logger.log(
            `CSV parsing completed. Parsed ${results.length} valid rows.`,
          );
          resolve({
            data: results,
            headers: headers,
          });
        })
        .on('error', (error) => {
          this.logger.error('Error parsing CSV file', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
    });
  }

  private async parseExcelFile(buffer: Buffer): Promise<{
    data: any[];
    headers: string[];
  }> {
    try {
      const workbook = XLSX.read(buffer, {
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: false, // Don't include empty cells
      });

      if (workbook.SheetNames.length === 0) {
        throw new Error('Excel file contains no sheets');
      }

      // Use the first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      this.logger.log(`Processing Excel sheet: ${sheetName}`);

      // Convert sheet to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Get array of arrays first
        defval: '', // Default value for empty cells
        blankrows: false, // Skip blank rows
        raw: false, // Format dates and numbers as strings
      });

      if (rawData.length === 0) {
        throw new Error('Excel sheet contains no data');
      }

      // Extract and clean headers from first row
      const headers = (rawData[0] as any[])
        .map((header, index) => {
          if (!header || header.toString().trim() === '') {
            return `Column_${index + 1}`;
          }
          return this.cleanHeader(header.toString());
        })
        .filter((header, index, arr) => {
          // Remove duplicate headers by adding index suffix
          const count = arr.slice(0, index).filter((h) => h === header).length;
          return count === 0 ? header : `${header}_${count + 1}`;
        });

      this.logger.debug(`Excel Headers detected: ${headers.join(', ')}`);

      // Convert remaining rows to objects
      const dataRows = rawData.slice(1); // Skip header row
      const results: any[] = [];

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex] as any[];
        const rowData: any = {};

        // Map each cell to its corresponding header
        for (
          let colIndex = 0;
          colIndex < headers.length && colIndex < row.length;
          colIndex++
        ) {
          const header = headers[colIndex];
          const cellValue = row[colIndex];

          if (
            cellValue !== null &&
            cellValue !== undefined &&
            cellValue !== ''
          ) {
            rowData[header] = this.cleanCellValue(cellValue);
          }
        }

        // Only add rows that have meaningful data
        if (this.hasValidData(rowData)) {
          results.push(rowData);
        }
      }

      this.logger.log(
        `Excel parsing completed. Parsed ${results.length} valid rows from ${dataRows.length} total rows.`,
      );

      return {
        data: results,
        headers: headers,
      };
    } catch (error) {
      this.logger.error('Error parsing Excel file', error);
      throw new Error(`Excel parsing failed: ${error.message}`);
    }
  }

  private cleanHeader(header: string): string {
    if (!header) return 'Unknown_Column';

    return header
      .toString()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s]/g, ' ') // Replace special characters with spaces
      .trim();
  }

  private cleanRowData(data: any): any {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== '') {
        const cleanKey = this.cleanHeader(key);
        const cleanValue = this.cleanCellValue(value);

        if (cleanValue !== null && cleanValue !== '') {
          cleaned[cleanKey] = cleanValue;
        }
      }
    }

    return cleaned;
  }

  private cleanCellValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Handle common empty value representations
      if (
        trimmed === '' ||
        trimmed.toLowerCase() === 'nil' ||
        trimmed.toLowerCase() === 'null' ||
        trimmed.toLowerCase() === 'n/a' ||
        trimmed === '-'
      ) {
        return null;
      }

      return trimmed;
    }

    // Handle dates from Excel
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }

    // Handle numbers
    if (typeof value === 'number') {
      // Check if it's a date serial number from Excel
      if (value > 25569 && value < 50000) {
        // Rough range for years 1970-2037
        try {
          const date = new Date((value - 25569) * 86400 * 1000);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch {
          // If date parsing fails, treat as regular number
        }
      }
      return value;
    }

    return value;
  }

  private hasValidData(row: any): boolean {
    if (!row || typeof row !== 'object') {
      return false;
    }

    const values = Object.values(row);

    // Check if row has at least some meaningful data
    const nonEmptyValues = values.filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        value !== '' &&
        value.toString().trim() !== '',
    );

    // Consider row valid if it has at least 3 non-empty values
    // This helps filter out mostly empty rows
    return nonEmptyValues.length >= 3;
  }
}
