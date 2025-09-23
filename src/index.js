import { TravelAgent } from './agent.js';
import { TravelMemory } from './memory.js';
// import { TravelWorkflow } from './workflows.js';

export { TravelMemory };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for frontend
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Chat endpoint - main interaction point
      if (path === '/chat' && method === 'POST') {
        return await handleChat(request, env, corsHeaders);
      }

      // Memory management endpoints
      if (path.startsWith('/memory/')) {
        return await handleMemoryRequest(request, env, corsHeaders);
      }

      // Workflow trigger endpoints
      if (path.startsWith('/workflow/')) {
        return await handleWorkflowRequest(request, env, corsHeaders);
      }

      // Serve static frontend files
      if (path === '/' || path === '/index.html') {
        return await serveStaticFile('index.html', env);
      }

      if (path === '/style.css') {
        return await serveStaticFile('style.css', env);
      }

      if (path === '/app.js') {
        return await serveStaticFile('app.js', env);
      }

      // 404 for unknown routes
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

async function handleChat(request, env, corsHeaders) {
  try {
    const { message, userId, sessionId } = await request.json();

    if (!message || !userId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: message and userId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Create agent instance
    const agent = new TravelAgent(env);

    // Process the chat message
    const response = await agent.chat(message, userId, sessionId || generateSessionId());

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({
      error: 'Chat processing failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleMemoryRequest(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Missing userId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get memory instance for user
    const memoryStub = env.TRAVEL_MEMORY.get(env.TRAVEL_MEMORY.idFromName(userId));

    // Forward request to memory object
    const memoryRequest = new Request(request.url.replace('/memory/', 'https://memory/memory/'), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' ? await request.text() : undefined
    });

    const response = await memoryStub.fetch(memoryRequest);
    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Memory request error:', error);
    return new Response(JSON.stringify({
      error: 'Memory request failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleWorkflowRequest(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/workflow/start' && request.method === 'POST') {
      const { workflowType, location, userPreferences } = await request.json();

      if (!workflowType || !location) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: workflowType and location'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Create and start workflow
      const workflowInstance = await env.MY_WORKFLOW.create({
        params: {
          location,
          userPreferences: userPreferences || {},
          requestType: workflowType
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

    if (path.startsWith('/workflow/status/') && request.method === 'GET') {
      const workflowId = path.split('/')[3];

      if (!workflowId) {
        return new Response(JSON.stringify({
          error: 'Missing workflow ID'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Get workflow status
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
    console.error('Workflow request error:', error);
    return new Response(JSON.stringify({
      error: 'Workflow request failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function serveStaticFile(filename, env) {
  try {
    // In a real implementation, you would serve these from Cloudflare Pages
    // or store them in R2/KV. For now, we'll return basic HTML structure.

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

    return new Response('File not found', { status: 404 });

  } catch (error) {
    console.error('Static file serving error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Rate limiting helper (basic implementation)
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(clientId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, []);
    }

    const clientRequests = this.requests.get(clientId);

    // Remove old requests
    const recentRequests = clientRequests.filter(time => time > windowStart);
    this.requests.set(clientId, recentRequests);

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    return true;
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();