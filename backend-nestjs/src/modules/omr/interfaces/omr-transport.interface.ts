import {
  OmrGradeOverlayResponse,
  OmrServiceResponse,
} from './omr-response.interface';

export type OmrDetectRequest = {
  imageUrl: string;
  templateName?: string;
};

export enum OmrMarkStatus {
  CORRECT = 'CORRECT',
  WRONG = 'WRONG',
  REVIEW = 'REVIEW',
}

export type OmrQuestionMark = {
  questionNumber: number;
  status: OmrMarkStatus;
};

export type OmrGradeOverlayRequest = {
  resultJsonPath: string;
  marks: OmrQuestionMark[];
};

export interface OmrTransportClient {
  detectImage(payload: OmrDetectRequest): Promise<OmrServiceResponse>;
  renderGradeOverlay(
    payload: OmrGradeOverlayRequest,
  ): Promise<OmrGradeOverlayResponse>;
}

export const OMR_TRANSPORT_CLIENT = Symbol('OMR_TRANSPORT_CLIENT');
