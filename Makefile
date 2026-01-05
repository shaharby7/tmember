.PHONY: help setup dev dev-backend dev-frontend dev-docker stop build build-backend build-frontend test test-backend test-frontend test-integration test-all lint lint-backend lint-frontend format format-backend format-frontend clean install docker-build docker-up docker-down docker-logs docker-health pre-commit-install pre-commit-run

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "Setup:"
	@echo "  setup            - Install development tools and dependencies"
	@echo "  pre-commit-install - Install pre-commit hooks"
	@echo "  pre-commit-run   - Run pre-commit hooks on all files"
	@echo ""
	@echo "Development:"
	@echo "  dev              - Start both services with Docker Compose (debugging enabled)"
	@echo "  dev-backend      - Start backend service only (local)"
	@echo "  dev-frontend     - Start frontend service only (local)"
	@echo "  dev-docker       - Start services with Docker Compose (alias for dev)"
	@echo "  stop             - Stop all running services"
	@echo ""
	@echo "Building:"
	@echo "  build            - Build both services"
	@echo "  build-backend    - Build backend service only"
	@echo "  build-frontend   - Build frontend service only"
	@echo ""
	@echo "Testing:"
	@echo "  test             - Run tests for both services"
	@echo "  test-backend     - Run backend tests only"
	@echo "  test-frontend    - Run frontend tests only"
	@echo "  test-integration - Run integration tests"
	@echo "  test-e2e         - Run end-to-end echo workflow tests"
	@echo "  test-hot-reload  - Run hot reloading functionality tests"
	@echo "  test-docker      - Run Docker environment tests"
	@echo "  test-database    - Run database integration tests"
	@echo "  test-all         - Run all tests including integration"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint             - Lint both services"
	@echo "  lint-backend     - Lint backend code only"
	@echo "  lint-frontend    - Lint frontend code only"
	@echo "  format           - Format code for both services"
	@echo "  format-backend   - Format backend code only"
	@echo "  format-frontend  - Format frontend code only"
	@echo ""
	@echo "Docker Operations:"
	@echo "  docker-build     - Build Docker images"
	@echo "  docker-up        - Start services with Docker Compose"
	@echo "  docker-down      - Stop and remove Docker containers"
	@echo "  docker-logs      - Show logs from Docker containers"
	@echo "  docker-health    - Check health status of services"
	@echo ""
	@echo "Utilities:"
	@echo "  clean            - Clean build artifacts and temporary files"
	@echo "  install          - Install dependencies for all services"

# Setup commands
setup:
	@echo "Setting up development environment..."
	./scripts/setup-dev-tools.sh

pre-commit-install:
	@echo "Installing pre-commit hooks..."
	pre-commit install

pre-commit-run:
	@echo "Running pre-commit hooks on all files..."
	pre-commit run --all-files

# Development commands
dev: docker-up

dev-backend:
	@echo "Starting backend service locally..."
	cd backend && go run cmd/server/main.go

dev-frontend:
	@echo "Starting frontend service locally..."
	cd frontend && npm run dev

dev-docker: docker-up

stop: docker-down

# Build commands
build: build-backend build-frontend

build-backend:
	@echo "Building backend service..."
	cd backend && go build -o bin/server cmd/server/main.go
	@echo "Backend build complete: backend/bin/server"

build-frontend:
	@echo "Building frontend service..."
	cd frontend && npm run build
	@echo "Frontend build complete: frontend/dist/"

# Test commands
test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	cd backend && go test -v ./...

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm run test

test-integration:
	@echo "Running integration tests..."
	cd tests && npm test

test-e2e:
	@echo "Running end-to-end tests..."
	cd tests && npm run test:e2e

test-hot-reload:
	@echo "Running hot reload tests..."
	cd tests && npm run test:hot-reload

test-docker:
	@echo "Running Docker integration tests..."
	cd tests && npm run test:docker

test-database:
	@echo "Running database integration tests..."
	cd tests && npm run test:database
	@echo "Running backend database integration tests..."
	cd backend && INTEGRATION_TEST=true go test -v ./internal/database/integration_test.go

test-all: test-backend test-frontend test-integration

# Lint commands
lint: lint-backend lint-frontend

lint-backend:
	@echo "Linting backend code..."
	cd backend && gofmt -l .
	cd backend && go vet ./...
	@if command -v golint >/dev/null 2>&1; then \
		echo "Running golint..."; \
		cd backend && golint ./...; \
	else \
		echo "golint not installed, run 'make setup' to install..."; \
	fi
	@if command -v staticcheck >/dev/null 2>&1; then \
		echo "Running staticcheck..."; \
		cd backend && staticcheck ./...; \
	else \
		echo "staticcheck not installed, run 'make setup' to install..."; \
	fi

lint-frontend:
	@echo "Linting frontend code..."
	cd frontend && npm run lint

# Format commands
format: format-backend format-frontend

format-backend:
	@echo "Formatting backend code..."
	cd backend && gofmt -w .
	@if command -v goimports >/dev/null 2>&1; then \
		echo "Running goimports..."; \
		cd backend && goimports -w .; \
	else \
		echo "goimports not installed, using gofmt only..."; \
	fi

format-frontend:
	@echo "Formatting frontend code..."
	cd frontend && npm run format

# Docker Compose orchestration commands
docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting services with Docker Compose..."
	docker-compose up --build

docker-down:
	@echo "Stopping Docker services..."
	docker-compose down

docker-logs:
	@echo "Showing Docker container logs..."
	docker-compose logs -f

docker-health:
	@echo "Checking service health..."
	docker-compose ps

# Utility commands
clean:
	@echo "Cleaning build artifacts..."
	rm -rf backend/bin
	rm -rf frontend/dist
	rm -rf backend/tmp
	@echo "Clean complete"

install:
	@echo "Installing dependencies..."
	cd frontend && npm install
	cd tests && npm install
	@echo "Dependencies installed"