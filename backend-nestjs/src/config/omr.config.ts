import { registerAs } from '@nestjs/config';

export default registerAs('omr', () => ({
  grpcUrl: process.env.OMR_GRPC_URL || 'localhost:50051',
}));
