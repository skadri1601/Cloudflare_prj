/**
 * TravelMemory - Durable Object class for persistent user memory storage
 * Each user gets their own instance that stores preferences and conversation history
 * Data persists across sessions and is automatically backed up by Cloudflare
 */
export class TravelMemory {
  constructor(state, env) {
    this.state = state;  // Durable Object state with transactional storage
    this.env = env;      // Environment bindings (unused in this class)
  }

  /**
   * Handle HTTP requests to this Durable Object
   * Routes requests to appropriate memory operations
   * @param {Request} request - HTTP request from the main worker
   * @returns {Response} HTTP response with memory data or operation result
   */
  async fetch(request) {
    // Parse request details for routing
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Route requests to appropriate memory operations
      if (path === '/memory' && method === 'GET') {
        return this.getMemory();  // Get complete user memory
      } else if (path === '/memory' && method === 'POST') {
        const data = await request.json();
        return this.updateMemory(data);  // Update user memory
      } else if (path === '/memory/preferences' && method === 'GET') {
        return this.getPreferences();  // Get user preferences only
      } else if (path === '/memory/preferences' && method === 'POST') {
        const preferences = await request.json();
        return this.updatePreferences(preferences);  // Update user preferences
      } else if (path === '/memory/conversation' && method === 'POST') {
        const message = await request.json();
        return this.addToConversation(message);  // Add message to conversation history
      } else if (path === '/memory/conversation' && method === 'GET') {
        return this.getConversationHistory();  // Get conversation history
      } else if (path === '/memory/clear' && method === 'POST') {
        return this.clearMemory();  // Clear all user memory
      }

      // Return 404 for unknown endpoints
      return new Response('Not Found', { status: 404 });
    } catch (error) {
      // Handle memory operation errors gracefully
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Retrieve complete user memory or initialize default structure
   * @returns {Response} JSON response with user memory data
   */
  async getMemory() {
    // Get stored memory or create default structure for new users
    const memory = await this.state.storage.get('userMemory') || {
      preferences: {},           // User's travel preferences
      conversationHistory: [],   // Chat message history
      pastTrips: [],            // Previously planned trips
      createdAt: new Date().toISOString(),    // Account creation time
      lastUpdated: new Date().toISOString()   // Last update time
    };

    return new Response(JSON.stringify(memory), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Update user memory with provided data
   * @param {Object} data - Data to merge into user memory
   * @returns {Response} JSON response with updated memory
   */
  async updateMemory(data) {
    // Get existing memory or create default structure
    let memory = await this.state.storage.get('userMemory') || {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString()
    };

    // Merge new data and update timestamp
    memory = { ...memory, ...data, lastUpdated: new Date().toISOString() };
    // Persist updated memory to durable storage
    await this.state.storage.put('userMemory', memory);

    return new Response(JSON.stringify(memory), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get user preferences only
   * @returns {Response} JSON response with user preferences
   */
  async getPreferences() {
    const memory = await this.state.storage.get('userMemory') || { preferences: {} };
    return new Response(JSON.stringify(memory.preferences), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Update user preferences specifically
   * @param {Object} preferences - New preferences to merge
   * @returns {Response} JSON response with updated preferences
   */
  async updatePreferences(preferences) {
    // Get existing memory or create default structure
    let memory = await this.state.storage.get('userMemory') || {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString()
    };

    // Merge new preferences with existing ones
    memory.preferences = { ...memory.preferences, ...preferences };
    memory.lastUpdated = new Date().toISOString();
    // Persist updated memory
    await this.state.storage.put('userMemory', memory);

    return new Response(JSON.stringify(memory.preferences), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Add a message to the conversation history
   * @param {Object} message - Message object with role, content, etc.
   * @returns {Response} JSON response with the added message entry
   */
  async addToConversation(message) {
    // Get existing memory or create default structure
    let memory = await this.state.storage.get('userMemory') || {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString()
    };

    // Create conversation entry with timestamp
    const conversationEntry = {
      timestamp: new Date().toISOString(),  // When the message was stored
      ...message                           // Spread message data (role, content, sessionId, etc.)
    };

    // Add to conversation history
    memory.conversationHistory.push(conversationEntry);

    // Limit conversation history to prevent unbounded storage growth
    // Keep only the last 50 messages for performance and storage efficiency
    if (memory.conversationHistory.length > 50) {
      memory.conversationHistory = memory.conversationHistory.slice(-50);
    }

    // Update timestamp and persist to storage
    memory.lastUpdated = new Date().toISOString();
    await this.state.storage.put('userMemory', memory);

    return new Response(JSON.stringify(conversationEntry), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get conversation history only
   * @returns {Response} JSON response with conversation history array
   */
  async getConversationHistory() {
    const memory = await this.state.storage.get('userMemory') || { conversationHistory: [] };
    return new Response(JSON.stringify(memory.conversationHistory), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Clear all user memory and reset to default state
   * @returns {Response} JSON response confirming memory was cleared
   */
  async clearMemory() {
    // Delete all stored data for this user
    await this.state.storage.deleteAll();

    // Create fresh memory structure
    const freshMemory = {
      preferences: {},          // Empty preferences
      conversationHistory: [],  // Empty conversation history
      pastTrips: [],           // Empty trip history
      createdAt: new Date().toISOString(),     // Reset creation time
      lastUpdated: new Date().toISOString()    // Set update time
    };

    // Store the fresh memory structure
    await this.state.storage.put('userMemory', freshMemory);

    return new Response(JSON.stringify({ message: 'Memory cleared successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Extract travel preferences from user messages using keyword matching
   * This is a helper method to automatically learn user preferences
   * @param {string} userMessage - User's message to analyze
   * @returns {Object} Extracted preferences object
   */
  async extractAndStorePreferences(userMessage) {
    const preferences = {};
    const message = userMessage.toLowerCase();  // Convert to lowercase for matching

    // Extract travel activity preferences from keywords
    if (message.includes('hiking') || message.includes('hike')) {
      preferences.activities = [...(preferences.activities || []), 'hiking'];
    }
    if (message.includes('museum') || message.includes('art')) {
      preferences.activities = [...(preferences.activities || []), 'museums'];
    }
    if (message.includes('beach') || message.includes('ocean')) {
      preferences.activities = [...(preferences.activities || []), 'beach'];
    }
    if (message.includes('food') || message.includes('restaurant')) {
      preferences.interests = [...(preferences.interests || []), 'food'];
    }

    // Extract budget preferences
    if (message.includes('budget') || message.includes('cheap')) {
      preferences.budget = 'low';
    }
    if (message.includes('luxury') || message.includes('expensive')) {
      preferences.budget = 'high';
    }

    // Extract destination preferences using regex pattern matching
    const cityMatch = message.match(/(?:to|in|visit)\s+([a-z\s]+?)(?:\s+(?:in|for|during)|$)/);
    if (cityMatch) {
      preferences.destinations = [...(preferences.destinations || []), cityMatch[1].trim()];
    }

    // Save preferences if any were found
    if (Object.keys(preferences).length > 0) {
      await this.updatePreferences(preferences);
    }

    return preferences;
  }
}