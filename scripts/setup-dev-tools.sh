#!/bin/bash

# Setup script for development tools
set -e

echo "Setting up development tools for TMember monorepo..."

# Install Go tools
echo "Installing Go development tools..."
go install golang.org/x/tools/cmd/goimports@latest
go install golang.org/x/lint/golint@latest
go install honnef.co/go/tools/cmd/staticcheck@latest

# Install pre-commit if not already installed
if ! command -v pre-commit &> /dev/null; then
    echo "Installing pre-commit..."
    if command -v pip &> /dev/null; then
        pip install pre-commit
    elif command -v pip3 &> /dev/null; then
        pip3 install pre-commit
    elif command -v brew &> /dev/null; then
        brew install pre-commit
    else
        echo "Please install pre-commit manually: https://pre-commit.com/#installation"
        exit 1
    fi
fi

# Install pre-commit hooks
echo "Installing pre-commit hooks..."
pre-commit install

# Install frontend dependencies if not already done
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Install root dependencies if not already done
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

echo "Development tools setup complete!"
echo ""
echo "Available commands:"
echo "  make help           - Show all available make commands"
echo "  make dev            - Start development environment"
echo "  make test-all       - Run all tests"
echo "  make lint           - Lint all code"
echo "  make format         - Format all code"
echo "  pre-commit run --all-files  - Run pre-commit hooks on all files"