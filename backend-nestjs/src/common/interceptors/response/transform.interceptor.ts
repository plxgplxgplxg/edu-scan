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
        const returnData = data?.data !== undefined ? data.data : data;
        const message = data?.message || 'Thành công';
        return {
          data: returnData,
          message,
          statusCode,
        };
      }),
    );
  }
}
