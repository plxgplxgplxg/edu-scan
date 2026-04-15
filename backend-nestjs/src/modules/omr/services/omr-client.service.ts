import {
  BadGatewayException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { OmrServiceResponse } from '../interfaces/omr-response.interface';

type OmrProcessRequest = {
  imageUrl: string;
  questionCount: number;
};

@Injectable()
export class OmrClientService {
  private readonly logger = new Logger(OmrClientService.name);

  constructor(private readonly configService: ConfigService) {}

  async processImage(payload: OmrProcessRequest): Promise<OmrServiceResponse> {
    const baseUrl =
      this.configService.get<string>('OMR_SERVICE_URL') ||
      this.configService.get<string>('omrService.url') ||
      'http://localhost:8000';

    try {
      const response = await axios.post<OmrServiceResponse>(
        `${baseUrl.replace(/\/$/, '')}/process`,
        payload,
        {
          timeout: 15000,
        },
      );

      this.validateResponse(response.data);
      return response.data;
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }

      const axiosError = error as AxiosError<{ message?: string }>;
      this.logger.error('OMR service request failed', axiosError.message);

      throw new BadGatewayException(
        axiosError.response?.data?.message || 'OMR service request failed',
      );
    }
  }

  private validateResponse(payload: OmrServiceResponse) {
    if (!payload || !Array.isArray(payload.answers)) {
      throw new UnprocessableEntityException(
        'OMR service returned invalid payload',
      );
    }
  }
}
