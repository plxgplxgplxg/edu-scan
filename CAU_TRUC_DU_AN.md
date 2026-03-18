# CẤU TRÚC DỰ ÁN EDUSCAN
## Áp dụng SOLID, High Cohesion, Low Coupling

---

## 📁 CẤU TRÚC TỔNG QUAN

```
eduscan-project/
├── backend-nestjs/           # Backend API
├── omr-service/              # OMR Processing Service
├── mobile-app/               # React Native App
├── shared/                   # Shared types & constants
├── docs/                     # Documentation
├── .gitignore
└── README.md
```

---

## 🔧 BACKEND-NESTJS (NestJS + Prisma)

### Cấu trúc theo Domain-Driven Design + SOLID

```
backend-nestjs/
├── src/
│   ├── main.ts                           # Entry point
│   ├── app.module.ts                     # Root module
│   │
│   ├── common/                           # Shared utilities (Low Coupling)
│   │   ├── decorators/                   # Custom decorators
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── guards/                       # Guards (Single Responsibility)
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/                 # Interceptors
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── filters/                      # Exception filters
│   │   │   └── http-exception.filter.ts
│   │   ├── pipes/                        # Validation pipes
│   │   │   └── validation.pipe.ts
│   │   ├── interfaces/                   # Shared interfaces
│   │   │   ├── user.interface.ts
│   │   │   └── response.interface.ts
│   │   └── utils/                        # Helper functions
│   │       ├── date.util.ts
│   │       └── file.util.ts
│   │
│   ├── config/                           # Configuration (Dependency Inversion)
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── cloudinary.config.ts
│   │   └── redis.config.ts
│   │
│   ├── modules/                          # Feature modules (High Cohesion)
│   │   │
│   │   ├── auth/                         # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts        # Interface Segregation
│   │   │   ├── auth.service.ts           # Business logic
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── refresh.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── refresh-token.dto.ts
│   │   │
│   │   ├── users/                        # User management
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts       # Data access layer (SRP)
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   └── update-user.dto.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   │
│   │   ├── classes/                      # Class management
│   │   │   ├── classes.module.ts
│   │   │   ├── classes.controller.ts
│   │   │   ├── classes.service.ts
│   │   │   ├── classes.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-class.dto.ts
│   │   │   │   ├── update-class.dto.ts
│   │   │   │   └── add-student.dto.ts
│   │   │   └── entities/
│   │   │       └── class.entity.ts
│   │   │
│   │   ├── exams/                        # Exam management
│   │   │   ├── exams.module.ts
│   │   │   ├── exams.controller.ts
│   │   │   ├── exams.service.ts
│   │   │   ├── exams.repository.ts
│   │   │   ├── answer-key/               # Sub-domain (High Cohesion)
│   │   │   │   ├── answer-key.service.ts
│   │   │   │   └── answer-key.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-exam.dto.ts
│   │   │   │   └── create-answer-key.dto.ts
│   │   │   └── entities/
│   │   │       ├── exam.entity.ts
│   │   │       └── answer-key.entity.ts
│   │   │
│   │   ├── omr/                          # OMR processing
│   │   │   ├── omr.module.ts
│   │   │   ├── omr.controller.ts
│   │   │   ├── omr.service.ts            # Orchestration
│   │   │   ├── omr-client.service.ts     # External API client (DIP)
│   │   │   ├── omr.processor.ts          # Bull Queue processor
│   │   │   ├── services/                 # Domain services (SRP)
│   │   │   │   ├── image-upload.service.ts
│   │   │   │   ├── grading.service.ts
│   │   │   │   └── batch.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── upload-omr.dto.ts
│   │   │   │   └── omr-result.dto.ts
│   │   │   └── interfaces/
│   │   │       └── omr-response.interface.ts
│   │   │
│   │   ├── submissions/                  # Submission management
│   │   │   ├── submissions.module.ts
│   │   │   ├── submissions.controller.ts
│   │   │   ├── submissions.service.ts
│   │   │   ├── submissions.repository.ts
│   │   │   ├── submission-details/       # Sub-domain
│   │   │   │   ├── submission-details.service.ts
│   │   │   │   └── submission-details.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-submission.dto.ts
│   │   │   │   └── update-submission.dto.ts
│   │   │   └── entities/
│   │   │       ├── submission.entity.ts
│   │   │       └── submission-detail.entity.ts
│   │   │
│   │   ├── assignments/                  # Assignment management
│   │   │   ├── assignments.module.ts
│   │   │   ├── assignments.controller.ts
│   │   │   ├── assignments.service.ts
│   │   │   ├── assignments.repository.ts
│   │   │   ├── assignment-submits/       # Sub-domain
│   │   │   │   ├── assignment-submits.service.ts
│   │   │   │   └── assignment-submits.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-assignment.dto.ts
│   │   │   │   └── submit-assignment.dto.ts
│   │   │   └── entities/
│   │   │       ├── assignment.entity.ts
│   │   │       └── assignment-submit.entity.ts
│   │   │
│   │   ├── remarks/                      # Remark requests
│   │   │   ├── remarks.module.ts
│   │   │   ├── remarks.controller.ts
│   │   │   ├── remarks.service.ts
│   │   │   ├── remarks.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-remark.dto.ts
│   │   │   │   └── review-remark.dto.ts
│   │   │   └── entities/
│   │   │       └── remark-request.entity.ts
│   │   │
│   │   ├── question-bank/                # Question bank
│   │   │   ├── question-bank.module.ts
│   │   │   ├── question-bank.controller.ts
│   │   │   ├── question-bank.service.ts
│   │   │   ├── question-bank.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-question.dto.ts
│   │   │   │   └── filter-question.dto.ts
│   │   │   └── entities/
│   │   │       └── question.entity.ts
│   │   │
│   │   ├── reports/                      # Report generation
│   │   │   ├── reports.module.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.service.ts
│   │   │   ├── generators/               # Strategy pattern (OCP)
│   │   │   │   ├── report-generator.interface.ts
│   │   │   │   ├── excel-generator.service.ts
│   │   │   │   └── pdf-generator.service.ts
│   │   │   └── dto/
│   │   │       └── generate-report.dto.ts
│   │   │
│   │   └── notifications/                # Notification service
│   │       ├── notifications.module.ts
│   │       ├── notifications.service.ts
│   │       └── dto/
│   │           └── send-notification.dto.ts
│   │
│   ├── database/                         # Database layer (DIP)
│   │   ├── database.module.ts
│   │   ├── prisma.service.ts             # Prisma client wrapper
│   │   └── repositories/                 # Base repository
│   │       └── base.repository.ts
│   │
│   └── storage/                          # File storage (DIP)
│       ├── storage.module.ts
│       ├── storage.interface.ts          # Abstraction
│       └── cloudinary.service.ts         # Implementation
│
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── migrations/
│
├── test/                                 # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── .env
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🤖 OMR-SERVICE (FastAPI + OpenCV)

### Cấu trúc theo Clean Architecture

```
omr-service/
├── app/
│   ├── main.py                           # FastAPI app
│   │
│   ├── api/                              # API layer (Interface Adapters)
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── omr.py                    # OMR endpoints
│   │   └── dependencies.py               # Dependency injection
│   │
│   ├── core/                             # Core business logic (Entities)
│   │   ├── __init__.py
│   │   ├── config.py                     # Configuration
│   │   └── exceptions.py                 # Custom exceptions
│   │
│   ├── domain/                           # Domain layer (Use Cases)
│   │   ├── __init__.py
│   │   ├── models/                       # Domain models
│   │   │   ├── __init__.py
│   │   │   ├── omr_request.py
│   │   │   └── omr_response.py
│   │   └── services/                     # Domain services (SRP)
│   │       ├── __init__.py
│   │       ├── image_processor.py        # Image preprocessing
│   │       ├── student_id_detector.py    # Student ID detection
│   │       ├── answer_detector.py        # Answer detection
│   │       └── omr_orchestrator.py       # Orchestration
│   │
│   ├── infrastructure/                   # Infrastructure layer (DIP)
│   │   ├── __init__.py
│   │   ├── image/                        # Image processing
│   │   │   ├── __init__.py
│   │   │   ├── opencv_processor.py       # OpenCV implementation
│   │   │   └── image_validator.py
│   │   └── storage/                      # File storage
│   │       ├── __init__.py
│   │       └── temp_storage.py
│   │
│   └── utils/                            # Utilities (Low Coupling)
│       ├── __init__.py
│       ├── image_utils.py
│       └── validation_utils.py
│
├── tests/                                # Unit tests
│   ├── __init__.py
│   ├── test_image_processor.py
│   └── test_omr_orchestrator.py
│
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 📱 MOBILE-APP (React Native Expo)

### Cấu trúc theo Feature-Based + Clean Architecture

```
mobile-app/
├── src/
│   ├── App.tsx                           # Root component
│   │
│   ├── core/                             # Core layer (DIP)
│   │   ├── api/                          # API client
│   │   │   ├── client.ts                 # Axios instance
│   │   │   ├── interceptors.ts
│   │   │   └── endpoints.ts
│   │   ├── storage/                      # Local storage
│   │   │   ├── storage.interface.ts      # Abstraction
│   │   │   └── async-storage.ts          # Implementation
│   │   └── constants/                    # App constants
│   │       ├── colors.ts
│   │       ├── routes.ts
│   │       └── config.ts
│   │
│   ├── shared/                           # Shared layer (Low Coupling)
│   │   ├── components/                   # Reusable components
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Button.styles.ts
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   ├── Loading/
│   │   │   └── ErrorBoundary/
│   │   ├── hooks/                        # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useApi.ts
│   │   │   └── useDebounce.ts
│   │   ├── utils/                        # Helper functions
│   │   │   ├── date.util.ts
│   │   │   ├── validation.util.ts
│   │   │   └── format.util.ts
│   │   └── types/                        # Shared types
│   │       ├── user.types.ts
│   │       ├── api.types.ts
│   │       └── navigation.types.ts
│   │
│   ├── features/                         # Feature modules (High Cohesion)
│   │   │
│   │   ├── auth/                         # Authentication feature
│   │   │   ├── screens/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── LoginScreen.styles.ts
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useLogin.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts       # API calls
│   │   │   └── store/
│   │   │       └── auth.store.ts         # Zustand store
│   │   │
│   │   ├── admin/                        # Admin feature
│   │   │   ├── screens/
│   │   │   │   ├── UserManagementScreen.tsx
│   │   │   │   └── CreateUserScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── UserList.tsx
│   │   │   │   └── UserForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useUsers.ts
│   │   │   └── services/
│   │   │       └── users.service.ts
│   │   │
│   │   ├── teacher/                      # Teacher feature
│   │   │   ├── screens/
│   │   │   │   ├── DashboardScreen.tsx
│   │   │   │   ├── ClassManagementScreen.tsx
│   │   │   │   ├── ExamCreationScreen.tsx
│   │   │   │   ├── OMRUploadScreen.tsx
│   │   │   │   └── ReportsScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── ClassCard.tsx
│   │   │   │   ├── ExamForm.tsx
│   │   │   │   ├── OMRUploader.tsx
│   │   │   │   └── ResultReview.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useClasses.ts
│   │   │   │   ├── useExams.ts
│   │   │   │   └── useOMR.ts
│   │   │   └── services/
│   │   │       ├── classes.service.ts
│   │   │       ├── exams.service.ts
│   │   │       └── omr.service.ts
│   │   │
│   │   ├── student/                      # Student feature
│   │   │   ├── screens/
│   │   │   │   ├── DashboardScreen.tsx
│   │   │   │   ├── ScoresScreen.tsx
│   │   │   │   ├── AssignmentScreen.tsx
│   │   │   │   └── RemarkScreen.tsx
│   │   │   ├── components/
│   │   │   │   ├── ScoreCard.tsx
│   │   │   │   ├── ScoreChart.tsx
│   │   │   │   └── AssignmentSubmit.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useScores.ts
│   │   │   │   └── useAssignments.ts
│   │   │   └── services/
│   │   │       ├── scores.service.ts
│   │   │       └── assignments.service.ts
│   │   │
│   │   └── notifications/                # Notifications feature
│   │       ├── components/
│   │       │   └── NotificationBadge.tsx
│   │       ├── hooks/
│   │       │   └── useNotifications.ts
│   │       └── services/
│   │           └── notifications.service.ts
│   │
│   └── navigation/                       # Navigation layer
│       ├── RootNavigator.tsx
│       ├── AuthNavigator.tsx
│       ├── AdminNavigator.tsx
│       ├── TeacherNavigator.tsx
│       └── StudentNavigator.tsx
│
├── assets/                               # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
│
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 NGUYÊN TẮC ÁP DỤNG

### 1. SOLID Principles

#### S - Single Responsibility Principle
- Mỗi class/module chỉ có 1 lý do để thay đổi
- VD: `grading.service.ts` chỉ lo tính điểm, không lo upload ảnh

#### O - Open/Closed Principle
- Mở cho mở rộng, đóng cho sửa đổi
- VD: `report-generator.interface.ts` cho phép thêm PDF/Excel generator mới

#### L - Liskov Substitution Principle
- Subclass có thể thay thế base class
- VD: `excel-generator` và `pdf-generator` đều implement `report-generator.interface`

#### I - Interface Segregation Principle
- Không ép client implement interface không dùng
- VD: `auth.controller` chỉ expose login/logout, không có CRUD users

#### D - Dependency Inversion Principle
- Phụ thuộc vào abstraction, không phụ thuộc vào implementation
- VD: `storage.interface.ts` → `cloudinary.service.ts` có thể đổi sang S3

### 2. High Cohesion
- Các thành phần trong 1 module liên quan chặt chẽ
- VD: `exams/` module chứa exam + answer-key (cùng domain)

### 3. Low Coupling
- Giảm phụ thuộc giữa các module
- VD: `omr.service` gọi `omr-client.service` qua interface, không biết FastAPI

---

## 📦 SHARED TYPES (Optional)

```
shared/
├── types/
│   ├── user.types.ts
│   ├── exam.types.ts
│   └── omr.types.ts
└── constants/
    └── roles.constants.ts
```

Dùng chung giữa backend và mobile nếu cần.

---

**Cấu trúc này đảm bảo:**
- ✅ Dễ test (mỗi service độc lập)
- ✅ Dễ maintain (thay đổi 1 chỗ không ảnh hưởng nhiều)
- ✅ Dễ scale (thêm feature mới không phá code cũ)
- ✅ Dễ hiểu (cấu trúc rõ ràng theo domain)
