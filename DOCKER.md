# 🐳 Docker Setup for Real-Time Financial Monitor

This document provides instructions for building and running the application using Docker.

## 📋 Prerequisites

- Docker Desktop or Docker Engine (20.10+)
- Docker Compose (2.0+)

## 🚀 Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5143
- **Swagger UI**: http://localhost:5143/swagger

### 3. Stop the Services

```bash
# Stop and remove containers
docker-compose down

# Stop, remove containers, and remove volumes
docker-compose down -v
```

## 🏗️ Individual Service Build

### Backend (.NET 8 Web API)

```bash
# Build the backend image
cd backend
docker build -t financial-monitor-backend .

# Run the backend container
docker run -p 5143:5143 financial-monitor-backend
```

### Frontend (React + Vite + Nginx)

```bash
# Build the frontend image
cd frontend
docker build -t financial-monitor-frontend .

# Run the frontend container
docker run -p 3000:80 financial-monitor-frontend
```

## 📦 Docker Images

### Backend Dockerfile

- **Stage 1 (Build)**: Uses `mcr.microsoft.com/dotnet/sdk:8.0`
  - Restores NuGet packages
  - Builds the application
  - Publishes release artifacts

- **Stage 2 (Runtime)**: Uses `mcr.microsoft.com/dotnet/aspnet:8.0`
  - Copies published artifacts
  - Exposes port 5143
  - Runs the API

### Frontend Dockerfile

- **Stage 1 (Build)**: Uses `node:20-alpine`
  - Installs npm dependencies
  - Builds production bundle with Vite

- **Stage 2 (Serve)**: Uses `nginx:alpine`
  - Serves static assets
  - Configures SPA fallback for React Router
  - Exposes port 80

## 🔧 Configuration

### Environment Variables

#### Backend
- `ASPNETCORE_ENVIRONMENT`: Set to `Development` or `Production`
- `ASPNETCORE_URLS`: API listening URL (default: `http://+:5143`)
- `ConnectionStrings__DefaultConnection`: Database connection string

#### Frontend
- `VITE_API_URL`: Backend API URL (default: `http://localhost:5143`)

### Volumes

- `backend-data`: Persists SQLite database files

### Networks

- `financial-monitor-network`: Bridge network for inter-service communication

## 🐛 Troubleshooting

### Port Already in Use

If ports 3000 or 5143 are already in use, modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3001:80"  # Frontend
  - "5144:5143"  # Backend
```

### Database Persistence

The SQLite database is stored in the `backend-data` volume. To reset:

```bash
docker-compose down -v
docker-compose up --build
```

### CORS Issues

If you encounter CORS errors, ensure the backend's CORS policy includes the frontend URL.

### View Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f
```

## 🔍 Health Checks

The backend service includes a health check that polls `/api/transactions` every 30 seconds.

Check service health:
```bash
docker ps
docker inspect financial-monitor-backend
```

## 📊 Production Considerations

1. **Environment Variables**: Use `.env` files or secrets management
2. **HTTPS**: Configure SSL certificates and update ports
3. **Database**: Consider PostgreSQL/MySQL for production
4. **Logging**: Configure structured logging and log aggregation
5. **Monitoring**: Add Prometheus/Grafana for metrics
6. **Security**: Review and harden Nginx and .NET configurations
7. **Image Optimization**: Use multi-stage builds and minimize layers

## 🛠️ Development Tips

### Hot Reload in Development

For development with hot reload, use volume mounts:

```yaml
volumes:
  - ./backend:/src  # Backend hot reload
  - ./frontend/src:/app/src  # Frontend hot reload
```

### Clean Up

```bash
# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (use with caution!)
docker system prune -a --volumes
```

## 📝 Notes

- The frontend is optimized for production with Nginx compression and caching
- The backend uses a multi-stage build to minimize the final image size
- Database files persist across container restarts via Docker volumes
- SignalR WebSocket connections work through the Docker network

---

For more information, see the individual Dockerfiles in the `backend/` and `frontend/` directories.
