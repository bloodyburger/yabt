# Build stage - Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build args for Supabase (needed at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY
ARG VITE_TURNSTILE_SITE_KEY

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

# Build the frontend
RUN npm run build

# Build stage - Go backend
FROM golang:1.21-alpine AS backend-builder

WORKDIR /app

# Copy Go module files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy Go source
COPY main.go ./

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .

# Production stage
FROM alpine:3.19 AS production

WORKDIR /app

# Install ca-certificates for HTTPS requests (webhook)
RUN apk --no-cache add ca-certificates

# Copy Go binary from backend builder
COPY --from=backend-builder /app/server ./

# Copy built frontend from frontend builder
COPY --from=frontend-builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=5177
ENV LOG_LEVEL=info
ENV LOG_REQUEST_BODY=true

# Expose port
EXPOSE 5177

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5177/health || exit 1

# Start server
CMD ["./server"]
