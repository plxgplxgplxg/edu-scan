import {
  OmrGradeOverlayResponse,
  OmrServiceResponse,
} from './omr-response.interface';

export type OmrDetectRequest = {
  imageUrl: string;
  templateName?: string;
};

export type OmrGradeOverlayRequest = {
  resultJsonPath: string;
  answerKey: Array<{
    questionNumber: number;
    correctAnswer: string;
  }>;
};

export interface OmrTransportClient {
  detectImage(payload: OmrDetectRequest): Promise<OmrServiceResponse>;
  renderGradeOverlay(
    payload: OmrGradeOverlayRequest,
  ): Promise<OmrGradeOverlayResponse>;
}

export const OMR_TRANSPORT_CLIENT = Symbol('OMR_TRANSPORT_CLIENT');
