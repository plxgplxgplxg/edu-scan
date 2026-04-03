#!/bin/bash

# Script tạo cấu trúc thư mục omr-service

cd omr-service

# App
mkdir -p app

# API layer
mkdir -p app/api/routes

# Core layer
mkdir -p app/core

# Domain layer
mkdir -p app/domain/models
mkdir -p app/domain/services

# Infrastructure layer
mkdir -p app/infrastructure/image
mkdir -p app/infrastructure/storage

# Utils
mkdir -p app/utils

# Tests
mkdir -p tests

echo "✅ Đã tạo xong cấu trúc thư mục omr-service"
