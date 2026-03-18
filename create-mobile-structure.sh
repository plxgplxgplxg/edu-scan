#!/bin/bash

# Script tạo cấu trúc thư mục mobile-app

cd mobile-app

# Core layer
mkdir -p src/core/api
mkdir -p src/core/storage
mkdir -p src/core/constants

# Shared layer
mkdir -p src/shared/components/Button
mkdir -p src/shared/components/Input
mkdir -p src/shared/components/Card
mkdir -p src/shared/components/Loading
mkdir -p src/shared/components/ErrorBoundary
mkdir -p src/shared/hooks
mkdir -p src/shared/utils
mkdir -p src/shared/types

# Features - Auth
mkdir -p src/features/auth/screens
mkdir -p src/features/auth/components
mkdir -p src/features/auth/hooks
mkdir -p src/features/auth/services
mkdir -p src/features/auth/store

# Features - Admin
mkdir -p src/features/admin/screens
mkdir -p src/features/admin/components
mkdir -p src/features/admin/hooks
mkdir -p src/features/admin/services

# Features - Teacher
mkdir -p src/features/teacher/screens
mkdir -p src/features/teacher/components
mkdir -p src/features/teacher/hooks
mkdir -p src/features/teacher/services

# Features - Student
mkdir -p src/features/student/screens
mkdir -p src/features/student/components
mkdir -p src/features/student/hooks
mkdir -p src/features/student/services

# Features - Notifications
mkdir -p src/features/notifications/components
mkdir -p src/features/notifications/hooks
mkdir -p src/features/notifications/services

# Navigation
mkdir -p src/navigation

# Assets
mkdir -p assets/images
mkdir -p assets/fonts
mkdir -p assets/icons

echo "✅ Đã tạo xong cấu trúc thư mục mobile-app"
