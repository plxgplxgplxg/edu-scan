# OMR Module Spec

- Author: Codex
- Date: 2026-04-14
- Status: Approved for implementation
- Reviewers: Pending

## 1. Context

EduScan đã có các module `auth`, `users`, `classes`, `exams` và Prisma schema cho `OmrBatch`, `Submission`, `SubmissionDetail`, nhưng chưa có backend flow để giáo viên upload ảnh phiếu trả lời, gọi OMR service, lưu kết quả nhận diện và theo dõi tiến trình xử lý batch.

OMR module là cầu nối giữa `backend-nestjs` và `omr-service`. Module này phải kiểm tra quyền sở hữu đề thi, xử lý upload nhiều ảnh, lưu batch tiến trình, chuẩn hóa dữ liệu trả về từ dịch vụ OMR, ánh xạ học sinh theo `studentCode`, tính điểm dựa trên `AnswerKey`, và đánh dấu các trường hợp cần giáo viên rà soát.

Phạm vi hiện tại ưu tiên hoàn thiện backend flow trong một process NestJS, bám theo kiến trúc hiện có của repo: Prisma schema là nguồn chân lý, API theo mô hình `controller -> service -> PrismaService`, chỉ dùng repository cho transaction/query phức tạp, validation bằng DTO + `class-validator`, và không thêm abstraction không có nhu cầu rõ ràng.

## 2. Functional Requirements

- FR-1: Module OMR MUST cung cấp endpoint `POST /omr/upload` cho giáo viên upload nhiều ảnh của một `exam`.
- FR-2: `POST /omr/upload` MUST từ chối request khi `exam` không tồn tại.
- FR-3: `POST /omr/upload` MUST từ chối request khi `exam` không thuộc giáo viên hiện tại.
- FR-4: `POST /omr/upload` MUST từ chối request khi danh sách file upload rỗng.
- FR-5: `POST /omr/upload` MUST từ chối request khi có file không phải định dạng ảnh hợp lệ.
- FR-6: Khi upload hợp lệ, hệ thống MUST tạo `OmrBatch` với `totalFiles`, `processedFiles`, `successCount`, `failedCount`, `status`.
- FR-7: Hệ thống MUST xử lý batch bất đồng bộ so với response của `POST /omr/upload`.
- FR-8: Với từng file hợp lệ, hệ thống MUST upload ảnh qua storage service trước khi gọi `omr-service`.
- FR-9: Hệ thống MUST gọi `omr-service` qua `omr-client.service.ts` và chuẩn hóa lỗi external service thành lỗi nghiệp vụ nội bộ.
- FR-10: Hệ thống MUST validate payload trả về từ `omr-service`; payload không hợp lệ MUST được tính là file thất bại trong batch.
- FR-11: Với payload hợp lệ, hệ thống MUST xác định học sinh bằng `studentCode` trong phạm vi học sinh thuộc các lớp đã gán cho `exam`.
- FR-12: Nếu không map được học sinh, hệ thống MUST vẫn lưu `Submission` và `SubmissionDetail` ở trạng thái `NEEDS_REVIEW`.
- FR-13: Hệ thống MUST lưu `Submission` và `SubmissionDetail` cho từng file OMR parse thành công.
- FR-14: `SubmissionDetail.finalAnswer` MUST mặc định theo `detectedAnswer`.
- FR-15: Hệ thống MUST đánh dấu `needsReview` khi đáp án thiếu, payload báo cần review, hoặc không map được học sinh.
- FR-16: `grading.service.ts` MUST tính điểm dựa trên `AnswerKey` và `SubmissionDetail.finalAnswer` mà không lưu cột điểm dẫn xuất vào Prisma schema.
- FR-17: `Submission.status` MUST là `GRADED` khi map được học sinh và không còn cờ review ở mức submission/detail.
- FR-18: `Submission.status` MUST là `NEEDS_REVIEW` khi không map được học sinh hoặc còn câu trả lời cần review.
- FR-19: Hệ thống MUST cập nhật `OmrBatch.processedFiles`, `successCount`, `failedCount`, `status`, `completedAt` theo tiến độ thực tế.
- FR-20: Module OMR MUST cung cấp endpoint `GET /omr/batch/:batchId` cho giáo viên xem chi tiết batch của chính mình.
- FR-21: `GET /omr/batch/:batchId` MUST từ chối khi batch không tồn tại.
- FR-22: `GET /omr/batch/:batchId` MUST từ chối khi batch không thuộc giáo viên hiện tại.

## 3. Non-Functional Requirements

- NFR-1: API MUST dùng DTO + `ValidationPipe` toàn cục hiện có cho mọi request body đầu vào.
- NFR-2: Mọi lỗi nghiệp vụ MUST được trả về bằng `HttpException` phù hợp với message rõ ràng và HTTP status đúng semantics.
- NFR-3: Xử lý batch MUST không block request upload; response của `POST /omr/upload` phải trả về sau khi tạo batch và kích hoạt xử lý nền.
- NFR-4: Transaction ghi `Submission` + `SubmissionDetail` + cập nhật tiến trình batch MUST là atomic ở mức từng file thành công.
- NFR-5: Thiết kế module SHOULD giữ sẵn điểm ghép nối để sau này thay `omr.processor.ts` sang Bull worker mà không đổi contract API công khai.
- NFR-6: Code MUST bám style module hiện có trong repo, tránh entity TypeORM, tránh abstraction suy đoán.

## 4. Acceptance Criteria

- AC-1 (FR-1, FR-6, FR-7): Given giáo viên sở hữu exam hợp lệ và upload ít nhất 1 ảnh hợp lệ, when gọi `POST /omr/upload`, then API trả về batch vừa tạo với `status` ban đầu và batch được xử lý nền.
- AC-2 (FR-2): Given `examId` không tồn tại, when gọi `POST /omr/upload`, then API trả `404 Exam not found`.
- AC-3 (FR-3): Given `examId` tồn tại nhưng thuộc giáo viên khác, when gọi `POST /omr/upload`, then API trả `403 You do not have access to this exam`.
- AC-4 (FR-4): Given request không có file, when gọi `POST /omr/upload`, then API trả `400 At least one image file is required`.
- AC-5 (FR-5): Given có file không phải `image/jpeg`, `image/png`, `image/jpg`, hoặc `image/webp`, when gọi `POST /omr/upload`, then API trả `400 Unsupported file type: <filename>`.
- AC-6 (FR-10, FR-19): Given một file cho payload OMR không hợp lệ, when batch chạy nền, then file đó được tính `failedCount += 1`, `processedFiles += 1`, và batch kết thúc đúng trạng thái tổng hợp.
- AC-7 (FR-11, FR-12, FR-13, FR-18): Given payload OMR hợp lệ nhưng `studentCode` không map được vào học sinh của exam, when batch xử lý file, then hệ thống vẫn tạo `Submission`/`SubmissionDetail` với `studentId = null` và `status = NEEDS_REVIEW`.
- AC-8 (FR-13, FR-14, FR-16, FR-17): Given payload OMR hợp lệ, map được học sinh và không có câu cần review, when batch xử lý file, then hệ thống lưu submission trạng thái `GRADED` và response batch hiển thị score tính từ `AnswerKey`.
- AC-9 (FR-15, FR-18): Given payload có câu bỏ trống hoặc cờ review, when batch xử lý file, then `SubmissionDetail.needsReview = true` cho câu tương ứng và `Submission.status = NEEDS_REVIEW`.
- AC-10 (FR-20, FR-21, FR-22): Given giáo viên gọi `GET /omr/batch/:batchId`, when batch thuộc sở hữu của giáo viên, then API trả về chi tiết batch; otherwise trả `404` hoặc `403` tương ứng.

## 5. Edge Cases

- EC-1: `omr-service` timeout hoặc trả lỗi 5xx phải được chuyển thành thất bại của từng file, không làm crash toàn batch.
- EC-2: Payload OMR trả về trùng `questionNumber` phải bị coi là dữ liệu nhận diện không hợp lệ.
- EC-3: Payload OMR trả về `questionNumber` ngoài phạm vi `AnswerKey` phải bị coi là dữ liệu nhận diện không hợp lệ.
- EC-4: Payload OMR thiếu danh sách answers hoặc answers rỗng phải bị coi là dữ liệu nhận diện không hợp lệ.
- EC-5: Upload storage thất bại phải được tính là file thất bại và batch vẫn tiếp tục xử lý các file còn lại.
- EC-6: Batch có tất cả file thất bại phải kết thúc với `status = FAILED`.
- EC-7: Batch có cả file thành công và thất bại phải kết thúc với `status = PARTIAL_FAILED`.
- EC-8: Batch có toàn bộ file thành công nhưng có submission `NEEDS_REVIEW` vẫn được tính là file thành công ở cấp batch.

## 6. API Contracts

```ts
type UploadOmrRequest = {
  examId: string;
  files: Express.Multer.File[];
};

type OmrAnswerPayload = {
  questionNumber: number;
  detectedAnswer: "A" | "B" | "C" | "D" | null;
  needsReview?: boolean;
};

type OmrServiceResponse = {
  studentCode: string | null;
  answers: OmrAnswerPayload[];
  needsReview?: boolean;
};

type OmrSubmissionResponse = {
  id: string;
  studentId: string | null;
  studentCode: string | null;
  studentName: string | null;
  imageUrl: string | null;
  status: "GRADED" | "NEEDS_REVIEW" | "FAILED";
  score: number;
  maxScore: number;
  needsReview: boolean;
  details: Array<{
    questionNumber: number;
    detectedAnswer: "A" | "B" | "C" | "D" | null;
    finalAnswer: "A" | "B" | "C" | "D" | null;
    needsReview: boolean;
  }>;
};

type OmrBatchResponse = {
  id: string;
  examId: string;
  teacherId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "PARTIAL_FAILED" | "FAILED";
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  failedCount: number;
  progressPercentage: number;
  completedAt: string | null;
  submissions: OmrSubmissionResponse[];
};
```

Error responses use the global HTTP exception filter already present in the repo.

## 7. Data Models

| Entity             | Fields used                                                                                                         | Notes                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `OmrBatch`         | `id`, `examId`, `teacherId`, `status`, `totalFiles`, `processedFiles`, `successCount`, `failedCount`, `completedAt` | Theo dõi tiến trình batch                           |
| `Submission`       | `examId`, `studentId`, `batchId`, `studentCode`, `imageUrl`, `status`                                               | `studentId` nullable cho `NEEDS_REVIEW`             |
| `SubmissionDetail` | `submissionId`, `questionNumber`, `detectedAnswer`, `finalAnswer`, `needsReview`                                    | Không lưu `correctAnswer` hay `score` dẫn xuất      |
| `Exam`             | `teacherId`, `answerKeys`, `classes`                                                                                | Dùng để kiểm tra quyền, số câu, và mapping học sinh |
| `User`             | `id`, `name`, `studentCode`, `role`, `isActive`                                                                     | Dùng để map học sinh từ `studentCode`               |

## 8. Out of Scope

- OS-1: Manual override cho submission không nằm trong module OMR của lượt này.
- OS-2: Retry queue, dead-letter queue, và persistence lỗi chi tiết theo từng file chưa được triển khai vì schema hiện tại không có bảng log lỗi riêng.
- OS-3: Tích hợp Bull/Redis thật sự ở runtime chưa được bật trong lượt này để tránh thêm phụ thuộc hạ tầng chưa có trong repo; `omr.processor.ts` được giữ queue-ready để gắn sau.
- OS-4: Tự động tạo hoặc sửa dữ liệu `User`, `ClassEnrollment`, `Exam`, `AnswerKey` từ OMR payload là ngoài phạm vi.
