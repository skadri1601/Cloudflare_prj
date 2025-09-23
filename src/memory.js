export class TravelMemory {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      if (path === '/memory' && method === 'GET') {
        return this.getMemory();
      } else if (path === '/memory' && method === 'POST') {
        const data = await request.json();
        return this.updateMemory(data);
      } else if (path === '/memory/preferences' && method === 'GET') {
        return this.getPreferences();
      } else if (path === '/memory/preferences' && method === 'POST') {
        const preferences = await request.json();
        return this.updatePreferences(preferences);
      } else if (path === '/memory/conversation' && method === 'POST') {
        const message = await request.json();
        return this.addToConversation(message);
      } else if (path === '/memory/conversation' && method === 'GET') {
        return this.getConversationHistory();
      } else if (path === '/memory/clear' && method === 'POST') {
        return this.clearMemory();
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async getMemory() {
    const memory = await this.state.storage.get('userMemory') || {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    return new Response(JSON.stringify(memory), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async updateMemory(data) {
    let memory = await this.state.storage.get('userMemory') || {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString()
    };

    memory = { ...memory, ...data, lastUpdated: new Date().toISOString() };
    await this.state.storage.put('userMemory', memory);

    return new Response(JSON.stringify(memory), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getPreferences() {
    const memory = await this.state.storage.get('userMemory') || { preferences: {} };
    return new Response(JSON.stringify(memory.preferences), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async updatePreferences(preferences) {
    let memory = await this.state.storage.get('userMemory') || {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString()
    };

    memory.preferences = { ...memory.preferences, ...preferences };
    memory.lastUpdated = new Date().toISOString();
    await this.state.storage.put('userMemory', memory);

    return new Response(JSON.stringify(memory.preferences), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async addToConversation(message) {
    let memory = await this.state.storage.get('userMemory') || {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString()
    };

    const conversationEntry = {
      timestamp: new Date().toISOString(),
      ...message
    };

    memory.conversationHistory.push(conversationEntry);

    // Keep only last 50 messages to prevent unbounded growth
    if (memory.conversationHistory.length > 50) {
      memory.conversationHistory = memory.conversationHistory.slice(-50);
    }

    memory.lastUpdated = new Date().toISOString();
    await this.state.storage.put('userMemory', memory);

    return new Response(JSON.stringify(conversationEntry), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getConversationHistory() {
    const memory = await this.state.storage.get('userMemory') || { conversationHistory: [] };
    return new Response(JSON.stringify(memory.conversationHistory), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async clearMemory() {
    await this.state.storage.deleteAll();

    const freshMemory = {
      preferences: {},
      conversationHistory: [],
      pastTrips: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    await this.state.storage.put('userMemory', freshMemory);

    return new Response(JSON.stringify({ message: 'Memory cleared successfully' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Helper method to extract preferences from user messages
  async extractAndStorePreferences(userMessage) {
    const preferences = {};
    const message = userMessage.toLowerCase();

    // Extract travel preferences
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
    if (message.includes('budget') || message.includes('cheap')) {
      preferences.budget = 'low';
    }
    if (message.includes('luxury') || message.includes('expensive')) {
      preferences.budget = 'high';
    }

    // Extract location preferences
    const cityMatch = message.match(/(?:to|in|visit)\s+([a-z\s]+?)(?:\s+(?:in|for|during)|$)/);
    if (cityMatch) {
      preferences.destinations = [...(preferences.destinations || []), cityMatch[1].trim()];
    }

    if (Object.keys(preferences).length > 0) {
      await this.updatePreferences(preferences);
    }

    return preferences;
  }
}