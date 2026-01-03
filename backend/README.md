# TMember Backend

A Go-based HTTP API server following standard Go project layout conventions.

## Project Structure

```
backend/
├── cmd/
│   └── server/          # Application entrypoints
│       └── main.go      # Main server application
├── internal/            # Private application code
│   ├── handlers/        # HTTP request handlers
│   │   ├── echo.go      # Echo API handler
│   │   ├── health.go    # Health check handler
│   │   └── *_test.go    # Handler tests
│   ├── middleware/      # HTTP middleware
│   │   ├── cors.go      # CORS middleware
│   │   └── *_test.go    # Middleware tests
│   └── models/          # Data models and structs
│       └── api.go       # API request/response models
├── pkg/                 # Public library code
│   └── api/             # Public API interfaces
│       └── server.go    # Server configuration
├── bin/                 # Compiled binaries
└── go.mod              # Go module definition
```

## Architecture Principles

- **cmd/**: Contains the main applications for this project. The directory name for each application should match the name of the executable.
- **internal/**: Private application and library code. This is the code you don't want others importing in their applications or libraries.
- **pkg/**: Library code that's ok to use by external applications. Other projects will import these libraries and expect them to work.
- **bin/**: Compiled binaries and executables.

## API Endpoints

### Health Check
- **GET** `/api/health` - Returns server health status

### Echo API
- **POST** `/api/echo` - Echoes back the provided message
  - Request: `{"message": "string"}`
  - Response: `{"echo": "string"}`

## Development

### Build
```bash
go build -o bin/server cmd/server/main.go
```

### Run
```bash
go run cmd/server/main.go
```

### Test
```bash
go test ./...
```

### Environment Variables
- `PORT`: Server port (default: 8080)

## Testing

The project includes comprehensive testing:
- **Property-based tests**: Validate universal properties using `testing/quick`
- **Unit tests**: Test specific scenarios and edge cases
- **Integration tests**: Test middleware and handler interactions

All tests follow the pattern `*_test.go` and are co-located with the code they test.