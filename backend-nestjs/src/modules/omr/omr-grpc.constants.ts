import { join } from 'node:path';

export const OMR_GRPC_CLIENT_TOKEN = 'OMR_GRPC_PACKAGE';
export const OMR_GRPC_PACKAGE_NAME = 'eduscan.omr.v1';
export const OMR_GRPC_SERVICE_NAME = 'OmrService';

export const getOmrGrpcProtoPath = () => {
  const distPath = join(process.cwd(), 'dist/modules/omr/proto/omr_service.proto');
  const srcPath = join(process.cwd(), 'src/modules/omr/proto/omr_service.proto');

  return process.env.NODE_ENV === 'production' ? distPath : srcPath;
};
