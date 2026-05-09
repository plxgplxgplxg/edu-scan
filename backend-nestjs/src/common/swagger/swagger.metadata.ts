export type SwaggerModuleKey =
  | 'auth'
  | 'users'
  | 'classes'
  | 'exams'
  | 'questions'
  | 'submissions'
  | 'assignments'
  | 'omr'
  | 'remarks'
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

export const SWAGGER_MODULES_METADATA: Record<SwaggerModuleKey, SwaggerModuleMetadata> = {
  auth: {
    key: 'auth',
    title: 'Phân hệ xác thực',
    description:
      'Tài liệu dành cho đăng nhập, làm mới token và các luồng xác thực người dùng.',
    tagName: 'Xác thực',
    tagDescription: 'Đăng nhập, làm mới token và các thao tác xác thực người dùng.',
    docsPath: '/api/docs/auth',
    jsonPath: '/api/docs-json/auth',
    exportFileName: 'openapi.auth.json',
  },
  users: {
    key: 'users',
    title: 'Phân hệ người dùng',
    description:
      'Tài liệu dành cho quản trị người dùng, bao gồm tạo mới, cập nhật, tra cứu và vô hiệu hóa tài khoản.',
    tagName: 'Người dùng',
    tagDescription: 'Quản trị tài khoản người dùng dành cho quản trị viên.',
    docsPath: '/api/docs/users',
    jsonPath: '/api/docs-json/users',
    exportFileName: 'openapi.users.json',
  },
  classes: {
    key: 'classes',
    title: 'Phân hệ lớp học',
    description:
      'Tài liệu dành cho quản lý lớp học, danh sách học sinh và quy trình tham gia lớp.',
    tagName: 'Lớp học',
    tagDescription: 'Quản lý lớp học, học sinh và mã tham gia lớp.',
    docsPath: '/api/docs/classes',
    jsonPath: '/api/docs-json/classes',
    exportFileName: 'openapi.classes.json',
  },
  exams: {
    key: 'exams',
    title: 'Phân hệ đề thi',
    description:
      'Tài liệu dành cho quản lý đề thi, mã đề, đáp án và cấu hình ánh xạ câu hỏi.',
    tagName: 'Đề thi',
    tagDescription: 'Quản lý đề thi, mã đề, đáp án và sơ đồ câu hỏi.',
    docsPath: '/api/docs/exams',
    jsonPath: '/api/docs-json/exams',
    exportFileName: 'openapi.exams.json',
  },
  questions: {
    key: 'questions',
    title: 'Phân hệ câu hỏi',
    description:
      'Tài liệu dành cho ngân hàng câu hỏi của giáo viên, bao gồm tạo mới, lọc, cập nhật và xóa câu hỏi.',
    tagName: 'Câu hỏi',
    tagDescription: 'Ngân hàng câu hỏi của giáo viên.',
    docsPath: '/api/docs/questions',
    jsonPath: '/api/docs-json/questions',
    exportFileName: 'openapi.questions.json',
  },
  submissions: {
    key: 'submissions',
    title: 'Phân hệ bài làm',
    description:
      'Tài liệu dành cho tra cứu bài làm, theo dõi tiến độ và xử lý override thủ công.',
    tagName: 'Bài làm',
    tagDescription: 'Tra cứu bài làm, tiến độ làm bài và override thủ công.',
    docsPath: '/api/docs/submissions',
    jsonPath: '/api/docs-json/submissions',
    exportFileName: 'openapi.submissions.json',
  },
  assignments: {
    key: 'assignments',
    title: 'Phân hệ bài tập',
    description:
      'Tài liệu dành cho quản lý bài tập, nộp bài và chấm điểm giữa giáo viên và học sinh.',
    tagName: 'Bài tập',
    tagDescription: 'Quản lý bài tập, bài nộp và chấm điểm.',
    docsPath: '/api/docs/assignments',
    jsonPath: '/api/docs-json/assignments',
    exportFileName: 'openapi.assignments.json',
  },
  omr: {
    key: 'omr',
    title: 'Phân hệ OMR',
    description:
      'Tài liệu dành cho tải lên batch ảnh OMR, theo dõi xử lý và xem chi tiết kết quả nhận dạng.',
    tagName: 'OMR',
    tagDescription: 'Tải lên batch OMR, chấm bài và theo dõi kết quả xử lý.',
    docsPath: '/api/docs/omr',
    jsonPath: '/api/docs-json/omr',
    exportFileName: 'openapi.omr.json',
  },
  remarks: {
    key: 'remarks',
    title: 'Phân hệ phúc khảo',
    description:
      'Tài liệu dành cho tạo yêu cầu phúc khảo và duyệt kết quả phúc khảo.',
    tagName: 'Phúc khảo',
    tagDescription: 'Yêu cầu phúc khảo của học sinh và quy trình duyệt.',
    docsPath: '/api/docs/remarks',
    jsonPath: '/api/docs-json/remarks',
    exportFileName: 'openapi.remarks.json',
  },
  reports: {
    key: 'reports',
    title: 'Phân hệ báo cáo',
    description:
      'Tài liệu dành cho xuất báo cáo lớp học dưới dạng tệp Excel hoặc PDF.',
    tagName: 'Báo cáo',
    tagDescription: 'Xuất báo cáo lớp học cho giáo viên.',
    docsPath: '/api/docs/reports',
    jsonPath: '/api/docs-json/reports',
    exportFileName: 'openapi.reports.json',
  },
};

export const SWAGGER_MODULES_METADATA_LIST = Object.values(
  SWAGGER_MODULES_METADATA,
);
