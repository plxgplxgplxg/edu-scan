#!/bin/bash

# Script tạo cấu trúc thư mục backend-nestjs

cd backend-nestjs/src

# Common
mkdir -p common/decorators
mkdir -p common/guards
mkdir -p common/interceptors
mkdir -p common/filters
mkdir -p common/pipes
mkdir -p common/interfaces
mkdir -p common/utils

# Config
mkdir -p config

# Modules - Auth
mkdir -p modules/auth/strategies
mkdir -p modules/auth/dto

# Modules - Users
mkdir -p modules/users/dto
mkdir -p modules/users/entities

# Modules - Classes
mkdir -p modules/classes/dto
mkdir -p modules/classes/entities

# Modules - Exams
mkdir -p modules/exams/answer-key
mkdir -p modules/exams/dto
mkdir -p modules/exams/entities

# Modules - OMR
mkdir -p modules/omr/services
mkdir -p modules/omr/dto
mkdir -p modules/omr/interfaces

# Modules - Submissions
mkdir -p modules/submissions/submission-details
mkdir -p modules/submissions/dto
mkdir -p modules/submissions/entities

# Modules - Assignments
mkdir -p modules/assignments/assignment-submits
mkdir -p modules/assignments/dto
mkdir -p modules/assignments/entities

# Modules - Remarks
mkdir -p modules/remarks/dto
mkdir -p modules/remarks/entities

# Modules - Question Bank
mkdir -p modules/question-bank/dto
mkdir -p modules/question-bank/entities

# Modules - Reports
mkdir -p modules/reports/generators
mkdir -p modules/reports/dto

# Modules - Notifications
mkdir -p modules/notifications/dto

# Database
mkdir -p database/repositories

# Storage
mkdir -p storage

# Test
cd ../..
mkdir -p test

echo "✅ Đã tạo xong cấu trúc thư mục backend-nestjs"
