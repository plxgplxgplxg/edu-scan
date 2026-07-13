/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  message: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const accepts = request?.headers?.accept;

    if (typeof accepts === 'string' && accepts.includes('text/event-stream')) {
      return next.handle() as Observable<Response<T>>;
    }

    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        // Nếu API tự trả về format có data/message rồi thì giữ nguyên, không thì wrap lại
        const isAlreadyWrapped = data && typeof data === 'object' && 'data' in data && 'message' in data;
        const returnData = isAlreadyWrapped ? data.data : data;
        const message = isAlreadyWrapped ? data.message : 'Thành công';
        const finalStatusCode = isAlreadyWrapped && data.statusCode ? data.statusCode : statusCode;

        return {
          data: returnData,
          message,
          statusCode: finalStatusCode,
        };
      }),
    );
  }
}
