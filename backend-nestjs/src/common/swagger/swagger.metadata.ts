export type SwaggerModuleKey =
  | 'auth'
  | 'users'
  | 'classes'
  | 'exams'
  | 'submissions'
  | 'assignments'
  | 'omr'
  | 'reports';

export interface SwaggerModuleMetadata {
  key: SwaggerModuleKey;
  title: string;
  description: string;
  tagName: string;
  tagDescription: string;
  docsPath: string;
  jsonPath: string;
  exportFileName: string;
}

export const SWAGGER_GLOBAL_METADATA = {
  version: '1.0.0',
  siteTitle: 'Giao diện Swagger - Edu Scan Backend',
  docsIndexPath: '/api/docs',
  docsAllPath: '/api/docs/all',
  docsJsonAllPath: '/api/docs-json/all',
  exportDirectory: 'docs',
  exportFileName: 'openapi.json',
  allDocumentTitle: 'Tài liệu API tổng hợp Edu Scan Backend',
  allDocumentDescription: [
    'Tài liệu OpenAPI tổng hợp cho backend NestJS của hệ thống Edu Scan.',
    'Mọi phản hồi thành công được chuẩn hóa theo dạng `{ message, statusCode, data }` bởi interceptor phản hồi toàn cục.',
    'Mọi phản hồi lỗi được chuẩn hóa theo dạng `{ statusCode, timestamp, path, message, error }` bởi bộ lọc ngoại lệ toàn cục.',
    'Các endpoint có biểu tượng ổ khóa yêu cầu Bearer access token JWT được cấp từ endpoint `POST /auth/login`.',
  ].join('\n\n'),
  bearerAuthSchemeName: 'bearer',
  bearerAuthDescription:
    'Dán Bearer access token JWT được cấp từ endpoint `POST /auth/login` để thử các endpoint cần xác thực.',
  selectorTitle: 'Chọn phân hệ tài liệu API',
  selectorDescription:
    'Mỗi phân hệ có tài liệu Swagger riêng để người dùng tập trung vào đúng phạm vi chức năng cần tra cứu.',
} as const;

export const SWAGGER_MODULES_METADATA: Record<
  SwaggerModuleKey,
  SwaggerModuleMetadata
> = {
  auth: {
    key: 'auth',
    title: 'auth',
    description:
      'Tài liệu dành cho đăng nhập, làm mới token và các luồng xác thực người dùng.',
    tagName: 'auth',
    tagDescription:
      'Đăng nhập, làm mới token và các thao tác xác thực người dùng.',
    docsPath: '/api/docs/auth',
    jsonPath: '/api/docs-json/auth',
    exportFileName: 'openapi.auth.json',
  },
  users: {
    key: 'users',
    title: 'users',
    description:
      'Tài liệu dành cho quản trị người dùng, bao gồm tạo mới, cập nhật, tra cứu và vô hiệu hóa tài khoản.',
    tagName: 'users',
    tagDescription: 'Quản trị tài khoản người dùng dành cho quản trị viên.',
    docsPath: '/api/docs/users',
    jsonPath: '/api/docs-json/users',
    exportFileName: 'openapi.users.json',
  },
  classes: {
    key: 'classes',
    title: 'classes',
    description:
      'Tài liệu dành cho quản lý lớp học, danh sách học sinh và quy trình tham gia lớp.',
    tagName: 'classes',
    tagDescription: 'Quản lý lớp học, học sinh và mã tham gia lớp.',
    docsPath: '/api/docs/classes',
    jsonPath: '/api/docs-json/classes',
    exportFileName: 'openapi.classes.json',
  },
  exams: {
    key: 'exams',
    title: 'exams',
    description:
      'Tài liệu dành cho quản lý đề kiểm tra trắc nghiệm, mã đề và đáp án.',
    tagName: 'exams',
    tagDescription: 'Quản lý đề kiểm tra trắc nghiệm, mã đề và đáp án.',
    docsPath: '/api/docs/exams',
    jsonPath: '/api/docs-json/exams',
    exportFileName: 'openapi.exams.json',
  },
  submissions: {
    key: 'submissions',
    title: 'submissions',
    description:
      'Tài liệu dành cho tra cứu bài làm, theo dõi tiến độ và xử lý override thủ công.',
    tagName: 'submissions',
    tagDescription: 'Tra cứu bài làm, tiến độ làm bài và override thủ công.',
    docsPath: '/api/docs/submissions',
    jsonPath: '/api/docs-json/submissions',
    exportFileName: 'openapi.submissions.json',
  },
  assignments: {
    key: 'assignments',
    title: 'assignments',
    description:
      'Tài liệu dành cho quản lý bài tập, nộp bài và chấm điểm giữa giáo viên và học sinh.',
    tagName: 'assignments',
    tagDescription: 'Quản lý bài tập, bài nộp và chấm điểm.',
    docsPath: '/api/docs/assignments',
    jsonPath: '/api/docs-json/assignments',
    exportFileName: 'openapi.assignments.json',
  },
  omr: {
    key: 'omr',
    title: 'kiem-tra-trac-nghiem',
    description:
      'Tài liệu dành cho tải lên đợt chấm bài trắc nghiệm, theo dõi xử lý và xem chi tiết kết quả nhận dạng.',
    tagName: 'Kiểm tra trắc nghiệm',
    tagDescription: 'Tải lên đợt chấm bài, chấm bài và theo dõi kết quả xử lý.',
    docsPath: '/api/docs/omr',
    jsonPath: '/api/docs-json/omr',
    exportFileName: 'openapi.omr.json',
  },
  reports: {
    key: 'reports',
    title: 'reports',
    description:
      'Tài liệu dành cho xuất báo cáo lớp học dưới dạng tệp Excel hoặc PDF.',
    tagName: 'reports',
    tagDescription: 'Xuất báo cáo lớp học cho giáo viên.',
    docsPath: '/api/docs/reports',
    jsonPath: '/api/docs-json/reports',
    exportFileName: 'openapi.reports.json',
  },
};

export const SWAGGER_MODULES_METADATA_LIST = Object.values(
  SWAGGER_MODULES_METADATA,
);
