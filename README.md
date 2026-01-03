# TMember Monorepo

A full-stack web application built using a monorepo architecture with Go backend and Vue.js frontend.

## Project Structure

```
tmember-monorepo/
├── .devcontainer/     # VS Code development container configuration
├── backend/           # Go backend service
├── frontend/          # Vue.js + Vite frontend application
├── tests/             # Integration and end-to-end tests
├── scripts/           # Development and setup scripts
├── Makefile           # Primary development interface
├── docker-compose.yml # Container orchestration for development
└── README.md          # This file
```

## Prerequisites

- Node.js (>=18.0.0)
- Go (>=1.19)
- Docker and Docker Compose
- Make (for running development commands)

## Quick Start

### Setup Development Environment
```bash
make setup
```

### Start Development Services
```bash
make dev
```

### Run Tests
```bash
make test-all
```

## Available Commands

Run `make help` to see all available commands. Key commands include:

### Development
- `make dev` - Start both services with Docker Compose
- `make dev-backend` - Start backend service only (local)
- `make dev-frontend` - Start frontend service only (local)
- `make stop` - Stop all running services

### Building
- `make build` - Build both backend and frontend
- `make build-backend` - Build backend service only
- `make build-frontend` - Build frontend service only

### Testing
- `make test` - Run tests for both services
- `make test-all` - Run all tests including integration
- `make test-integration` - Run integration tests only

### Code Quality
- `make lint` - Lint both backend and frontend code
- `make format` - Format all code
- `make clean` - Clean build artifacts

## Services

### Backend (Go)
- **Port**: 8080
- **API Base**: http://localhost:8080/api
- **Health Check**: http://localhost:8080/api/health

### Frontend (Vue.js + Vite)
- **Port**: 3000
- **URL**: http://localhost:3000
- **Hot Module Replacement**: Enabled in development

## Development Workflow

### Option 1: VS Code Dev Containers (Recommended)
1. Open the project in VS Code
2. Install the "Dev Containers" extension
3. Press `Ctrl+Shift+P` and select "Dev Containers: Reopen in Container"
4. VS Code will build and start the development environment automatically
5. Access frontend at http://localhost:3000 and backend at http://localhost:8080/api

### Option 2: Local Development
1. Clone the repository
2. Setup development environment: `make setup`
3. Install dependencies: `make install`
4. Start development environment: `make dev`
5. Access frontend at http://localhost:3000
6. Backend API available at http://localhost:8080/api

### Debugging
To debug the Go backend:
1. Start development environment: `make dev`
2. In VS Code/Kiro, go to Run and Debug (`Ctrl+Shift+D`)
3. Select "Debug Go Backend (Attach to Container)"
4. Set breakpoints in your Go code and start debugging

The backend always runs with debugging enabled in development mode.

**Note:** The `.devcontainer/` directory contains VS Code development container configuration with hot reloading and debugging support. These are not suitable for production use.

For detailed development information, see [DEVELOPMENT.md](DEVELOPMENT.md).