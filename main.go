package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Configuration from environment
var (
	port           = getEnv("PORT", "5177")
	logLevel       = getEnv("LOG_LEVEL", "info")
	logWebhookURL  = getEnv("LOG_WEBHOOK_URL", "")
	logWebhookAll  = getEnv("LOG_WEBHOOK_ALL", "true") == "true" // Ship all logs, not just errors
	logRequestBody = getEnv("LOG_REQUEST_BODY", "true") == "true"
	nodeEnv        = getEnv("NODE_ENV", "production")
	ollamaAPIKey   = getEnv("OLLAMA_API_KEY", "")
	distPath       = "./dist"
)

// Log levels
var logLevels = map[string]int{
	"error": 0,
	"warn":  1,
	"info":  2,
	"debug": 3,
}

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp    string      `json:"timestamp"`
	Level        string      `json:"level"`
	Message      string      `json:"message"`
	Service      string      `json:"service"`
	Environment  string      `json:"environment,omitempty"`
	RequestID    string      `json:"requestId,omitempty"`
	Method       string      `json:"method,omitempty"`
	Path         string      `json:"path,omitempty"`
	StatusCode   int         `json:"statusCode,omitempty"`
	ResponseTime string      `json:"responseTime,omitempty"`
	IP           string      `json:"ip,omitempty"`
	UserAgent    string      `json:"userAgent,omitempty"`
	Body         interface{} `json:"body,omitempty"`
	Error        string      `json:"error,omitempty"`
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
	Uptime      string `json:"uptime"`
	Version     string `json:"version"`
	Environment string `json:"environment"`
}

var startTime = time.Now()

// Sensitive fields to redact
var sensitiveFields = []string{"password", "token", "apiKey", "secret", "authorization", "access_token", "refresh_token"}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func currentLogLevelValue() int {
	if level, ok := logLevels[logLevel]; ok {
		return level
	}
	return logLevels["info"]
}

func logJSON(level, message string, entry *LogEntry) {
	if logLevels[level] > currentLogLevelValue() {
		return
	}

	entry.Timestamp = time.Now().UTC().Format(time.RFC3339)
	entry.Level = level
	entry.Message = message
	entry.Service = "yabt"
	entry.Environment = nodeEnv

	jsonBytes, err := json.Marshal(entry)
	if err != nil {
		log.Printf("Error marshaling log entry: %v", err)
		return
	}

	fmt.Println(string(jsonBytes))

	// Ship to webhook
	if logWebhookURL != "" {
		// Ship all logs if enabled, otherwise only errors and warnings
		if logWebhookAll || level == "error" || level == "warn" {
			// Skip static asset logs to reduce noise
			if entry.Path == "" || !isStaticAsset(entry.Path) {
				go shipToWebhook(entry)
			}
		}
	}
}

func shipToWebhook(entry *LogEntry) {
	if logWebhookURL == "" {
		return
	}

	jsonBytes, err := json.Marshal(entry)
	if err != nil {
		return
	}

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("POST", logWebhookURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	_, _ = client.Do(req)
}

// isStaticAsset checks if the path is a static asset
func isStaticAsset(path string) bool {
	exts := []string{".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".map"}
	for _, ext := range exts {
		if strings.HasSuffix(path, ext) {
			return true
		}
	}
	return false
}

func redactSensitiveFields(data map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for key, value := range data {
		lowKey := strings.ToLower(key)
		issSensitive := false
		for _, field := range sensitiveFields {
			if strings.Contains(lowKey, field) {
				issSensitive = true
				break
			}
		}
		if issSensitive {
			result[key] = "[REDACTED]"
		} else if nested, ok := value.(map[string]interface{}); ok {
			result[key] = redactSensitiveFields(nested)
		} else {
			result[key] = value
		}
	}
	return result
}

// ResponseWriter wrapper to capture status code and response body
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	body       *bytes.Buffer
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
		body:           &bytes.Buffer{},
	}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	rw.body.Write(b)
	return rw.ResponseWriter.Write(b)
}

// Logging middleware
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()

		// Generate request ID
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		w.Header().Set("X-Request-ID", requestID)

		// Get client IP
		ip := r.Header.Get("X-Forwarded-For")
		if ip == "" {
			ip = r.Header.Get("X-Real-IP")
		}
		if ip == "" {
			ip = r.RemoteAddr
		}

		// Create request log entry
		reqEntry := &LogEntry{
			RequestID: requestID,
			Method:    r.Method,
			Path:      r.URL.Path,
			IP:        ip,
			UserAgent: r.UserAgent(),
		}

		// Log request body if enabled
		if logRequestBody && r.Body != nil && r.ContentLength > 0 {
			bodyBytes, err := io.ReadAll(r.Body)
			if err == nil {
				r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

				var bodyData map[string]interface{}
				if json.Unmarshal(bodyBytes, &bodyData) == nil {
					reqEntry.Body = redactSensitiveFields(bodyData)
				}
			}
		}

		logJSON("info", fmt.Sprintf("→ %s %s", r.Method, r.URL.Path), reqEntry)

		// Wrap response writer
		rw := newResponseWriter(w)

		// Call next handler
		next.ServeHTTP(rw, r)

		// Calculate response time
		responseTime := time.Since(startTime)

		// Create response log entry
		respEntry := &LogEntry{
			RequestID:    requestID,
			Method:       r.Method,
			Path:         r.URL.Path,
			StatusCode:   rw.statusCode,
			ResponseTime: responseTime.String(),
			IP:           ip,
		}

		// Log response body for JSON responses if enabled
		if logRequestBody && rw.body.Len() > 0 && rw.body.Len() < 5000 {
			contentType := rw.Header().Get("Content-Type")
			if strings.Contains(contentType, "application/json") {
				var bodyData map[string]interface{}
				if json.Unmarshal(rw.body.Bytes(), &bodyData) == nil {
					respEntry.Body = redactSensitiveFields(bodyData)
				}
			}
		}

		// Determine log level based on status code
		level := "info"
		if rw.statusCode >= 500 {
			level = "error"
		} else if rw.statusCode >= 400 {
			level = "warn"
		}

		logJSON(level, fmt.Sprintf("← %d %s %s (%s)", rw.statusCode, r.Method, r.URL.Path, responseTime), respEntry)
	})
}

// Health check handler
func healthHandler(w http.ResponseWriter, r *http.Request) {
	uptime := time.Since(startTime)

	health := HealthResponse{
		Status:      "healthy",
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
		Uptime:      uptime.String(),
		Version:     "1.0.0",
		Environment: nodeEnv,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// Log API handler for manual log shipping
func logAPIHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Level   string                 `json:"level"`
		Message string                 `json:"message"`
		Meta    map[string]interface{} `json:"meta"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, "Message is required", http.StatusBadRequest)
		return
	}

	if req.Level == "" {
		req.Level = "info"
	}

	entry := &LogEntry{}
	logJSON(req.Level, req.Message, entry)

	// Ship to webhook
	if logWebhookURL != "" {
		go shipToWebhook(entry)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Log shipped",
	})
}

// Static file server with SPA fallback
func spaHandler(distPath string) http.Handler {
	fileServer := http.FileServer(http.Dir(distPath))

	// Regex to detect file extensions
	fileExtRegex := regexp.MustCompile(`\.\w+$`)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Check if the file exists
		fullPath := filepath.Join(distPath, path)
		if _, err := os.Stat(fullPath); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}

		// If it's a file request (has extension) and doesn't exist, return 404
		if fileExtRegex.MatchString(path) {
			http.NotFound(w, r)
			return
		}

		// SPA fallback - serve index.html
		indexPath := filepath.Join(distPath, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.ServeFile(w, r, indexPath)
			return
		}

		http.Error(w, "Application not built. Run npm run build first.", http.StatusNotFound)
	})
}

// Ollama AI Proxy - forwards requests to Ollama Cloud API to bypass CORS
func ollamaProxyHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if API key is configured
	if ollamaAPIKey == "" {
		http.Error(w, "Ollama API key not configured", http.StatusInternalServerError)
		return
	}

	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Forward request to Ollama Cloud API
	req, err := http.NewRequest("POST", "https://ollama.com/api/chat", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ollamaAPIKey)

	// Make request
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		logJSON("error", "Ollama API request failed", &LogEntry{Error: err.Error()})
		http.Error(w, "Failed to contact Ollama API: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read Ollama response", http.StatusInternalServerError)
		return
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

func main() {
	// Create router
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/log", logAPIHandler)
	mux.HandleFunc("/api/ai/chat", ollamaProxyHandler)

	// Static files and SPA fallback
	mux.Handle("/", spaHandler(distPath))

	// Wrap with logging middleware
	handler := loggingMiddleware(mux)

	// Log startup
	logJSON("info", "Server started", &LogEntry{
		Message: fmt.Sprintf("Listening on port %s", port),
	})

	fmt.Printf("🚀 YABT server running on http://0.0.0.0:%s\n", port)
	fmt.Printf("📊 Log level: %s\n", logLevel)
	fmt.Printf("🔗 Webhook: %v (all logs: %v)\n", logWebhookURL != "", logWebhookAll)
	fmt.Printf("📝 Request body logging: %v\n", logRequestBody)

	// Start server
	addr := fmt.Sprintf("0.0.0.0:%s", port)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
