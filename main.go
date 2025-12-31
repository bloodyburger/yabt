package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
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
	groqAPIKey     = getEnv("GROQ_API_KEY", "")
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
	Referer      string      `json:"referer,omitempty"`
	Body         interface{} `json:"body,omitempty"`
	User         string      `json:"user,omitempty"`
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
	entry.Level = level

	// Format message with user if available
	userPrefix := "[-]"
	if entry.User != "" {
		userPrefix = fmt.Sprintf("[%s]", entry.User)
	}
	entry.Message = fmt.Sprintf("%s %s", userPrefix, message)

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

// extractUserFromJWT attempts to extract email or sub from JWT token
func extractUserFromJWT(tokenString string) string {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return ""
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}

	if email, ok := claims["email"].(string); ok {
		return email
	}
	if sub, ok := claims["sub"].(string); ok {
		return sub
	}
	return ""
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
		// Build full path with query string
		fullPath := r.URL.Path
		if r.URL.RawQuery != "" {
			fullPath = fullPath + "?" + r.URL.RawQuery
		}

		reqEntry := &LogEntry{
			RequestID: requestID,
			Method:    r.Method,
			Path:      fullPath,
			IP:        ip,
			UserAgent: r.UserAgent(),
			Referer:   r.Header.Get("Referer"),
		}

		// Attempt to extract user from Authorization header
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			reqEntry.User = extractUserFromJWT(token)
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

		logJSON("info", fmt.Sprintf("→ %s %s", r.Method, fullPath), reqEntry)

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
			Path:         fullPath,
			StatusCode:   rw.statusCode,
			ResponseTime: responseTime.String(),
			IP:           ip,
			User:         reqEntry.User, // Pass user to response log
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

		logJSON(level, fmt.Sprintf("← %d %s %s (%s)", rw.statusCode, r.Method, fullPath, responseTime), respEntry)
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
		User    string                 `json:"user"`
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

	entry := &LogEntry{
		User: req.User,
	}
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

// Transcribe Audio using Groq Whisper API
func transcribeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if groqAPIKey == "" {
		http.Error(w, "Groq API key not configured", http.StatusInternalServerError)
		return
	}

	// Limit upload size to 25MB (Groq limit)
	r.ParseMultipartForm(25 << 20)

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Prepare request to Groq
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add file field
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		http.Error(w, "Error creating multipart form", http.StatusInternalServerError)
		return
	}
	if _, err := io.Copy(part, file); err != nil {
		http.Error(w, "Error copying file", http.StatusInternalServerError)
		return
	}

	// Add model field
	if err := writer.WriteField("model", "whisper-large-v3"); err != nil {
		http.Error(w, "Error writing model field", http.StatusInternalServerError)
		return
	}

	writer.Close()

	// Create request
	req, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/audio/transcriptions", body)
	if err != nil {
		http.Error(w, "Error creating request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+groqAPIKey)

	// Send request
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		logJSON("error", "Groq API request failed", &LogEntry{Error: err.Error()})
		http.Error(w, "Failed to contact Groq API", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read Groq response", http.StatusInternalServerError)
		return
	}

	if resp.StatusCode != http.StatusOK {
		logJSON("error", fmt.Sprintf("Groq API error: %s", string(respBody)), nil)
		http.Error(w, "Groq API error", resp.StatusCode)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(respBody)
}

func main() {
	// Create router
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/log", logAPIHandler)
	mux.HandleFunc("/api/ai/chat", ollamaProxyHandler)
	mux.HandleFunc("/api/ai/transcribe", transcribeHandler)

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
