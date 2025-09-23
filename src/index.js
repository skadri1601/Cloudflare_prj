// Import core modules for the AI Travel Planner application
import { TravelAgent } from './agent.js';      // AI agent handling chat interactions
import { TravelMemory } from './memory.js';    // Durable Object for user memory persistence
// import { TravelWorkflow } from './workflows.js'; // Workflow orchestration (commented for now)

// Export TravelMemory for Durable Object binding
export { TravelMemory };

/**
 * Main Cloudflare Worker entry point
 * Handles all incoming HTTP requests and routes them to appropriate handlers
 */
export default {
  async fetch(request, env, ctx) {
    // Parse incoming request details
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers to allow frontend communication from any origin
    // In production, replace '*' with specific allowed origins for security
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',           // Allow all origins (should be restricted in production)
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',  // Allowed HTTP methods
      'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allowed headers
      'Access-Control-Max-Age': '86400',           // Cache preflight response for 24 hours
    };

    // Handle CORS preflight requests sent by browsers before actual requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint - used to verify worker is running properly
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',                    // Service status indicator
          timestamp: new Date().toISOString(),  // Current server time
          version: '1.0.0'                     // Application version
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Chat endpoint - main interaction point for AI conversations
      // Accepts user messages and returns AI-generated responses
      if (path === '/chat' && method === 'POST') {
        return await handleChat(request, env, corsHeaders);
      }

      // Memory management endpoints - handle user preference and conversation storage
      // Routes: /memory/, /memory/preferences, /memory/conversation, /memory/clear
      if (path.startsWith('/memory/')) {
        return await handleMemoryRequest(request, env, corsHeaders);
      }

      // Workflow trigger endpoints - orchestrate complex multi-step operations
      // Used for travel planning workflows that require multiple API calls
      if (path.startsWith('/workflow/')) {
        return await handleWorkflowRequest(request, env, corsHeaders);
      }

      // Serve static frontend files - in production these should be served from Cloudflare Pages
      // These endpoints are fallbacks for development/testing
      if (path === '/' || path === '/index.html') {
        return await serveStaticFile('index.html', env);
      }

      if (path === '/style.css') {
        return await serveStaticFile('style.css', env);
      }

      if (path === '/app.js') {
        return await serveStaticFile('app.js', env);
      }

      // Return 404 for any unrecognized routes
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      // Global error handler - catches any unhandled errors in the worker
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',     // Generic error message for security
        message: error.message,             // Specific error details for debugging
        timestamp: new Date().toISOString()  // Error occurrence time
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

/**
 * Handle chat requests - processes user messages and returns AI responses
 * @param {Request} request - HTTP request containing user message
 * @param {Object} env - Environment bindings (AI, Durable Objects, etc.)
 * @param {Object} corsHeaders - CORS headers to include in response
 */
async function handleChat(request, env, corsHeaders) {
  try {
    // Extract chat parameters from request body
    const { message, userId, sessionId } = await request.json();

    // Validate required fields - message and userId are mandatory
    if (!message || !userId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: message and userId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Create AI agent instance with environment bindings
    const agent = new TravelAgent(env);

    // Process the chat message through the AI agent
    // Agent handles memory retrieval, AI inference, and response generation
    const response = await agent.chat(message, userId, sessionId || generateSessionId());

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    // Handle chat-specific errors gracefully
    console.error('Chat error:', error);
    return new Response(JSON.stringify({
      error: 'Chat processing failed',  // User-friendly error message
      message: error.message            // Technical details for debugging
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * Handle memory-related requests - manages user preferences and conversation history
 * @param {Request} request - HTTP request for memory operations
 * @param {Object} env - Environment bindings containing Durable Object references
 * @param {Object} corsHeaders - CORS headers for response
 */
async function handleMemoryRequest(request, env, corsHeaders) {
  try {
    // Extract userId from query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    // Validate userId parameter - required for all memory operations
    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Missing userId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get Durable Object instance for this specific user
    // Each user gets their own isolated memory storage
    const memoryStub = env.TRAVEL_MEMORY.get(env.TRAVEL_MEMORY.idFromName(userId));

    // Forward the request to the user's Durable Object instance
    // Transform URL to match the memory object's expected path structure
    const memoryRequest = new Request(request.url.replace('/memory/', 'https://memory/memory/'), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' ? await request.text() : undefined  // Include body for POST requests
    });

    const response = await memoryStub.fetch(memoryRequest);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    // Handle memory operation errors
    console.error('Memory request error:', error);
    return new Response(JSON.stringify({
      error: 'Memory request failed',   // User-friendly error message
      message: error.message           // Technical details for debugging
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * Handle workflow requests - orchestrates complex multi-step travel planning operations
 * @param {Request} request - HTTP request for workflow operations
 * @param {Object} env - Environment bindings containing workflow references
 * @param {Object} corsHeaders - CORS headers for response
 */
async function handleWorkflowRequest(request, env, corsHeaders) {
  try {
    // Parse request details for workflow routing
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle workflow initiation endpoint
    if (path === '/workflow/start' && request.method === 'POST') {
      // Extract workflow parameters from request body
      const { workflowType, location, userPreferences } = await request.json();

      // Validate required workflow parameters
      if (!workflowType || !location) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: workflowType and location'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Create and start a new workflow instance
      // Workflows handle complex operations like gathering weather, events, and accommodation data
      const workflowInstance = await env.MY_WORKFLOW.create({
        params: {
          location,                                    // Destination for travel planning
          userPreferences: userPreferences || {},      // User's travel preferences
          requestType: workflowType                    // Type of workflow to execute
        }
      });

      return new Response(JSON.stringify({
        workflowId: workflowInstance.id,
        status: 'started',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Handle workflow status checking endpoint
    if (path.startsWith('/workflow/status/') && request.method === 'GET') {
      // Extract workflow ID from URL path
      const workflowId = path.split('/')[3];

      // Validate workflow ID parameter
      if (!workflowId) {
        return new Response(JSON.stringify({
          error: 'Missing workflow ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Query the current status of the specified workflow
      const status = await env.MY_WORKFLOW.get(workflowId);

      return new Response(JSON.stringify({
        workflowId,
        status: status || 'not_found',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response('Workflow endpoint not found', {
      status: 404,
      headers: corsHeaders
    });

  } catch (error) {
    // Handle workflow operation errors
    console.error('Workflow request error:', error);
    return new Response(JSON.stringify({
      error: 'Workflow request failed',  // User-friendly error message
      message: error.message            // Technical details for debugging
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

/**
 * Serve static files - in production, these should be served from Cloudflare Pages
 * This is a fallback implementation for development/testing purposes
 * @param {string} filename - Name of the file to serve
 * @param {Object} env - Environment bindings (unused in this implementation)
 */
async function serveStaticFile(filename, env) {
  try {
    // NOTE: In production, serve static files from Cloudflare Pages or R2/KV storage
    // This implementation returns basic HTML structure for development

    // Return basic HTML structure for the travel planner interface
    if (filename === 'index.html') {
      return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Travel Planner</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🌍 AI Travel Planner</h1>
            <p>Your personal AI travel agent powered by Cloudflare</p>
        </header>

        <div class="chat-container">
            <div id="messages" class="messages"></div>
            <div class="input-container">
                <input type="text" id="messageInput" placeholder="Ask me about your next trip...">
                <button id="sendButton">Send</button>
            </div>
        </div>

        <div class="features">
            <div class="feature">
                <h3>🤖 AI-Powered</h3>
                <p>Advanced AI understands your preferences</p>
            </div>
            <div class="feature">
                <h3>🌤️ Real-time Data</h3>
                <p>Weather, events, and local information</p>
            </div>
            <div class="feature">
                <h3>💾 Memory</h3>
                <p>Remembers your preferences across sessions</p>
            </div>
        </div>
    </div>

    <script src="/app.js"></script>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Return 404 for unknown static files
    return new Response('File not found', { status: 404 });

  } catch (error) {
    // Handle static file serving errors
    console.error('Static file serving error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Generate a unique session ID for tracking conversation sessions
 * @returns {string} Unique session identifier
 */
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Rate limiting helper - prevents abuse by limiting requests per client
 * Basic in-memory implementation (in production, use KV or Durable Objects for persistence)
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;  // Maximum requests allowed per window
    this.windowMs = windowMs;        // Time window in milliseconds (default: 1 minute)
    this.requests = new Map();       // In-memory storage of client request timestamps
  }

  /**
   * Check if a client is allowed to make a request based on rate limits
   * @param {string} clientId - Unique identifier for the client (e.g., IP address, user ID)
   * @returns {boolean} True if request is allowed, false if rate limited
   */
  isAllowed(clientId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;  // Calculate start of current time window

    // Initialize request history for new clients
    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, []);
    }

    const clientRequests = this.requests.get(clientId);

    // Remove old requests that fall outside the current time window
    const recentRequests = clientRequests.filter(time => time > windowStart);
    this.requests.set(clientId, recentRequests);

    // Check if client has exceeded rate limit
    if (recentRequests.length >= this.maxRequests) {
      return false;  // Rate limit exceeded
    }

    // Add current request timestamp and allow the request
    recentRequests.push(now);
    return true;
  }
}

// Global rate limiter instance - shared across all requests to this worker
// In production, consider using per-endpoint or per-user rate limiting
const rateLimiter = new RateLimiter();