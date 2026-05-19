export type OmrSerializedFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  bufferBase64: string;
};

export type OmrQueueJobData = {
  batchId: string;
  examId: string;
  templateName?: string;
  file: OmrSerializedFile;
};
