# Development Guide

This guide covers the development workflow for the TMember monorepo.

## Quick Start

1. **Setup development environment:**
   ```bash
   make setup
   ```

2. **Start development servers:**
   ```bash
   make dev
   ```

3. **Run tests:**
   ```bash
   make test-all
   ```

## Development Tools

### Code Quality

The project uses several tools to maintain code quality:

- **Go**: `gofmt`, `go vet`, `golint`, `staticcheck`, `goimports`
- **Frontend**: ESLint, Prettier, TypeScript compiler
- **Pre-commit hooks**: Automated code quality checks before commits

### Available Commands

Run `make help` to see all available commands, including:

- `make dev` - Start both services with Docker Compose
- `make test-all` - Run all tests (backend, frontend, integration)
- `make lint` - Lint all code
- `make format` - Format all code
- `make build` - Build both services

### Pre-commit Hooks

Pre-commit hooks automatically run code quality checks before each commit:

```bash
# Install hooks (done automatically by make setup)
make pre-commit-install

# Run hooks manually on all files
make pre-commit-run
```

## Project Structure

```
.
├── .devcontainer/    # VS Code development container configuration
├── backend/          # Go backend service
├── frontend/         # Vue.js frontend application
├── tests/            # Integration tests
└── scripts/          # Development scripts
```

## Development Environment Options

### VS Code Dev Containers (Recommended)

The project includes a complete VS Code development container setup in `.devcontainer/`:

- **Automatic setup**: Opens with all tools pre-installed
- **Integrated debugging**: Go and Node.js debugging support
- **Hot reloading**: Both backend (Air) and frontend (Vite HMR) 
- **Port forwarding**: Automatic forwarding of ports 3000 and 8080
- **Extensions**: Pre-configured with Go, Vue, and other useful extensions

To use:
1. Install the "Dev Containers" extension in VS Code
2. Open the project and select "Reopen in Container" when prompted
3. VS Code will build and start the development environment

### Local Development

If you prefer to develop locally without containers:

## Development Workflow

1. **Make changes** to backend or frontend code
2. **Run tests** with `make test` to ensure functionality works
3. **Lint and format** code with `make lint` and `make format`
4. **Commit changes** (pre-commit hooks will run automatically)
5. **Test integration** with `make test-integration`

## Troubleshooting

### Go Tools Not Found

If you see messages about missing Go tools, run:
```bash
make setup
```

### Pre-commit Issues

If pre-commit hooks fail, you can:
- Fix the issues and commit again
- Run `make pre-commit-run` to see all issues
- Skip hooks temporarily with `git commit --no-verify` (not recommended)

### Docker Issues

If Docker services fail to start:
- Check logs with `make docker-logs`
- Rebuild images with `make docker-build`
- Reset environment with `make docker-down && make docker-up`