package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
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
	ollamaModel    = getEnv("OLLAMA_MODEL", "gpt-oss:20b-cloud")
	groqAPIKey     = getEnv("GROQ_API_KEY", "")
	supabaseURL    = getEnv("SUPABASE_URL", getEnv("PUBLIC_SUPABASE_URL", getEnv("VITE_SUPABASE_URL", "")))
	supabaseKey    = getEnv("SUPABASE_SERVICE_ROLE_KEY", "")
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

type shortcutRequest struct {
	Text        string `json:"text"`
	Input       string `json:"input"`
	Transaction string `json:"transaction"`
}

type parsedTransaction struct {
	Amount   float64 `json:"amount"`
	Payee    string  `json:"payee,omitempty"`
	Category string  `json:"category,omitempty"`
	Account  string  `json:"account,omitempty"`
	Date     string  `json:"date,omitempty"`
	Memo     string  `json:"memo,omitempty"`
	Type     string  `json:"type,omitempty"`
}

type shortcutResponse struct {
	Success        bool             `json:"success"`
	Message        string           `json:"message,omitempty"`
	TransactionID  string           `json:"transaction_id,omitempty"`
	Amount         float64          `json:"amount,omitempty"`
	Payee          string           `json:"payee,omitempty"`
	Category       string           `json:"category,omitempty"`
	Account        string           `json:"account,omitempty"`
	Date           string           `json:"date,omitempty"`
	Parsed         *parsedTransaction `json:"parsed,omitempty"`
}

type supabaseClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

type apiKeyRecord struct {
	ID         string  `json:"id"`
	UserID     string  `json:"user_id"`
	BudgetID   string  `json:"budget_id"`
	Name       string  `json:"name"`
	KeyHash    string  `json:"key_hash"`
	LastUsedAt *string `json:"last_used_at"`
	CreatedAt  string  `json:"created_at"`
}

type accountRecord struct {
	ID          string  `json:"id"`
	BudgetID    string  `json:"budget_id"`
	Name        string  `json:"name"`
	AccountType string  `json:"account_type"`
	Balance     float64 `json:"balance"`
	IsOnBudget  bool    `json:"is_on_budget"`
	Closed      bool    `json:"closed"`
}

type categoryGroupRecord struct {
	ID string `json:"id"`
}

type categoryRecord struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	CategoryGroupID string `json:"category_group_id"`
}

type payeeRecord struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type payeeCategoryRuleRecord struct {
	PayeeName  string `json:"payee_name"`
	CategoryID string `json:"category_id"`
}

type transactionRecord struct {
	ID string `json:"id"`
}

var startTime = time.Now()

// Sensitive fields to redact
var sensitiveFields = []string{"password", "token", "apiKey", "secret", "authorization", "access_token", "refresh_token"}

var jsonObjectRegex = regexp.MustCompile(`\{[\s\S]*\}`)
var matchSanitizerRegex = regexp.MustCompile(`[^a-z0-9\s]+`)
var matchSpaceRegex = regexp.MustCompile(`\s+`)

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

func newSupabaseClient(baseURL, apiKey string) *supabaseClient {
	return &supabaseClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *supabaseClient) request(method, path string, query url.Values, body interface{}, dest interface{}) error {
	return c.requestWithPrefer(method, path, query, body, dest, "")
}

func (c *supabaseClient) requestWithPrefer(method, path string, query url.Values, body interface{}, dest interface{}, prefer string) error {
	urlStr := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, path)
	if query != nil && len(query) > 0 {
		urlStr = urlStr + "?" + query.Encode()
	}

	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewBuffer(jsonBytes)
	}

	req, err := http.NewRequest(method, urlStr, bodyReader)
	if err != nil {
		return err
	}

	req.Header.Set("apikey", c.apiKey)
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	} else if method == http.MethodPost || method == http.MethodPatch {
		req.Header.Set("Prefer", "return=representation")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("supabase %s %s failed: %s", method, path, string(respBody))
	}

	if dest != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, dest); err != nil {
			return err
		}
	}

	return nil
}

func getAPIKeyFromRequest(r *http.Request) string {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}

	if key := strings.TrimSpace(r.Header.Get("X-API-Key")); key != "" {
		return key
	}

	return ""
}

func hashAPIKey(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func normalizeMatchString(value string) string {
	normalized := strings.ToLower(value)
	normalized = matchSanitizerRegex.ReplaceAllString(normalized, " ")
	normalized = matchSpaceRegex.ReplaceAllString(normalized, " ")
	return strings.TrimSpace(normalized)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func parseShortcutText(req shortcutRequest) string {
	return firstNonEmpty(req.Text, req.Input, req.Transaction)
}

func extractJSON(content string) (string, error) {
	trimmed := strings.TrimSpace(content)
	if strings.HasPrefix(trimmed, "{") && strings.HasSuffix(trimmed, "}") {
		return trimmed, nil
	}
	match := jsonObjectRegex.FindString(trimmed)
	if match == "" {
		return "", fmt.Errorf("no JSON object found")
	}
	return match, nil
}

func parseAmountValue(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int64:
		return float64(v), true
	case json.Number:
		parsed, err := v.Float64()
		if err != nil {
			return 0, false
		}
		return parsed, true
	case string:
		cleaned := strings.TrimSpace(v)
		cleaned = regexp.MustCompile(`[^0-9\.\-]`).ReplaceAllString(cleaned, "")
		parsed, err := strconv.ParseFloat(cleaned, 64)
		if err != nil {
			return 0, false
		}
		return parsed, true
	default:
		return 0, false
	}
}

func normalizeType(value string) string {
	lower := strings.ToLower(strings.TrimSpace(value))
	if strings.Contains(lower, "income") || strings.Contains(lower, "inflow") || strings.Contains(lower, "deposit") {
		return "income"
	}
	if strings.Contains(lower, "expense") || strings.Contains(lower, "outflow") || strings.Contains(lower, "spend") {
		return "expense"
	}
	return ""
}

func firstString(raw map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if value, ok := raw[key]; ok {
			if str, ok := value.(string); ok {
				if strings.TrimSpace(str) != "" {
					return strings.TrimSpace(str)
				}
			}
		}
	}
	return ""
}

func normalizeAITransaction(raw map[string]interface{}) (parsedTransaction, error) {
	amountValue, ok := parseAmountValue(raw["amount"])
	if !ok {
		if value, ok := raw["Amount"]; ok {
			amountValue, ok = parseAmountValue(value)
		}
	}
	if !ok {
		if value, ok := raw["value"]; ok {
			amountValue, ok = parseAmountValue(value)
		}
	}
	if !ok {
		if value, ok := raw["total"]; ok {
			amountValue, ok = parseAmountValue(value)
		}
	}

	if !ok {
		return parsedTransaction{}, fmt.Errorf("missing amount")
	}

	parsedType := normalizeType(firstString(raw, "type", "transaction_type", "transactionType"))
	if amountValue < 0 {
		amountValue = math.Abs(amountValue)
		if parsedType == "" {
			parsedType = "expense"
		}
	}
	if parsedType == "" {
		parsedType = "expense"
	}

	parsed := parsedTransaction{
		Amount:   amountValue,
		Payee:    firstString(raw, "payee", "payee_name", "merchant", "vendor"),
		Category: firstString(raw, "category", "category_name", "categoryName"),
		Account:  firstString(raw, "account", "account_name", "accountName"),
		Date:     firstString(raw, "date", "transaction_date", "transactionDate"),
		Memo:     firstString(raw, "memo", "note", "notes"),
		Type:     parsedType,
	}

	return parsed, nil
}

func matchAccount(accounts []accountRecord, target string) *accountRecord {
	normalizedTarget := normalizeMatchString(target)
	if normalizedTarget == "" {
		return nil
	}

	for i := range accounts {
		name := normalizeMatchString(accounts[i].Name)
		if name == normalizedTarget {
			return &accounts[i]
		}
	}

	for i := range accounts {
		name := normalizeMatchString(accounts[i].Name)
		if strings.Contains(name, normalizedTarget) || strings.Contains(normalizedTarget, name) {
			return &accounts[i]
		}
	}

	return nil
}

func matchCategory(categories []categoryRecord, target string) *categoryRecord {
	normalizedTarget := normalizeMatchString(target)
	if normalizedTarget == "" {
		return nil
	}

	for i := range categories {
		name := normalizeMatchString(categories[i].Name)
		if name == normalizedTarget {
			return &categories[i]
		}
	}

	for i := range categories {
		name := normalizeMatchString(categories[i].Name)
		if strings.Contains(name, normalizedTarget) || strings.Contains(normalizedTarget, name) {
			return &categories[i]
		}
	}

	targetTokens := strings.Fields(normalizedTarget)
	bestScore := 0
	var best *categoryRecord

	for i := range categories {
		nameTokens := strings.Fields(normalizeMatchString(categories[i].Name))
		score := 0
		for _, token := range nameTokens {
			if len(token) < 3 {
				continue
			}
			for _, targetToken := range targetTokens {
				if token == targetToken {
					score++
					break
				}
			}
		}
		if score > bestScore {
			bestScore = score
			best = &categories[i]
		}
	}

	return best
}

func parseAITransaction(text string) (parsedTransaction, error) {
	if ollamaAPIKey == "" {
		return parsedTransaction{}, fmt.Errorf("ollama API key not configured")
	}

	prompt := fmt.Sprintf(`Parse this text into a financial transaction. Respond ONLY with valid JSON, no markdown.

Text: %q

Response format:
{
  "amount": <number or null>,
  "payee": "<string or null>",
  "category": "<string or null>",
  "account": "<string or null>",
  "date": "<YYYY-MM-DD or null>",
  "memo": "<string or null>",
  "type": "<expense or income>"
}

Rules:
- amount: Extract the monetary value (just the number, no currency symbols)
- payee: The merchant or person
- category: Best guess for spending category (e.g., Food, Transport, Entertainment)
- account: Extract account name if mentioned (e.g., "from HDFC", "using Cash", "paid with SBI")
- date: Parse any date mentioned, or use null for today
- type: "expense" for spending, "income" for receiving money
- If any field cannot be determined, use null`, text)

	body := map[string]interface{}{
		"model": ollamaModel,
		"messages": []map[string]string{{
			"role":    "user",
			"content": prompt,
		}},
		"stream": false,
		"options": map[string]interface{}{
			"temperature": 0.1,
			"num_predict": 500,
		},
	}

	jsonBytes, err := json.Marshal(body)
	if err != nil {
		return parsedTransaction{}, err
	}

	req, err := http.NewRequest("POST", "https://ollama.com/api/chat", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return parsedTransaction{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+ollamaAPIKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return parsedTransaction{}, fmt.Errorf("ollama API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return parsedTransaction{}, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return parsedTransaction{}, fmt.Errorf("ollama API error: %s", string(respBody))
	}

	var aiResp struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &aiResp); err != nil {
		return parsedTransaction{}, err
	}

	content := aiResp.Message.Content
	if content == "" && len(aiResp.Choices) > 0 {
		content = aiResp.Choices[0].Message.Content
	}

	if strings.TrimSpace(content) == "" {
		return parsedTransaction{}, fmt.Errorf("empty AI response")
	}

	jsonText, err := extractJSON(content)
	if err != nil {
		return parsedTransaction{}, err
	}

	var raw map[string]interface{}
	if err := json.Unmarshal([]byte(jsonText), &raw); err != nil {
		return parsedTransaction{}, err
	}

	return normalizeAITransaction(raw)
}

func truncateString(value string, max int) string {
	if max <= 0 {
		return ""
	}
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]interface{}{
		"success": false,
		"error":   message,
	})
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

func shortcutTransactionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if supabaseURL == "" || supabaseKey == "" {
		writeJSONError(w, http.StatusInternalServerError, "Supabase service role key not configured")
		return
	}

	if ollamaAPIKey == "" {
		writeJSONError(w, http.StatusInternalServerError, "Ollama API key not configured")
		return
	}

	apiKey := getAPIKeyFromRequest(r)
	if apiKey == "" {
		writeJSONError(w, http.StatusUnauthorized, "API key required")
		return
	}

	var req shortcutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid JSON payload")
		return
	}

	text := parseShortcutText(req)
	if text == "" {
		writeJSONError(w, http.StatusBadRequest, "Transaction text is required")
		return
	}

	sb := newSupabaseClient(supabaseURL, supabaseKey)

	keyHash := hashAPIKey(apiKey)
	keyQuery := url.Values{}
	keyQuery.Set("key_hash", "eq."+keyHash)
	keyQuery.Set("select", "id,user_id,budget_id,name")

	var keyRecords []apiKeyRecord
	if err := sb.request("GET", "api_keys", keyQuery, nil, &keyRecords); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to verify API key")
		return
	}

	if len(keyRecords) == 0 {
		writeJSONError(w, http.StatusUnauthorized, "Invalid API key")
		return
	}

	keyRecord := keyRecords[0]

	parsed, err := parseAITransaction(text)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "Failed to parse transaction text")
		return
	}

	// Fetch accounts for budget
	accountsQuery := url.Values{}
	accountsQuery.Set("budget_id", "eq."+keyRecord.BudgetID)
	accountsQuery.Set("closed", "eq.false")
	accountsQuery.Set("select", "id,budget_id,name,account_type,balance,is_on_budget,closed")

	var accounts []accountRecord
	if err := sb.request("GET", "accounts", accountsQuery, nil, &accounts); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to load accounts")
		return
	}

	var account *accountRecord
	if parsed.Account != "" {
		account = matchAccount(accounts, parsed.Account)
	}

	if account == nil {
		for i := range accounts {
			if accounts[i].Name == "Inbox" {
				account = &accounts[i]
				break
			}
		}
	}

	if account == nil {
		payload := map[string]interface{}{
			"budget_id":    keyRecord.BudgetID,
			"name":         "Inbox",
			"account_type": "savings",
			"balance":      0,
			"is_on_budget": true,
			"closed":       false,
			"sort_order":   999,
		}

		var created []accountRecord
		if err := sb.request("POST", "accounts", nil, payload, &created); err != nil || len(created) == 0 {
			writeJSONError(w, http.StatusInternalServerError, "Failed to create Inbox account")
			return
		}
		account = &created[0]
	}

	var categoryID string
	categoryName := ""
	usedLearnedCategory := false

	if parsed.Payee != "" {
		rulesQuery := url.Values{}
		rulesQuery.Set("budget_id", "eq."+keyRecord.BudgetID)
		rulesQuery.Set("select", "payee_name,category_id")

		var rules []payeeCategoryRuleRecord
		if err := sb.request("GET", "payee_category_rules", rulesQuery, nil, &rules); err == nil {
			normalizedPayee := normalizeMatchString(parsed.Payee)
			for _, rule := range rules {
				if normalizeMatchString(rule.PayeeName) == normalizedPayee {
					categoryID = rule.CategoryID
					usedLearnedCategory = true
					break
				}
			}
		}
	}

	if categoryID == "" && parsed.Category != "" {
		groupQuery := url.Values{}
		groupQuery.Set("budget_id", "eq."+keyRecord.BudgetID)
		groupQuery.Set("select", "id")

		var groups []categoryGroupRecord
		if err := sb.request("GET", "category_groups", groupQuery, nil, &groups); err == nil && len(groups) > 0 {
			groupIDs := make([]string, 0, len(groups))
			for _, group := range groups {
				groupIDs = append(groupIDs, group.ID)
			}

			categoryQuery := url.Values{}
			categoryQuery.Set("category_group_id", "in.("+strings.Join(groupIDs, ",")+")")
			categoryQuery.Set("select", "id,name,category_group_id")

			var categories []categoryRecord
			if err := sb.request("GET", "categories", categoryQuery, nil, &categories); err == nil {
				if match := matchCategory(categories, parsed.Category); match != nil {
					categoryID = match.ID
					categoryName = match.Name
				}

				if categoryID == "" {
					for _, cat := range categories {
						if cat.Name == "Uncategorized" {
							categoryID = cat.ID
							categoryName = cat.Name
							break
						}
					}
				}
			}
		}
	}

	var payeeID string
	if parsed.Payee != "" {
		payeeQuery := url.Values{}
		payeeQuery.Set("budget_id", "eq."+keyRecord.BudgetID)
		payeeQuery.Set("name", "ilike."+parsed.Payee)
		payeeQuery.Set("select", "id,name")

		var payees []payeeRecord
		if err := sb.request("GET", "payees", payeeQuery, nil, &payees); err == nil && len(payees) > 0 {
			payeeID = payees[0].ID
		} else if err == nil {
			payload := map[string]interface{}{
				"budget_id": keyRecord.BudgetID,
				"name":      parsed.Payee,
			}
			var created []payeeRecord
			if err := sb.request("POST", "payees", nil, payload, &created); err == nil && len(created) > 0 {
				payeeID = created[0].ID
			}
		}
	}

	transactionDate := parsed.Date
	if transactionDate == "" {
		transactionDate = time.Now().UTC().Format("2006-01-02")
	}

	memo := parsed.Memo
	if memo == "" {
		memoSource := strings.TrimSpace(text)
		if memoSource != "" {
			memo = fmt.Sprintf("[Shortcut] %s", truncateString(memoSource, 60))
		}
	}

	amount := math.Abs(parsed.Amount)
	if parsed.Type == "expense" {
		amount = -amount
	}

	transactionPayload := map[string]interface{}{
		"account_id":          account.ID,
		"category_id":         nil,
		"payee_id":            nil,
		"transfer_account_id": nil,
		"date":                transactionDate,
		"amount":              amount,
		"memo":                memo,
		"cleared":             false,
		"approved":            true,
	}

	if categoryID != "" {
		transactionPayload["category_id"] = categoryID
	}
	if payeeID != "" {
		transactionPayload["payee_id"] = payeeID
	}

	var createdTx []transactionRecord
	if err := sb.request("POST", "transactions", nil, transactionPayload, &createdTx); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to create transaction")
		return
	}

	transactionID := ""
	if len(createdTx) > 0 {
		transactionID = createdTx[0].ID
	}

	accountUpdateQuery := url.Values{}
	accountUpdateQuery.Set("id", "eq."+account.ID)
	_ = sb.request("PATCH", "accounts", accountUpdateQuery, map[string]interface{}{
		"balance": account.Balance + amount,
	}, nil)

	if parsed.Payee != "" && categoryID != "" && !usedLearnedCategory {
		rulePayload := map[string]interface{}{
			"budget_id":  keyRecord.BudgetID,
			"payee_name": strings.ToLower(strings.TrimSpace(parsed.Payee)),
			"category_id": categoryID,
		}
		ruleQuery := url.Values{}
		ruleQuery.Set("on_conflict", "budget_id,payee_name")
		_ = sb.requestWithPrefer("POST", "payee_category_rules", ruleQuery, rulePayload, nil, "resolution=merge-duplicates")
	}

	keyUpdateQuery := url.Values{}
	keyUpdateQuery.Set("id", "eq."+keyRecord.ID)
	_ = sb.request("PATCH", "api_keys", keyUpdateQuery, map[string]interface{}{
		"last_used_at": time.Now().UTC().Format(time.RFC3339),
	}, nil)

	response := shortcutResponse{
		Success:       true,
		Message:       "Transaction created",
		TransactionID: transactionID,
		Amount:        amount,
		Payee:         parsed.Payee,
		Category:      categoryName,
		Account:       account.Name,
		Date:          transactionDate,
		Parsed:        &parsed,
	}

	if response.Category == "" {
		response.Category = parsed.Category
	}

	writeJSON(w, http.StatusOK, response)
}

func main() {
	// Create router
	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/api/log", logAPIHandler)
	mux.HandleFunc("/api/ai/chat", ollamaProxyHandler)
	mux.HandleFunc("/api/ai/transcribe", transcribeHandler)
	mux.HandleFunc("/api/shortcut/transaction", shortcutTransactionHandler)

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
