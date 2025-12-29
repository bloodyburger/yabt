/**
 * YABT Custom Server with Enhanced Logging
 * 
 * Features:
 * - Structured JSON logging with Winston
 * - Request/Response body logging
 * - Request ID tracking
 * - Response time measurement
 * - Webhook shipping for n8n/Slack integration
 * - SPA fallback for client-side routing
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

// Configuration from environment
const PORT = process.env.PORT || 5177;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_WEBHOOK_URL = process.env.LOG_WEBHOOK_URL || '';
const LOG_REQUEST_BODY = process.env.LOG_REQUEST_BODY !== 'false'; // Enabled by default
const NODE_ENV = process.env.NODE_ENV || 'production';

// Simple logger with JSON output
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLogLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;

function formatLog(level, message, meta = {}) {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        service: 'yabt',
        ...meta
    });
}

function log(level, message, meta = {}) {
    if (LOG_LEVELS[level] <= currentLogLevel) {
        const logLine = formatLog(level, message, meta);
        if (level === 'error') {
            console.error(logLine);
        } else {
            console.log(logLine);
        }
        
        // Ship to webhook for errors and warnings
        if (LOG_WEBHOOK_URL && (level === 'error' || level === 'warn')) {
            shipToWebhook(level, message, meta).catch(() => {});
        }
    }
}

const logger = {
    error: (msg, meta) => log('error', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    debug: (msg, meta) => log('debug', msg, meta)
};

// Webhook shipping for n8n integration
async function shipToWebhook(level, message, meta = {}) {
    if (!LOG_WEBHOOK_URL) return;
    
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: 'yabt',
            environment: NODE_ENV,
            ...meta
        };
        
        await fetch(LOG_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000) // 5s timeout
        });
    } catch (err) {
        // Don't log webhook errors to avoid loops
    }
}

// Create Express app
const app = express();

// Parse JSON bodies for logging
app.use(express.json({ limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
});

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Capture request details
    const requestLog = {
        requestId: req.id,
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
    };
    
    // Log request body if enabled (exclude sensitive paths)
    if (LOG_REQUEST_BODY && req.body && Object.keys(req.body).length > 0) {
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
        const sanitizedBody = { ...req.body };
        for (const field of sensitiveFields) {
            if (sanitizedBody[field]) {
                sanitizedBody[field] = '[REDACTED]';
            }
        }
        requestLog.body = sanitizedBody;
    }
    
    logger.info(`→ ${req.method} ${req.path}`, requestLog);
    
    // Capture response
    const originalSend = res.send;
    res.send = function(body) {
        const responseTime = Date.now() - startTime;
        
        const responseLog = {
            requestId: req.id,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            contentLength: body ? body.length : 0
        };
        
        // Log response body for non-static files if enabled
        if (LOG_REQUEST_BODY && body && typeof body === 'string' && 
            !req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
            try {
                const parsed = JSON.parse(body);
                // Redact sensitive fields
                const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'access_token', 'refresh_token'];
                const sanitized = JSON.stringify(parsed, (key, value) => 
                    sensitiveFields.includes(key) ? '[REDACTED]' : value
                );
                if (sanitized.length < 5000) {
                    responseLog.body = JSON.parse(sanitized);
                }
            } catch {
                // Not JSON, skip body logging
            }
        }
        
        const logLevel = res.statusCode >= 500 ? 'error' : 
                         res.statusCode >= 400 ? 'warn' : 'info';
        
        logger[logLevel](`← ${res.statusCode} ${req.method} ${req.path} (${responseTime}ms)`, responseLog);
        
        return originalSend.call(this, body);
    };
    
    next();
});

// Health check endpoint with metrics
app.get('/health', (req, res) => {
    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: NODE_ENV
    };
    res.json(healthData);
});

// API endpoint to manually ship logs (for testing)
app.post('/api/log', async (req, res) => {
    const { level = 'info', message, meta = {} } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    
    logger[level] || logger.info;
    log(level, message, meta);
    
    // Also ship to webhook
    if (LOG_WEBHOOK_URL) {
        await shipToWebhook(level, message, meta);
    }
    
    res.json({ success: true, message: 'Log shipped' });
});

// Serve static files from dist directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for any non-file requests
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Application not built. Run npm run build first.');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        requestId: req.id,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    
    res.status(500).json({ 
        error: 'Internal server error',
        requestId: req.id
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    logger.info('Server started', {
        port: PORT,
        environment: NODE_ENV,
        logLevel: LOG_LEVEL,
        webhookEnabled: !!LOG_WEBHOOK_URL,
        requestBodyLogging: LOG_REQUEST_BODY
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
