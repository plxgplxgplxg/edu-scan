# ROADMAP TRIỂN KHAI EDUSCAN

> Cập nhật: 2026-03-19

---

## QUY ƯỚC KIẾN TRÚC BACKEND

- Prisma schema là nguồn chân lý cho data model. Không tạo `entity` class riêng kiểu TypeORM.
- Mặc định module đi theo `controller -> service -> PrismaService`.
- Chỉ tạo `repository` khi module có query phức tạp, transaction, analytics, hoặc logic truy vấn được tái sử dụng nhiều nơi.
- Không tạo repository đồng loạt cho tất cả module CRUD đơn giản.
- Raw SQL chỉ dùng cho reporting/analytics hoặc khi Prisma không diễn đạt tốt query cần thiết.

Áp dụng cho EduScan:

- Chưa cần repository riêng cho `auth`.
- Có thể bắt đầu `users` bằng `PrismaService` trực tiếp trong service; chỉ tách `users.repository.ts` nếu phần lọc/phân trang/quyền truy cập phức tạp dần lên.
- Nên có repository cho `classes`, `exams`, `submissions`, `assignments`, `remarks`, `question-bank`, `reports`.

---

## 🔍 TRẠNG THÁI HIỆN TẠI

| Layer           | Trạng thái                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**     | Scaffold rỗng — chỉ có [main.ts](file:///Users/plxg/workspace/edu-scan/backend-nestjs/src/main.ts), [app.module.ts](file:///Users/plxg/workspace/edu-scan/backend-nestjs/src/app.module.ts), thư mục module trống |
| **OMR Service** | [requirements.txt](file:///Users/plxg/workspace/edu-scan/omr-service/requirements.txt) tồn tại, thư mục `app/` rỗng                                                                                               |
| **Mobile App**  | Cấu trúc thư mục tạo sẵn, chưa có file nào                                                                                                                                                                        |

---

## GIAI ĐOẠN 1 — NỀN TẢNG (Foundation)

> Bắt buộc làm trước, mọi thứ khác phụ thuộc vào đây

### 1.1 Backend — Database Schema

- [ ] Thiết kế và viết `prisma/schema.prisma` đầy đủ theo SRS và 3NF thực dụng
- [ ] Bao gồm các model lõi: `User`, `Class`, `ClassEnrollment`, `Exam`, `ExamClass`, `AnswerKey`, `ExamQuestion`, `OmrBatch`, `Submission`, `SubmissionDetail`, `Assignment`, `AssignmentClass`, `AssignmentSubmit`, `RemarkRequest`, `Question`, `Tag`, `QuestionTag`
- [ ] Bổ sung `studentCode` cho user/student flow OMR và cho phép `Submission.studentId` nullable để hỗ trợ `NEEDS_REVIEW`
- [ ] Chạy migration lần đầu
- [ ] Seed data mẫu (admin account)

### 1.2 Backend — Core Infrastructure

- [ ] `database/prisma.service.ts` — wrapper Prisma client
- [ ] `database/database.module.ts`
- [ ] `storage/storage.interface.ts` + `storage/cloudinary.service.ts`
- [ ] `common/guards/jwt-auth.guard.ts` + `roles.guard.ts`
- [ ] `common/decorators/roles.decorator.ts` + `current-user.decorator.ts`
- [ ] `common/filters/http-exception.filter.ts`
- [ ] `common/interceptors/transform.interceptor.ts`
- [ ] `config/` — jwt.config, database.config, cloudinary.config, redis.config

### 1.3 Backend — UC001: Auth Module

> Use case: UC001 — Đăng nhập

- [ ] `modules/auth/dtos/login.dto.ts`
- [ ] `modules/auth/dtos/refresh-token.dto.ts`
- [ ] `modules/auth/strategies/jwt.strategy.ts` + `refresh.strategy.ts`
- [ ] `modules/auth/services/auth.service.ts` (login, refresh, validate user bằng PrismaService trực tiếp)
- [ ] `modules/auth/controllers/auth.controller.ts` (POST /auth/login, POST /auth/refresh)
- [ ] `modules/auth/auth.module.ts`

### 1.4 Backend — UC002: Users Module (Admin)

> Use case: UC002 — Quản lý người dùng

- [ ] `modules/users/dtos/create-user.dto.ts` + `update-user.dto.ts`
- [ ] `modules/users/services/users.service.ts` (CRUD, bcrypt password, dùng PrismaService trực tiếp trước)
- [ ] `modules/users/controllers/users.controller.ts` (GET /users, POST /users, PATCH /users/:id, DELETE /users/:id) — chỉ Admin
- [ ] `modules/users/users.module.ts`
- [ ] Tách `modules/users/repositories/users.repository.ts` nếu xuất hiện nhu cầu phân trang, filter, search, hoặc logic truy vấn lặp lại

---

## GIAI ĐOẠN 2 — CORE TEACHER FEATURES

### 2.1 Backend — UC003: Classes Module

> Use case: UC003 — Quản lý lớp học

- [ ] `modules/classes/dtos/create-class.dto.ts` + `update-class.dto.ts` + `add-student.dto.ts`
- [ ] `modules/classes/repositories/classes.repository.ts`
- [ ] `modules/classes/services/classes.service.ts` (tạo lớp, sinh class code, thêm/xóa học sinh, join bằng code)
- [ ] `modules/classes/controllers/classes.controller.ts`
- [ ] `modules/classes/classes.module.ts`

### 2.2 Backend — UC004: Exams Module

> Use case: UC004 — Tạo đề thi

- [ ] `modules/exams/dtos/create-exam.dto.ts` + `create-answer-key.dto.ts`
- [ ] `modules/exams/repositories/exams.repository.ts`
- [ ] `modules/exams/services/exams.service.ts` (tạo đề, gán nhiều lớp qua `ExamClass`, lưu answer key, map câu hỏi từ question bank nếu có)
- [ ] `modules/exams/controllers/exams.controller.ts`
- [ ] `modules/exams/exams.module.ts`

### 2.3 OMR Service — UC005: OMR Pipeline (FastAPI)

> Use case: UC005 — Chấm bài tự động OMR

- [ ] `app/core/config.py` + `app/core/exceptions.py`
- [ ] `app/domain/models/omr_request.py` + `omr_response.py`
- [ ] `app/infrastructure/image/opencv_processor.py` + `image_validator.py`
- [ ] `app/domain/services/image_processor.py` (tiền xử lý ảnh)
- [ ] `app/domain/services/student_id_detector.py` (nhận diện StudentID từ bubble grid/barcode)
- [ ] `app/domain/services/answer_detector.py` (nhận diện đáp án bằng pixel counting)
- [ ] `app/domain/services/omr_orchestrator.py`
- [ ] `app/api/endpoints/omr.py` (POST /process)
- [ ] `app/main.py`

### 2.4 Backend — UC005: OMR Module (NestJS)

> Nhận kết quả từ OMR Service, xử lý batch async

- [ ] Config Redis + Bull Queue
- [x] Sử dụng model `OmrBatch` để lưu trạng thái `batch_id`, progress, success/fail counts
- [x] `modules/omr/services/omr-client.service.ts` (gọi FastAPI OMR Service)
- [x] `modules/omr/services/image-upload.service.ts` (upload lên Cloudinary)
- [x] `modules/omr/services/grading.service.ts` (so `SubmissionDetail.finalAnswer` với `AnswerKey`, tính điểm ở tầng service/query thay vì lưu dữ liệu dẫn xuất dư thừa)
- [x] `modules/omr/services/batch.service.ts`
- [x] `modules/omr/processors/omr.processor.ts`
- [x] `modules/omr/services/omr.service.ts` (orchestration: nhận upload → xử lý nền)
- [x] `modules/omr/controllers/omr.controller.ts` (POST /omr/upload, GET /omr/batch/:batchId)
- [x] `modules/omr/omr.module.ts`

### 2.5 Backend — Submissions Module

> Phụ trợ cho OMR: lưu kết quả chấm bài

- [ ] `modules/submissions/repositories/submissions.repository.ts`
- [ ] `modules/submissions/services/submissions.service.ts`
- [ ] `modules/submissions/controllers/submissions.controller.ts` (GET /submissions/:id, PATCH /submissions/:id — UC006 Manual Override)
- [ ] `modules/submissions/submissions.module.ts`

### 2.6 Backend — UC006: Manual Override

> Use case: UC006 — Chỉnh sửa kết quả thủ công

- [ ] Endpoint PATCH `/submissions/:id/override` trong submissions controller
- [ ] Logic: cập nhật `SubmissionDetail.finalAnswer`, giữ lại `detectedAnswer`, tính lại điểm, set status = GRADED
- [ ] Hỗ trợ ghép Student ID thủ công khi null

---

## GIAI ĐOẠN 3 — STUDENT FEATURES

### 3.1 Backend — UC009: Student Score View

> Use case: UC009 — Xem kết quả bài thi

- [ ] Endpoint GET `/submissions` (lọc theo student, class, exam)
- [ ] Endpoint GET `/submissions/:id` (chi tiết từng câu + ảnh phiếu)
- [ ] Logic phân quyền: học sinh chỉ xem submission của mình

### 3.2 Backend — UC007 + UC008: Assignments Module

> Use case: UC007 — Quản lý bài tập (Teacher), UC008 — Nộp bài (Student)

- [ ] `modules/assignments/dtos/create-assignment.dto.ts` + `submit-assignment.dto.ts`
- [ ] `modules/assignments/repositories/assignments.repository.ts`
- [ ] `modules/assignments/services/assignments.service.ts` (tạo bài tập, gán nhiều lớp qua `AssignmentClass`, xử lý deadline, logic ON_TIME/LATE, chấm điểm)
- [ ] `modules/assignments/controllers/assignments.controller.ts`
- [ ] `modules/assignments/assignments.module.ts`

### 3.3 Backend — UC010: Remarks Module

> Use case: UC010 — Phúc khảo (Student gửi + Teacher duyệt)

- [ ] `modules/remarks/dtos/create-remark.dto.ts` + `review-remark.dto.ts`
- [ ] `modules/remarks/repositories/remarks.repository.ts`
- [ ] `modules/remarks/services/remarks.service.ts` (tạo yêu cầu theo `submissionDetailId`, teacher duyệt với `reviewerId`, cập nhật điểm nếu APPROVED)
- [ ] `modules/remarks/controllers/remarks.controller.ts`
- [ ] `modules/remarks/remarks.module.ts`

---

## GIAI ĐOẠN 4 — ADVANCED FEATURES

### 4.1 Backend — UC011: Question Bank

> Use case: UC011 — Ngân hàng câu hỏi

- [ ] `modules/question-bank/dtos/create-question.dto.ts` + `filter-question.dto.ts`
- [ ] `modules/question-bank/repositories/question-bank.repository.ts`
- [ ] `modules/question-bank/services/question-bank.service.ts` (CRUD, filter theo môn/độ khó/tag với `Tag` + `QuestionTag` thay vì mảng string)
- [ ] `modules/question-bank/controllers/question-bank.controller.ts`
- [ ] `modules/question-bank/question-bank.module.ts`

### 4.2 Backend — UC012: Reports Module

> Use case: UC012 — Xuất báo cáo

- [ ] `modules/reports/generators/report-generator.interface.ts`
- [ ] `modules/reports/generators/excel-generator.service.ts` (dùng exceljs/xlsx)
- [ ] `modules/reports/generators/pdf-generator.service.ts` (dùng pdfkit/puppeteer)
- [ ] `modules/reports/services/reports.service.ts`
- [ ] `modules/reports/controllers/reports.controller.ts` (GET /reports/class/:classId?format=xlsx|pdf)
- [ ] `modules/reports/reports.module.ts`

### 4.3 Backend — Notifications Module

> Thông báo real-time / push

- [ ] `modules/notifications/services/notifications.service.ts` (gửi thông báo khi batch xong, bài nộp mới, kết quả phúc khảo)
- [ ] Tích hợp vào OMR processor, remarks service, assignments service

---

## GIAI ĐOẠN 5 — MOBILE APP (React Native Expo)

> Làm sau khi toàn bộ API backend ổn định

### 5.1 Core & Shared Setup

- [ ] `core/api/client.ts` — Axios instance + base URL
- [ ] `core/api/interceptors.ts` — gắn JWT header, handle 401 auto-refresh
- [ ] `core/api/endpoints.ts`
- [ ] `core/storage/async-storage.ts`
- [ ] `core/constants/` (colors, routes, config)
- [ ] `shared/components/` (Button, Input, Card, Loading, ErrorBoundary)
- [ ] `shared/hooks/` (useAuth, useApi, useDebounce)

### 5.2 Navigation Setup

- [ ] `navigation/RootNavigator.tsx`
- [ ] `navigation/AuthNavigator.tsx`
- [ ] `navigation/AdminNavigator.tsx`
- [ ] `navigation/TeacherNavigator.tsx`
- [ ] `navigation/StudentNavigator.tsx`

### 5.3 Feature: Auth — UC001

- [ ] `features/auth/screens/LoginScreen.tsx`
- [ ] `features/auth/hooks/useLogin.ts`
- [ ] `features/auth/services/auth.service.ts`
- [ ] `features/auth/store/auth.store.ts` (Zustand)

### 5.4 Feature: Admin — UC002

- [ ] `features/admin/screens/UserManagementScreen.tsx` + `CreateUserScreen.tsx`
- [ ] `features/admin/services/users.service.ts`
- [ ] `features/admin/hooks/useUsers.ts`

### 5.5 Feature: Teacher — UC003, UC004, UC005, UC006

- [ ] `DashboardScreen.tsx`
- [ ] `ClassManagementScreen.tsx` (tạo lớp, thêm/xóa HS)
- [ ] `ExamCreationScreen.tsx` (tạo đề, nhập answer key)
- [ ] `OMRUploadScreen.tsx` (upload ảnh, xem tiến trình batch)
- [ ] `ResultReview.tsx` (manual override)
- [ ] `ReportsScreen.tsx`

### 5.6 Feature: Student — UC008, UC009, UC010

- [ ] `DashboardScreen.tsx` (biểu đồ điểm)
- [ ] `ScoresScreen.tsx` (lịch sử điểm)
- [ ] `AssignmentScreen.tsx` (nộp bài, xem deadline)
- [ ] `RemarkScreen.tsx` (gửi phúc khảo, xem kết quả)

---

## THỨ TỰ ƯU TIÊN TÓM TẮT

```
1 → Schema Prisma + Core Backend (Auth, Users)
2 → Classes + Exams + OMR Service (FastAPI) + OMR Module (NestJS)
3 → Submissions + Manual Override + Student Scores + Assignments + Remarks
4 → Question Bank + Reports + Notifications
5 → Mobile App (toàn bộ sau khi API ổn định)
```

> [!IMPORTANT]
> Nên xây dựng và test từng module backend hoàn chỉnh trước khi sang module tiếp theo.
> Schema Prisma cần được thiết kế thật kỹ ngay từ đầu để tránh migration phức tạp sau.
> Chỉ thêm repository khi module đã có dấu hiệu phức tạp thực sự; tránh tạo sẵn repository/entity cho toàn bộ codebase.
