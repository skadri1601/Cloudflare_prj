import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TravelAgent } from '../src/agent.js';

// Mock environment for testing
const mockEnv = {
  AI: {
    run: vi.fn()
  },
  TRAVEL_MEMORY: {
    get: vi.fn(),
    idFromName: vi.fn()
  },
  MY_WORKFLOW: {
    create: vi.fn()
  },
  WEATHER_API_KEY: 'test-weather-key',
  EVENTS_API_KEY: 'test-events-key'
};

// Mock Durable Object stub
const mockMemoryStub = {
  fetch: vi.fn()
};

describe('TravelAgent', () => {
  let agent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TravelAgent(mockEnv);

    // Setup default mocks
    mockEnv.TRAVEL_MEMORY.idFromName.mockReturnValue('test-id');
    mockEnv.TRAVEL_MEMORY.get.mockReturnValue(mockMemoryStub);
  });

  describe('chat', () => {
    it('should process a simple chat message', async () => {
      // Mock memory response
      mockMemoryStub.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          preferences: { activities: ['hiking'] },
          conversationHistory: []
        })
      });

      // Mock AI response
      mockEnv.AI.run.mockResolvedValueOnce({
        response: 'I\'d love to help you plan a hiking trip!'
      });

      // Mock conversation storage
      mockMemoryStub.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true })
      });

      const result = await agent.chat('I want to plan a hiking trip', 'test-user', 'test-session');

      expect(result.response).toBe('I\'d love to help you plan a hiking trip!');
      expect(result.sessionId).toBe('test-session');
      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/meta/llama-3.3-70b-instruct', expect.any(Object));
    });

    it('should handle API errors gracefully', async () => {
      // Mock memory response
      mockMemoryStub.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          preferences: {},
          conversationHistory: []
        })
      });

      // Mock AI error
      mockEnv.AI.run.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await agent.chat('Hello', 'test-user', 'test-session');

      expect(result.response).toContain('experiencing some technical difficulties');
      expect(result.error).toBe('AI service unavailable');
    });
  });

  describe('requiresExternalData', () => {
    it('should detect weather-related queries', () => {
      expect(agent.requiresExternalData('What\'s the weather in Paris?')).toBe(true);
      expect(agent.requiresExternalData('Is it raining in Tokyo?')).toBe(true);
      expect(agent.requiresExternalData('Plan a trip to London')).toBe(true);
    });

    it('should detect event-related queries', () => {
      expect(agent.requiresExternalData('What events are happening in NYC?')).toBe(true);
      expect(agent.requiresExternalData('Any concerts this weekend?')).toBe(true);
      expect(agent.requiresExternalData('What to do in Berlin?')).toBe(true);
    });

    it('should not trigger for simple queries', () => {
      expect(agent.requiresExternalData('Hello')).toBe(false);
      expect(agent.requiresExternalData('Thank you')).toBe(false);
      expect(agent.requiresExternalData('Tell me about yourself')).toBe(false);
    });
  });

  describe('extractLocation', () => {
    it('should extract locations from travel queries', () => {
      expect(agent.extractLocation('I want to visit Paris')).toBe('Paris');
      expect(agent.extractLocation('Planning a trip to New York')).toBe('New York');
      expect(agent.extractLocation('Going to San Francisco next week')).toBe('San Francisco');
    });

    it('should handle queries without clear locations', () => {
      expect(agent.extractLocation('What\'s the weather like?')).toBeNull();
      expect(agent.extractLocation('I love traveling')).toBeNull();
    });
  });

  describe('getWeatherData', () => {
    it('should fetch weather data successfully', async () => {
      // Mock successful weather API response
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          name: 'Paris',
          sys: { country: 'FR' },
          main: { temp: 15, humidity: 65 },
          weather: [{ description: 'partly cloudy', icon: '02d' }],
          wind: { speed: 3.5 },
          visibility: 10000
        })
      });

      const result = await agent.getWeatherData('Paris');

      expect(result.location).toBe('Paris');
      expect(result.current.temperature).toBe(15);
      expect(result.current.description).toBe('partly cloudy');
    });

    it('should handle weather API errors', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await agent.getWeatherData('InvalidCity');

      expect(result).toBeNull();
    });

    it('should handle missing API key', async () => {
      const agentWithoutKey = new TravelAgent({ ...mockEnv, WEATHER_API_KEY: null });

      const result = await agentWithoutKey.getWeatherData('Paris');

      expect(result.error).toBe('Weather API key not configured');
      expect(result.fallback).toContain('check local weather');
    });
  });

  describe('generateSystemPrompt', () => {
    it('should create system prompt with user preferences', () => {
      const userMemory = {
        preferences: { activities: ['hiking', 'museums'], budget: 'mid-range' }
      };
      const externalData = {};

      const prompt = agent.generateSystemPrompt(userMemory, externalData);

      expect(prompt).toContain('expert AI travel agent');
      expect(prompt).toContain('hiking');
      expect(prompt).toContain('museums');
      expect(prompt).toContain('mid-range');
    });

    it('should include weather data when available', () => {
      const userMemory = { preferences: {} };
      const externalData = {
        weather: { location: 'Paris', temperature: 20, description: 'sunny' }
      };

      const prompt = agent.generateSystemPrompt(userMemory, externalData);

      expect(prompt).toContain('Current weather data');
      expect(prompt).toContain('Paris');
      expect(prompt).toContain('sunny');
    });

    it('should include events data when available', () => {
      const userMemory = { preferences: {} };
      const externalData = {
        events: [
          { name: 'Art Festival', type: 'culture', date: '2024-11-20' }
        ]
      };

      const prompt = agent.generateSystemPrompt(userMemory, externalData);

      expect(prompt).toContain('Local events');
      expect(prompt).toContain('Art Festival');
    });
  });

  describe('buildConversationContext', () => {
    it('should build context from conversation history', () => {
      const history = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'Plan a trip' }
      ];
      const currentMessage = 'To Paris please';

      const context = agent.buildConversationContext(history, currentMessage);

      expect(context).toHaveLength(4); // 3 history + 1 current
      expect(context[0].role).toBe('user');
      expect(context[0].content).toBe('Hello');
      expect(context[3].content).toBe('To Paris please');
    });

    it('should limit context to last 10 messages', () => {
      const history = Array.from({ length: 15 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`
      }));
      const currentMessage = 'Current message';

      const context = agent.buildConversationContext(history, currentMessage);

      expect(context).toHaveLength(11); // 10 history + 1 current
      expect(context[0].content).toBe('Message 5'); // Should start from the 6th message (index 5)
    });
  });

  describe('generateItinerary', () => {
    it('should generate structured itinerary', async () => {
      mockEnv.AI.run.mockResolvedValueOnce({
        response: `Day 1: Arrival in Paris
        - Morning: Visit Louvre Museum
        - Afternoon: Walk along Seine River
        - Evening: Dinner in Montmartre

        Day 2: Cultural Exploration
        - Morning: Notre-Dame Cathedral
        - Afternoon: Latin Quarter exploration
        - Evening: Seine river cruise`
      });

      const result = await agent.generateItinerary('Paris', 2, { activities: ['museums', 'culture'] });

      expect(result).toContain('Day 1');
      expect(result).toContain('Day 2');
      expect(result).toContain('Louvre Museum');
      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/meta/llama-3.3-70b-instruct',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ])
        })
      );
    });

    it('should handle itinerary generation errors', async () => {
      mockEnv.AI.run.mockRejectedValueOnce(new Error('AI unavailable'));

      const result = await agent.generateItinerary('Paris', 2, {});

      expect(result).toContain('couldn\'t generate an itinerary');
    });
  });
});

// Integration tests for workflow coordination
describe('TravelAgent Integration', () => {
  let agent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TravelAgent(mockEnv);
    mockEnv.TRAVEL_MEMORY.idFromName.mockReturnValue('test-id');
    mockEnv.TRAVEL_MEMORY.get.mockReturnValue(mockMemoryStub);
  });

  it('should coordinate memory, AI, and external data for complex queries', async () => {
    // Mock memory with user preferences
    mockMemoryStub.fetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          preferences: { activities: ['hiking'], destinations: ['Seattle'] },
          conversationHistory: []
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true })
      });

    // Mock weather API
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        name: 'Seattle',
        sys: { country: 'US' },
        main: { temp: 12, humidity: 80 },
        weather: [{ description: 'light rain', icon: '10d' }],
        wind: { speed: 2.1 },
        visibility: 8000
      })
    });

    // Mock AI response
    mockEnv.AI.run.mockResolvedValueOnce({
      response: 'Perfect timing for a Seattle trip! Given the current light rain and your love for hiking, I recommend...'
    });

    const result = await agent.chat(
      'Plan me a 3-day trip to Seattle. I love hiking and the weather looks interesting.',
      'test-user',
      'test-session'
    );

    expect(result.response).toContain('Seattle');
    expect(result.externalDataUsed).toBe(true);
    expect(mockMemoryStub.fetch).toHaveBeenCalledTimes(4); // Get memory, add conversation, extract preferences, add response
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('openweathermap.org'),
      undefined
    );
  });
});

// Performance tests
describe('TravelAgent Performance', () => {
  let agent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new TravelAgent(mockEnv);
    mockEnv.TRAVEL_MEMORY.idFromName.mockReturnValue('test-id');
    mockEnv.TRAVEL_MEMORY.get.mockReturnValue(mockMemoryStub);
  });

  it('should handle concurrent chat requests', async () => {
    // Setup mocks for concurrent requests
    mockMemoryStub.fetch.mockResolvedValue({
      json: () => Promise.resolve({
        preferences: {},
        conversationHistory: []
      })
    });

    mockEnv.AI.run.mockResolvedValue({
      response: 'Test response'
    });

    // Create multiple concurrent chat requests
    const promises = Array.from({ length: 5 }, (_, i) =>
      agent.chat(`Message ${i}`, `user-${i}`, `session-${i}`)
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach((result, i) => {
      expect(result.response).toBe('Test response');
      expect(result.sessionId).toBe(`session-${i}`);
    });
  });

  it('should timeout gracefully for slow external APIs', async () => {
    mockMemoryStub.fetch.mockResolvedValue({
      json: () => Promise.resolve({
        preferences: {},
        conversationHistory: []
      })
    });

    // Mock slow weather API
    global.fetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
    );

    mockEnv.AI.run.mockResolvedValue({
      response: 'Weather data unavailable, but here are some general recommendations...'
    });

    const startTime = Date.now();
    const result = await agent.chat('What\'s the weather in Paris?', 'test-user', 'test-session');
    const endTime = Date.now();

    // Should respond quickly even with slow external API
    expect(endTime - startTime).toBeLessThan(5000);
    expect(result.response).toBeTruthy();
  });
});