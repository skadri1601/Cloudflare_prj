export class TravelAgent {
  constructor(env) {
    this.env = env;
    this.ai = env.AI;
    this.workflows = env.MY_WORKFLOW;
  }

  async chat(message, userId, sessionId) {
    try {
      // Get user memory
      const memoryStub = this.env.TRAVEL_MEMORY.get(this.env.TRAVEL_MEMORY.idFromName(userId));
      const memoryResponse = await memoryStub.fetch(new Request('https://memory/memory', { method: 'GET' }));
      const userMemory = await memoryResponse.json();

      // Store the user message
      await memoryStub.fetch(new Request('https://memory/memory/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: message, sessionId })
      }));

      // Extract and store preferences from user message
      await memoryStub.fetch(new Request('https://memory/extract-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      }));

      // Determine if we need to call external APIs
      const needsExternalData = this.requiresExternalData(message);
      let externalData = {};

      if (needsExternalData) {
        // Trigger workflow for data gathering
        externalData = await this.gatherExternalData(message, userMemory.preferences);
      }

      // Generate system prompt with context
      const systemPrompt = this.generateSystemPrompt(userMemory, externalData);

      // Create conversation context
      const conversationHistory = this.buildConversationContext(userMemory.conversationHistory, message);

      // Call Workers AI
      const aiResponse = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ],
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9
      });

      const assistantMessage = aiResponse.response;

      // Store the assistant response
      await memoryStub.fetch(new Request('https://memory/memory/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: assistantMessage,
          sessionId,
          externalDataUsed: Object.keys(externalData).length > 0
        })
      }));

      return {
        response: assistantMessage,
        sessionId,
        preferences: userMemory.preferences,
        externalDataUsed: Object.keys(externalData).length > 0
      };

    } catch (error) {
      console.error('Agent chat error:', error);
      return {
        response: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
        error: error.message,
        sessionId
      };
    }
  }

  requiresExternalData(message) {
    const weatherKeywords = ['weather', 'temperature', 'rain', 'snow', 'forecast', 'climate'];
    const eventKeywords = ['events', 'concerts', 'shows', 'festivals', 'activities', 'what to do'];
    const locationKeywords = ['trip', 'travel', 'visit', 'go to', 'plan'];

    const lowerMessage = message.toLowerCase();

    return weatherKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           eventKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           locationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async gatherExternalData(message, preferences) {
    try {
      // Extract location from message
      const location = this.extractLocation(message);
      if (!location) return {};

      const data = {};

      // Get weather data if needed
      if (this.needsWeather(message)) {
        data.weather = await this.getWeatherData(location);
      }

      // Get events data if needed
      if (this.needsEvents(message)) {
        data.events = await this.getEventsData(location, preferences);
      }

      return data;

    } catch (error) {
      console.error('Error gathering external data:', error);
      return {};
    }
  }

  extractLocation(message) {
    // Simple location extraction - can be enhanced with NLP
    const locationPatterns = [
      /(?:to|in|visit|going to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:trip|travel|vacation)/g
    ];

    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return null;
  }

  needsWeather(message) {
    const weatherKeywords = ['weather', 'temperature', 'rain', 'snow', 'forecast', 'climate', 'hot', 'cold'];
    return weatherKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  needsEvents(message) {
    const eventKeywords = ['events', 'concerts', 'shows', 'festivals', 'activities', 'what to do', 'entertainment'];
    return eventKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  async getWeatherData(location) {
    try {
      // OpenWeatherMap API example
      const apiKey = this.env.WEATHER_API_KEY;
      if (!apiKey) return null;

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
      );

      if (!response.ok) return null;

      const data = await response.json();
      return {
        location: data.name,
        temperature: data.main.temp,
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed
      };

    } catch (error) {
      console.error('Weather API error:', error);
      return null;
    }
  }

  async getEventsData(location, preferences) {
    try {
      // Simplified events data - replace with real API
      const sampleEvents = [
        { name: 'Local Art Exhibition', type: 'culture', date: '2024-11-15' },
        { name: 'Hiking Group Meetup', type: 'outdoor', date: '2024-11-16' },
        { name: 'Food Festival', type: 'food', date: '2024-11-17' }
      ];

      // Filter based on preferences
      if (preferences.activities) {
        return sampleEvents.filter(event =>
          preferences.activities.some(activity =>
            event.type.includes(activity) || event.name.toLowerCase().includes(activity)
          )
        );
      }

      return sampleEvents.slice(0, 3);

    } catch (error) {
      console.error('Events API error:', error);
      return [];
    }
  }

  generateSystemPrompt(userMemory, externalData) {
    let prompt = `You are an expert AI travel agent. Your goal is to help users plan amazing trips by understanding their preferences and providing personalized recommendations.

Current user preferences: ${JSON.stringify(userMemory.preferences)}

Instructions:
1. Be conversational, friendly, and enthusiastic about travel
2. Use the user's known preferences to personalize recommendations
3. Ask clarifying questions when needed to better understand their needs
4. Provide specific, actionable travel advice
5. If you have real-time data, incorporate it naturally into your responses`;

    if (externalData.weather) {
      prompt += `\n\nCurrent weather data: ${JSON.stringify(externalData.weather)}`;
    }

    if (externalData.events) {
      prompt += `\n\nLocal events: ${JSON.stringify(externalData.events)}`;
    }

    prompt += `\n\nRemember to be helpful, specific, and engaging in your travel recommendations!`;

    return prompt;
  }

  buildConversationContext(history, currentMessage) {
    // Keep last 10 messages for context
    const recentHistory = history.slice(-10);

    const context = recentHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add current message
    context.push({ role: 'user', content: currentMessage });

    return context;
  }

  async generateItinerary(destination, days, preferences) {
    try {
      const prompt = `Create a detailed ${days}-day itinerary for ${destination}.
      User preferences: ${JSON.stringify(preferences)}

      Format the response as a structured itinerary with:
      - Day-by-day breakdown
      - Specific activities and locations
      - Time recommendations
      - Brief descriptions of why each activity matches user preferences`;

      const response = await this.ai.run('@cf/meta/llama-3.1-70b-instruct', {
        messages: [
          { role: 'system', content: 'You are a travel expert creating detailed itineraries.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      });

      return response.response;

    } catch (error) {
      console.error('Itinerary generation error:', error);
      return "I'm sorry, I couldn't generate an itinerary at the moment. Please try again.";
    }
  }
}