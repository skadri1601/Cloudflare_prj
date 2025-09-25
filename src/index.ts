/**
 * Simple working version of the travel agent
 */
import { TravelPlanningAgent } from './travel-planning-agent-simple';
import { TravelMemory } from './memory';

export { TravelPlanningAgent };
export { TravelMemory };

interface Env {
  AI: any;
  TravelPlanningAgent: DurableObjectNamespace;
  TRAVEL_MEMORY: DurableObjectNamespace;
  WEATHER_API_KEY?: string;
  EVENTS_API_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Session',
      'Access-Control-Max-Age': '86400',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'Autonomous Travel Planning Agent',
          version: '2.0.0',
          capabilities: ['autonomous_planning', 'real_time_communication', 'tool_invocation'],
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (path === '/agent/message' && method === 'POST') {
        return await handleAgentMessage(request, env, corsHeaders);
      }

      if (path.startsWith('/agent/plan/') && method === 'GET') {
        return await handlePlanStatus(request, env, corsHeaders);
      }

      if (path === '/' || path === '/index.html') {
        return serveHTML();
      }

      if (path === '/style.css') {
        return serveCSS();
      }

      if (path === '/app.js') {
        return serveJS();
      }

      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('❌ Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        service: 'Autonomous Travel Planning Agent',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

async function handleAgentMessage(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const { message, metadata } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({
        error: 'Message is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const agentId = 'agent_default';
    const agentStub = env.TravelPlanningAgent.get(env.TravelPlanningAgent.idFromName(agentId));

    const agentRequest = new Request('https://agent/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, metadata })
    });

    const response = await agentStub.fetch(agentRequest);
    const result = await response.json();

    return new Response(JSON.stringify({
      agent: 'TravelPlanningAgent',
      timestamp: new Date().toISOString(),
      ...result
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Agent message error:', error);
    return new Response(JSON.stringify({
      error: 'Agent message processing failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handlePlanStatus(request: Request, env: Env, corsHeaders: any): Promise<Response> {
  try {
    const url = new URL(request.url);
    const planId = url.pathname.split('/').pop();

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const agentId = 'agent_default';
    const agentStub = env.TravelPlanningAgent.get(env.TravelPlanningAgent.idFromName(agentId));

    const agentRequest = new Request(`https://agent/plan/${planId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await agentStub.fetch(agentRequest);
    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ Plan status error:', error);
    return new Response(JSON.stringify({
      error: 'Plan status check failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

function serveHTML(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 Travel Planning Agent</title>
    <link rel="stylesheet" href="/style.css">
    <script>
    function handleWelcome() {
        console.log('handleWelcome called');
        try {
            var input = document.getElementById('welcomeUsernameInput');
            console.log('Input element:', input);
            var username = input.value.trim();
            console.log('Username:', username);
            if (!username) {
                console.log('No username provided');
                input.style.borderColor = '#e74c3c';
                input.placeholder = 'Please enter your name to continue';
                input.focus();
                return;
            }
            console.log('Setting border color to green');
            input.style.borderColor = '#28a745';
            console.log('Saving username to localStorage');
            localStorage.setItem('cf_travel_username', username);
            console.log('Attempting to hide welcome modal');
            var modal = document.getElementById('welcomeModal');
            console.log('Modal element:', modal);
            modal.style.display = 'none';
            console.log('Modal display style after setting:', modal.style.display);
            var usernameDisplay = document.getElementById('usernameDisplay');
            console.log('Username display element:', usernameDisplay);
            if (usernameDisplay) usernameDisplay.textContent = username;
            var userId = 'USER-' + Date.now().toString().slice(-8);
            var userIdDisplay = document.getElementById('userIdDisplay');
            if (userIdDisplay) userIdDisplay.textContent = userId;
            var footerName = document.getElementById('userFooterName');
            if (footerName) footerName.textContent = 'Personalized for ' + username;
            var messages = document.getElementById('messages');
            if (messages) {
                messages.innerHTML = '<div class="message agent"><div class="message-content">Hello ' + username + '! Welcome to your autonomous travel planning agent. What adventure shall we plan today?</div></div>';
            }
        } catch (error) {
            console.error('Error in handleWelcome:', error);
            alert('Error: ' + error.message);
        }
    }

    function sendTravelMessage() {
        var messageInput = document.getElementById('messageInput');
        var message = messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        var messages = document.getElementById('messages');
        messages.innerHTML += '<div class="message user"><div class="message-content">' + message + '</div></div>';
        messageInput.value = '';

        // Send to API
        fetch('/agent/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message, sessionId: 'user-session-' + Date.now() })
        })
        .then(response => response.json())
        .then(data => {
            var fullMessage = data.message || 'I received your request!';
            messages.innerHTML += '<div class="message agent"><div class="message-content">' + fullMessage + '</div></div>';
            messages.scrollTop = messages.scrollHeight;

            // If there's a plan, start polling for updates
            if (data.plan && data.plan.id) {
                console.log('🔄 Starting to poll for plan updates:', data.plan.id);
                pollForPlanUpdates(data.plan.id, messages);
            }
        })
        .catch(error => {
            messages.innerHTML += '<div class="message agent"><div class="message-content">Sorry, there was an error processing your request.</div></div>';
        });
    }

    function pollForPlanUpdates(planId, messages) {
        var pollCount = 0;
        var maxPolls = 15; // Poll for up to 30 seconds (2 second intervals)

        var pollInterval = setInterval(function() {
            pollCount++;
            console.log('📊 Polling for plan updates, attempt:', pollCount);

            fetch('/agent/plan/' + planId)
                .then(response => response.json())
                .then(planData => {
                    console.log('📋 Plan status:', planData.status);

                    if (planData.status === 'completed') {
                        clearInterval(pollInterval);
                        console.log('✅ Plan completed, showing results');
                        showPlanResults(planData, messages);
                    } else if (pollCount >= maxPolls) {
                        clearInterval(pollInterval);
                        console.log('⏰ Polling timeout reached');
                        messages.innerHTML += '<div class="message agent"><div class="message-content">🤖 Still working on your plan. Check back in a moment!</div></div>';
                        messages.scrollTop = messages.scrollHeight;
                    }
                })
                .catch(error => {
                    console.error('❌ Error polling plan:', error);
                    clearInterval(pollInterval);
                });
        }, 2000); // Poll every 2 seconds
    }

    function showPlanResults(planData, messages) {
        var resultsMessage = '<strong>🎉 Your autonomous travel plan is ready!</strong><br><br>';

        planData.steps.forEach(function(step) {
            if (step.result) {
                if (step.result.itinerary) {
                    resultsMessage += '<div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">';
                    resultsMessage += '<strong>📋 Complete Itinerary:</strong><br>';
                    resultsMessage += step.result.itinerary.split('\\n').join('<br>');
                    resultsMessage += '</div>';
                } else if (step.result.forecast) {
                    resultsMessage += '<div style="margin: 10px 0;"><strong>🌤️ Weather:</strong> ' + step.result.forecast + '</div>';
                } else if (step.result.events) {
                    resultsMessage += '<div style="margin: 10px 0;"><strong>🎭 Events:</strong> ' + step.result.events + '</div>';
                } else if (step.result.options) {
                    resultsMessage += '<div style="margin: 10px 0;"><strong>🏨 Accommodations:</strong> ' + step.result.options + '</div>';
                }
            }
        });

        messages.innerHTML += '<div class="message agent"><div class="message-content">' + resultsMessage + '</div></div>';
        messages.scrollTop = messages.scrollHeight;
    }
    </script>
</head>
<body>
    <div class="cloudflare-header">
        <div class="cf-brand">
            <span class="cf-logo">☁️</span>
            <span class="cf-text">Powered by Cloudflare Workers AI</span>
        </div>
        <div class="cf-status">
            <span class="cf-indicator">🟢</span>
            <span>Workers AI Active</span>
        </div>
    </div>

    <div class="container">
        <header>
            <h1>🤖 Travel Planning Agent</h1>
            <p>AI-powered autonomous travel planning with Cloudflare Workers AI</p>

            <div class="user-identity">
                <div class="user-info">
                    <div class="username-section">
                        <span class="user-icon">👤</span>
                        <span id="usernameDisplay" class="username">Guest User</span>
                        <button id="editUsernameBtn" class="edit-btn">✏️</button>
                    </div>
                    <div class="user-id-section">
                        <span class="id-label">ID:</span>
                        <span id="userIdDisplay" class="user-id">Loading...</span>
                        <button id="copyIdBtn" class="copy-btn">📋</button>
                    </div>
                </div>
            </div>
        </header>

        <div id="welcomeModal" class="modal welcome-modal" style="display: flex;">
            <div class="modal-content welcome-content">
                <div class="welcome-header">
                    <h2>🚀 Welcome to Cloudflare Travel Agent</h2>
                    <p>AI-powered autonomous travel planning with Cloudflare Workers AI</p>
                </div>
                <div class="welcome-body">
                    <p>To get started, please tell us your name so we can personalize your experience:</p>
                    <input type="text" id="welcomeUsernameInput" placeholder="Enter your name (e.g., John Smith)" maxlength="50" autofocus onkeydown="if(event.key==='Enter') handleWelcome()">
                    <div class="welcome-features">
                        <div class="feature-item">
                            <span class="feature-icon">🤖</span>
                            <span>Autonomous AI planning</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">⚡</span>
                            <span>Real-time responses</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🌐</span>
                            <span>Global edge network</span>
                        </div>
                    </div>
                </div>
                <div class="welcome-actions">
                    <button id="welcomeStartBtn" class="welcome-start-btn" onclick="handleWelcome()">Start Planning</button>
                </div>
            </div>
        </div>

        <div id="usernameModal" class="modal" style="display: none;">
            <div class="modal-content">
                <h3>Edit Username</h3>
                <input type="text" id="usernameInput" placeholder="Enter your username" maxlength="30">
                <div class="modal-actions">
                    <button id="saveUsernameBtn" class="save-btn">Save</button>
                    <button id="cancelUsernameBtn" class="cancel-btn">Cancel</button>
                </div>
            </div>
        </div>

        <div class="chat-container">
            <div id="messages" class="messages"></div>

            <div id="thinkingBubble" class="thinking-bubble" style="display: none;">
                <div class="thinking-content">
                    <div class="thinking-dots">
                        <span></span><span></span><span></span>
                    </div>
                    <div id="thinkingText">🧠 Agent is thinking...</div>
                </div>
            </div>

            <div id="agentStatus" class="agent-status" style="display: none;">
                <div class="status-header">
                    <span class="status-icon">🤖</span>
                    <span class="status-text">Autonomous Agent Status</span>
                    <span id="connectionStatus" class="connection-indicator">🔴</span>
                </div>
                <div class="status-details">
                    <div class="status-item">
                        <span class="label">Mode:</span>
                        <span id="agentMode">Autonomous</span>
                    </div>
                    <div class="status-item">
                        <span class="label">Focus:</span>
                        <span id="agentFocus">Travel Planning</span>
                    </div>
                </div>
            </div>

            <div id="planView" class="plan-view" style="display: none;">
                <h3>🎯 Travel Plan</h3>
                <div id="planDetails"></div>
                <div id="planSteps"></div>
            </div>

            <div class="input-container">
                <textarea
                    id="messageInput"
                    placeholder="Tell me about your travel plans... (e.g., 'Plan a trip to Paris')"
                    rows="3"
                ></textarea>
                <button id="sendButton" onclick="sendTravelMessage()">Send</button>
            </div>
        </div>
    </div>

    <footer class="cloudflare-footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>🚀 Powered by Cloudflare</h4>
                <p>Built with Cloudflare Workers AI, Durable Objects, and LLaMA 3.1 70B</p>
            </div>
            <div class="footer-section">
                <h4>⚡ Edge Computing</h4>
                <p>Running on Cloudflare's global network for ultra-fast AI responses</p>
            </div>
            <div class="footer-section">
                <h4>🧠 AI Models</h4>
                <p>LLaMA 3.1 70B Instruct • Real-time inference • Autonomous planning</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>© 2025 Cloudflare Travel Agent • <span id="userFooterName">Personalized for Guest</span> • Built with <span style="color: #f39c12;">⚡</span> Workers AI</p>
        </div>
    </footer>

</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function serveCSS(): Response {
  const css = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.cloudflare-header {
  background: linear-gradient(135deg, #f38020 0%, #f5af19 100%);
  color: white;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.cf-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.cf-logo {
  font-size: 1.2rem;
}

.cf-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.cf-indicator {
  font-size: 0.8rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.user-identity {
  margin: 20px 0;
  padding: 15px;
  background: rgba(255,255,255,0.15);
  border-radius: 15px;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255,255,255,0.2);
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  color: white;
}

.username-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-icon {
  font-size: 1.2rem;
}

.username {
  font-weight: 600;
  font-size: 1rem;
  min-width: 80px;
}

.edit-btn, .copy-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  padding: 6px 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  backdrop-filter: blur(5px);
}

.edit-btn:hover, .copy-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.05);
}

.user-id-section {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.id-label {
  color: rgba(255,255,255,0.8);
}

.user-id {
  font-family: 'Courier New', monospace;
  background: rgba(0,0,0,0.2);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  text-align: center;
}

.modal-content input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1rem;
  margin-bottom: 20px;
  outline: none;
  box-sizing: border-box;
}

.modal-content input:focus {
  border-color: #667eea;
}

.welcome-modal {
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(10px);
}

.welcome-content {
  max-width: 600px;
  width: 95%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.4);
}

.welcome-header {
  text-align: center;
  padding: 30px 30px 20px;
  background: rgba(255,255,255,0.1);
}

.welcome-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.welcome-header p {
  margin: 0;
  font-size: 1rem;
  opacity: 0.9;
}

.welcome-body {
  padding: 30px;
}

.welcome-body p {
  text-align: center;
  margin: 0 0 20px 0;
  font-size: 1.1rem;
}

.welcome-body input {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  margin-bottom: 25px;
  box-sizing: border-box;
  background: white;
  color: #333;
  text-align: center;
}

.welcome-body input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
}

.welcome-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.1);
  padding: 12px;
  border-radius: 10px;
  font-size: 0.9rem;
}

.feature-icon {
  font-size: 1.2rem;
}

.welcome-actions {
  padding: 0 30px 30px;
  text-align: center;
}

.welcome-start-btn {
  background: #f38020;
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(243,128,32,0.4);
}

.welcome-start-btn:hover {
  background: #e6730e;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(243,128,32,0.5);
}

.welcome-start-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.save-btn, .cancel-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  flex: 1;
}

.save-btn {
  background: #28a745;
  color: white;
}

.save-btn:hover {
  background: #218838;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
}

.chat-container {
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  overflow: hidden;
  margin-bottom: 30px;
}

.messages {
  height: 400px;
  overflow-y: auto;
  padding: 20px;
  border-bottom: 1px solid #eee;
  scroll-behavior: smooth;
}

.message {
  margin: 15px 0;
  display: flex;
  gap: 10px;
}

.message.user {
  justify-content: flex-end;
}

.message.agent {
  justify-content: flex-start;
}

.message.system {
  justify-content: center;
}

.message-content {
  max-width: 70%;
  padding: 12px 18px;
  border-radius: 18px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  word-wrap: break-word;
  line-height: 1.4;
}

.message.user .message-content {
  background: #667eea;
  color: white;
}

.message.agent .message-content {
  background: #f5f5f5;
  color: #333;
}

.message.system .message-content {
  background: #e3f2fd;
  color: #1565c0;
  border: 1px solid #bbdefb;
  max-width: 90%;
}

.plan-view {
  background: #f8f9fa;
  border-top: 1px solid #eee;
  padding: 20px;
  margin-top: 10px;
  border-radius: 0 0 15px 15px;
}

.plan-view h3 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1.2rem;
}

.plan-steps {
  margin-top: 20px;
}

.plan-steps h5 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1.1rem;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 10px 0;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #dee2e6;
  background: white;
}

.step-content {
  flex: 1;
}

.step-item.completed {
  border-left-color: #28a745;
  background: #f8fff9;
}

.step-item.in_progress {
  border-left-color: #ffc107;
  background: #fffef5;
}

.step-item.failed {
  border-left-color: #dc3545;
  background: #fff5f5;
}

.step-icon {
  font-size: 1.2rem;
  margin-top: 2px;
}

.step-desc {
  font-weight: 500;
  color: #495057;
  margin-bottom: 5px;
}

.step-thinking {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  padding: 6px 10px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12px;
  font-size: 0.85rem;
  color: #667eea;
  animation: pulse 2s infinite;
}

.thinking-indicator {
  font-size: 0.9rem;
}

.thinking-text {
  font-style: italic;
}

.step-result {
  margin-top: 8px;
  padding: 15px;
  background: rgba(0,0,0,0.05);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #333;
  max-width: 100%;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.1);
}

.step-result h4 {
  margin: 0 0 10px 0;
  color: #495057;
  font-size: 1rem;
}

.step-result p {
  margin: 8px 0;
}

.step-result strong {
  color: #495057;
}

.itinerary-content {
  white-space: pre-wrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
  margin: 10px 0;
  overflow-y: auto;
  word-wrap: break-word;
}

.itinerary-section {
  margin: 15px 0;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.itinerary-section strong {
  display: block;
  padding: 12px 15px;
  background: #667eea;
  color: white;
  margin: 0;
  border-radius: 8px 8px 0 0;
  font-size: 16px;
}

.expandable-content {
  max-height: 200px;
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
}

.expandable-content.expanded {
  max-height: none;
  overflow: visible;
}

.expandable-result {
  position: relative;
}

.expand-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 0 0 8px 8px;
  width: 100%;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.expand-btn:hover {
  background: #218838;
}

.thinking-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  margin: 10px 0;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  animation: pulse 2s infinite;
}

.thinking-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.thinking-dots {
  display: flex;
  gap: 5px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.7);
  animation: bounce 1.4s infinite ease-in-out;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@keyframes pulse {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

.agent-status {
  background: #f8f9fa;
  border: 2px solid #667eea;
  border-radius: 12px;
  padding: 15px;
  margin: 10px 0;
  font-size: 0.9rem;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-weight: 600;
}

.status-icon {
  font-size: 1.2rem;
}

.connection-indicator {
  margin-left: auto;
  font-size: 0.8rem;
}

.connection-indicator.connected {
  color: #28a745;
}

.connection-indicator.disconnected {
  color: #dc3545;
}

.status-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.status-item {
  display: flex;
  justify-content: space-between;
}

.status-item .label {
  font-weight: 500;
  color: #666;
}

.input-container {
  padding: 20px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

#messageInput {
  flex: 1;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  padding: 12px;
  resize: vertical;
  font-family: inherit;
  outline: none;
  min-height: 20px;
  max-height: 120px;
  transition: border-color 0.3s;
}

#messageInput:focus {
  border-color: #667eea;
}

#sendButton {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
  white-space: nowrap;
}

#sendButton:hover:not(:disabled) {
  background: #5a6fd8;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

#sendButton:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }

  header h1 {
    font-size: 1.8rem;
  }

  .user-info {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .username-section, .user-id-section {
    justify-content: center;
  }

  .input-container {
    flex-direction: column;
    align-items: stretch;
  }

  .message-content {
    max-width: 85%;
  }
}

.cloudflare-footer {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
  color: white;
  margin-top: 40px;
  padding: 40px 0 20px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  padding: 0 20px;
}

.footer-section h4 {
  margin: 0 0 10px 0;
  color: #f38020;
  font-size: 1.1rem;
}

.footer-section p {
  margin: 0;
  color: #d1d5db;
  line-height: 1.5;
  font-size: 0.9rem;
}

.footer-bottom {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #4b5563;
  color: #9ca3af;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .cloudflare-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
`;

  return new Response(css, {
    headers: { 'Content-Type': 'text/css' }
  });
}

function serveJS(): Response {
  const js = `
class AutonomousTravelAgentApp {
    constructor() {
        this.apiBase = window.location.origin;
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.username = this.getStoredUsername();
        this.activePlans = new Map();
        this.pollIntervals = new Map();
        this.isFirstVisit = this.checkFirstVisit();
        this.init();
    }

    generateSessionId() {
        const stored = sessionStorage.getItem('cf_travel_session_id');
        if (stored) return stored;

        const sessionId = 'CFTA_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12);
        sessionStorage.setItem('cf_travel_session_id', sessionId);
        return sessionId;
    }

    getUserId() {
        const stored = localStorage.getItem('cf_travel_user_id');
        if (stored) return stored;

        const userId = 'TAU_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4).toUpperCase();
        localStorage.setItem('cf_travel_user_id', userId);
        return userId;
    }

    getStoredUsername() {
        return localStorage.getItem('cf_travel_username') || null;
    }

    checkFirstVisit() {
        const hasVisited = localStorage.getItem('cf_travel_has_visited');
        if (!hasVisited) {
            localStorage.setItem('cf_travel_has_visited', 'true');
            return true;
        }
        return false;
    }

    init() {
        // Setup event listeners
        document.getElementById('sendButton').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('editUsernameBtn').addEventListener('click', () => this.showUsernameModal());
        document.getElementById('copyIdBtn').addEventListener('click', () => this.copyUserId());
        document.getElementById('saveUsernameBtn').addEventListener('click', () => this.saveUsername());
        document.getElementById('cancelUsernameBtn').addEventListener('click', () => this.hideUsernameModal());

        // Welcome modal events are now handled via inline onclick handlers

        // Check if we need to show welcome popup or initialize normally
        const hasValidUsername = this.username && this.username.trim().length > 0;

        if (hasValidUsername) {
            this.hideWelcomeModal();
            this.initializeApp();
        } else {
            // Welcome modal is already displayed by default, just ensure it's visible
            this.showWelcomeModal();
        }

        // Update session tracking
        this.trackSession();
    }

    initializeApp() {
        try {
            const usernameDisplay = document.getElementById('usernameDisplay');
            const userIdDisplay = document.getElementById('userIdDisplay');

            if (usernameDisplay) {
                usernameDisplay.textContent = this.username || 'Guest User';
            }
            if (userIdDisplay) {
                userIdDisplay.textContent = this.userId;
            }

            this.updateFooterName();

            const welcomeMessage = this.username ?
                'Hello ' + this.username + '! Welcome back to your autonomous travel planning agent. What adventure shall we plan today?' :
                'Hello! I am your travel planning agent. Try: "Plan a trip to Paris"';

            this.addMessage('agent', welcomeMessage);
        } catch (error) {
            console.error('Error in initializeApp:', error);
        }
    }

    async sendMessage() {
        const message = document.getElementById('messageInput').value.trim();
        if (!message) return;

        this.addMessage('user', message);
        document.getElementById('messageInput').value = '';

        try {
            const response = await fetch('/agent/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, sessionId: this.sessionId })
            });

            const data = await response.json();
            this.addMessage('agent', data.message || 'I received your request!');

            if (data.plan) {
                this.showPlan(data.plan);
                this.startPlanPolling(data.plan.id);
            }
        } catch (error) {
            this.addMessage('agent', 'Sorry, there was an error processing your request.');
        }
    }

    addMessage(role, content) {
        const messages = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = 'message ' + role;
        div.innerHTML = '<div class="message-content">' + content + '</div>';
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    showPlan(plan) {
        const planView = document.getElementById('planView');
        if (planView) {
            planView.style.display = 'block';
            const completedSteps = plan.steps ? plan.steps.filter(s => s.status === 'completed').length : 0;
            const totalSteps = plan.steps ? plan.steps.length : 0;

            document.getElementById('planDetails').innerHTML =
                '<h4>🎯 Travel Plan: ' + plan.destination + '</h4>' +
                '<p><strong>Duration:</strong> ' + plan.duration + ' days</p>' +
                '<p><strong>Status:</strong> ' + plan.status + '</p>' +
                '<p><strong>Progress:</strong> ' + completedSteps + '/' + totalSteps + ' steps completed</p>';

            this.showPlanSteps(plan);
            this.activePlans.set(plan.id, plan);
        }
    }

    showPlanSteps(plan) {
        const stepsContainer = document.getElementById('planSteps');
        if (!stepsContainer || !plan.steps) return;

        let stepsHTML = '<div class="plan-steps"><h5>📋 Planning Steps:</h5>';

        plan.steps.forEach(step => {
            const statusIcon = step.status === 'completed' ? '✅' :
                             step.status === 'in_progress' ? '🔄' :
                             step.status === 'failed' ? '❌' : '⏳';

            stepsHTML += '<div class="step-item ' + step.status + '">';
            stepsHTML += '<span class="step-icon">' + statusIcon + '</span>';
            stepsHTML += '<span class="step-desc">' + step.description + '</span>';

            if (step.result && step.status === 'completed') {
                stepsHTML += '<div class="step-result">';
                if (step.result.forecast) {
                    stepsHTML += '<p><strong>Weather:</strong> ' + step.result.forecast.substring(0, 200) + '...</p>';
                } else if (step.result.events) {
                    stepsHTML += '<p><strong>Events:</strong> ' + step.result.events.substring(0, 200) + '...</p>';
                } else if (step.result.options) {
                    stepsHTML += '<p><strong>Accommodations:</strong> ' + step.result.options.substring(0, 200) + '...</p>';
                } else if (step.result.itinerary) {
                    stepsHTML += '<div class="itinerary-section">' +
                        '<strong>✅ Detailed Itinerary:</strong>' +
                        '<div class="itinerary-content expandable-content" id="itinerary-' + step.id + '">' +
                            step.result.itinerary +
                        '</div>' +
                        '<button class="expand-btn" onclick="toggleContent(\'itinerary-' + step.id + '\', this)">Show Full Itinerary</button>' +
                    '</div>';
                }
                stepsHTML += '</div>';
            }

            stepsHTML += '</div>';
        });

        stepsHTML += '</div>';
        stepsContainer.innerHTML = stepsHTML;
    }

    startPlanPolling(planId) {
        if (this.pollIntervals.has(planId)) return;

        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/agent/plan/' + planId);
                const planData = await response.json();

                if (planData && planData.id) {
                    this.showPlan(planData);

                    if (planData.status === 'completed' || planData.status === 'failed') {
                        clearInterval(this.pollIntervals.get(planId));
                        this.pollIntervals.delete(planId);

                        if (planData.status === 'completed') {
                            this.addMessage('agent', '🎉 Your travel plan is ready! Check the details below.');
                        }
                    }
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);

        this.pollIntervals.set(planId, pollInterval);
    }

    showWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        const input = document.getElementById('welcomeUsernameInput');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.zIndex = '1000';
        }
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    }

    hideWelcomeModal() {
        const modal = document.getElementById('welcomeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    handleWelcomeStart() {
        try {
            const input = document.getElementById('welcomeUsernameInput');

            if (!input) {
                console.error('Username input not found');
                return;
            }

            const username = input.value.trim();

            if (!username) {
                input.style.borderColor = '#e74c3c';
                input.placeholder = 'Please enter your name to continue';
                input.focus();
                return;
            }

            // Reset input styling
            input.style.borderColor = '#28a745';

            // Save username with enhanced session data
            this.username = username;
            localStorage.setItem('cf_travel_username', username);
            localStorage.setItem('cf_travel_first_visit', new Date().toISOString());

            // Hide welcome modal
            this.hideWelcomeModal();

            // Initialize the app
            this.initializeApp();
        } catch (error) {
            console.error('Error in handleWelcomeStart:', error);
        }
    }

    updateFooterName() {
        const footerName = document.getElementById('userFooterName');
        if (footerName && this.username) {
            footerName.textContent = \`Personalized for \${this.username}\`;
        }
    }

    trackSession() {
        // Track session data for analytics (SE best practice)
        const sessionData = {
            sessionId: this.sessionId,
            userId: this.userId,
            username: this.username,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            viewport: \`\${window.innerWidth}x\${window.innerHeight}\`
        };

        sessionStorage.setItem('cf_travel_session_data', JSON.stringify(sessionData));

        // Track page visibility changes (professional session management)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                sessionData.lastActive = new Date().toISOString();
                sessionStorage.setItem('cf_travel_session_data', JSON.stringify(sessionData));
            }
        });
    }

    showUsernameModal() {
        const modal = document.getElementById('usernameModal');
        const input = document.getElementById('usernameInput');
        input.value = this.username;
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 100);
    }

    hideUsernameModal() {
        document.getElementById('usernameModal').style.display = 'none';
    }

    saveUsername() {
        const input = document.getElementById('usernameInput');
        const newUsername = input.value.trim();
        if (newUsername) {
            this.username = newUsername;
            localStorage.setItem('cf_travel_username', newUsername);
            document.getElementById('usernameDisplay').textContent = this.username;
            this.updateFooterName();
            this.addMessage('system', 'Username changed to: ' + newUsername);
        }
        this.hideUsernameModal();
    }

    async copyUserId() {
        try {
            await navigator.clipboard.writeText(this.userId);
            alert('User ID copied to clipboard!');
        } catch (error) {
            alert('Could not copy to clipboard');
        }
    }

}

// Global function for expanding/collapsing content
window.toggleContent = function(contentId, button) {
    const content = document.getElementById(contentId);
    const isExpanded = content.classList.contains('expanded');

    if (isExpanded) {
        content.classList.remove('expanded');
        button.textContent = 'Show Full Itinerary';
        button.style.background = '#28a745';
    } else {
        content.classList.add('expanded');
        button.textContent = 'Hide Details';
        button.style.background = '#6c757d';
    }
};

// Debug function to force reset (can be called from console)
window.resetTravelApp = function() {
    localStorage.removeItem('cf_travel_username');
    localStorage.removeItem('cf_travel_user_id');
    localStorage.removeItem('cf_travel_has_visited');
    sessionStorage.clear();
    location.reload();
};

// Force show welcome modal function
window.forceWelcome = function() {
    const modal = document.getElementById('welcomeModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.travelApp = new AutonomousTravelAgentApp();
});

// Global function for welcome modal
window.handleWelcomeStart = function() {
    if (window.travelApp) {
        window.travelApp.handleWelcomeStart();
    } else {
        console.error('Travel app not initialized');
    }
};
`;

  return new Response(js, {
    headers: { 'Content-Type': 'application/javascript' }
  });
}