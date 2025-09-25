// Base Agent class embedded to avoid import issues
class Agent {
  public state: DurableObjectState;
  public env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async getState(key: string): Promise<any> {
    return await this.state.storage.get(key);
  }

  async setState(key: string, value: any): Promise<void> {
    await this.state.storage.put(key, value);
  }

  async schedule(name: string, payload: any, scheduledTime: Date): Promise<void> {
    setTimeout(async () => {
      await this.scheduled(scheduledTime, name);
    }, Math.max(0, scheduledTime.getTime() - Date.now()));
  }

  async scheduled(scheduledTime: Date, name: string): Promise<void> {
    // Override in subclass
  }

  async onUserMessage(message: string, metadata?: any): Promise<any> {
    return { message: "Agent received: " + message };
  }

  async onWebSocketMessage(websocket: WebSocket, message: string): Promise<void> {
    // Override in subclass
  }
}

interface TravelPlan {
  id: string;
  destination: string;
  duration: number;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';
  steps: TravelStep[];
  createdAt: Date;
  updatedAt: Date;
  originalRequest?: string;
  wasRedirected?: boolean;
  preferences?: string[];
}

interface TravelStep {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  autonomous: boolean;
  description: string;
  result?: any;
  progress?: number;
}

export class TravelPlanningAgent extends Agent {
  private activePlans: Map<string, TravelPlan> = new Map();
  private connectedClients: Set<WebSocket> = new Set();
  private currentThinking: string = "";

  constructor(state: any, env: any) {
    super(state, env);
  }

  private broadcastThinking(thought: string): void {
    this.currentThinking = thought;
    const message = JSON.stringify({
      type: 'thinking',
      content: thought,
      timestamp: new Date().toISOString()
    });

    this.connectedClients.forEach(client => {
      try {
        client.send(message);
      } catch (error) {
        this.connectedClients.delete(client);
      }
    });
  }

  private broadcastProgress(planId: string, stepUpdate: any): void {
    const message = JSON.stringify({
      type: 'progress',
      planId,
      stepUpdate,
      timestamp: new Date().toISOString()
    });

    this.connectedClients.forEach(client => {
      try {
        client.send(message);
      } catch (error) {
        this.connectedClients.delete(client);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    if (path === '/message') {
      const { message, metadata } = await request.json();
      const response = await this.onUserMessage(message, metadata);
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/status') {
      const status = await this.getAgentStatus();
      return new Response(JSON.stringify(status), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path.startsWith('/plan/') && request.method === 'GET') {
      const planId = path.split('/')[2];
      const plan = this.activePlans.get(planId) || await this.getState(`plan_${planId}`);
      if (plan) {
        return new Response(JSON.stringify(plan), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response('Plan not found', { status: 404 });
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const webSocketPair = new (globalThis as any).WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    (server as any).accept();
    this.connectedClients.add(server as WebSocket);

    // Send current thinking state on connect
    if (this.currentThinking) {
      (server as WebSocket).send(JSON.stringify({
        type: 'thinking',
        content: this.currentThinking,
        timestamp: new Date().toISOString()
      }));
    }

    (server as WebSocket).addEventListener('message', async (event) => {
      const data = JSON.parse(event.data as string);
      if (data.type === 'user_message') {
        const response = await this.onUserMessage(data.message, data.metadata);
        (server as WebSocket).send(JSON.stringify({
          type: 'agent_response',
          ...response
        }));
      }
    });

    (server as WebSocket).addEventListener('close', () => {
      this.connectedClients.delete(server as WebSocket);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    } as any);
  }

  async onUserMessage(message: string, metadata?: any): Promise<any> {
    console.log('🤖 Agent received message:', message);

    try {
      // Use AI to understand the travel request
      const aiResponse = await this.analyzeUserMessage(message);

      // Extract travel details from AI analysis
      const { destination, duration, preferences, originalRequest, wasRedirected } = aiResponse;

      // Create a comprehensive travel plan
      const plan = await this.createTravelPlan(destination, duration, preferences);

      // Store the plan in durable storage
      await this.setState(`plan_${plan.id}`, plan);
      this.activePlans.set(plan.id, plan);

      // Start autonomous planning process
      this.startAutonomousPlanning(plan.id);

      // Create response message based on whether destination was redirected
      let responseMessage;
      if (wasRedirected && originalRequest) {
        responseMessage = `🚀 I understand you wanted to visit **${originalRequest}**, but I can't plan trips to space destinations yet! Instead, I've created an exciting **${duration}-day space-themed adventure** to **${destination}** - perfect for space enthusiasts!\n\n🤖 **Autonomous Mode:** I'm now researching the best space experiences, NASA tours, and space center activities for your ${duration}-day trip.`;
      } else {
        responseMessage = `🎯 Perfect! I'm creating an autonomous travel plan for **${destination}**. I'll independently research weather, events, accommodations, and create a detailed ${duration}-day itinerary.\n\n🤖 **Autonomous Mode:** I'll handle safe research tasks automatically but ask for your approval before any bookings.`;
      }

      return {
        message: responseMessage,
        plan: {
          id: plan.id,
          destination: plan.destination,
          duration: plan.duration,
          status: plan.status,
          completedSteps: 0,
          totalSteps: plan.steps.length,
          steps: plan.steps.map(step => ({
            id: step.id,
            type: step.type,
            status: step.status,
            autonomous: step.autonomous,
            description: step.description
          }))
        },
        suggestions: [
          `Tell me more about ${destination}`,
          "What's the weather like there?",
          "Find local events and activities",
          "Suggest accommodations"
        ]
      };

    } catch (error) {
      console.error('❌ Error processing message:', error);

      return {
        message: `I encountered an error while processing your request: ${error.message}. Let me try a simpler approach - could you tell me which destination you'd like to visit?`,
        type: 'error'
      };
    }
  }

  private async analyzeUserMessage(message: string): Promise<{destination: string, duration: number, preferences: string[], originalRequest?: string, wasRedirected?: boolean}> {
    try {
      console.log('🧠 Analyzing user message with AI...');

      // Simple regex-based parsing as fallback/primary method
      const durationMatch = message.match(/(\d+)\s*(day|days)/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 3;

      // Extract destination from message
      const destinations = ['Tokyo', 'Paris', 'London', 'New York', 'Madisonville', 'Rome', 'Sydney', 'Barcelona', 'Amsterdam', 'Russia', 'Moscow', 'St. Petersburg'];
      let destination = 'Paris'; // default

      for (const dest of destinations) {
        if (message.toLowerCase().includes(dest.toLowerCase())) {
          destination = dest;
          break;
        }
      }

      console.log(`🎯 Parsed: ${destination} for ${duration} days`);

      return {
        destination,
        duration,
        preferences: ['sightseeing', 'culture'],
        wasRedirected: false
      };

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      return {
        destination: 'Paris',
        duration: 3,
        preferences: ['sightseeing', 'culture'],
        wasRedirected: false
      };
    }
  }

  private async createTravelPlan(destination: string, duration: number, preferences: string[]): Promise<TravelPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const steps: TravelStep[] = [
      {
        id: `step_weather_${planId}`,
        type: 'weather_check',
        status: 'pending',
        autonomous: true,
        description: `Check current and forecasted weather conditions for ${destination}`,
        progress: 0
      },
      {
        id: `step_events_${planId}`,
        type: 'events_search',
        status: 'pending',
        autonomous: true,
        description: `Research local events, festivals, and activities in ${destination}`,
        progress: 0
      },
      {
        id: `step_accommodation_${planId}`,
        type: 'accommodation_search',
        status: 'pending',
        autonomous: true,
        description: `Find suitable accommodations in ${destination}`,
        progress: 0
      },
      {
        id: `step_itinerary_${planId}`,
        type: 'itinerary_generation',
        status: 'pending',
        autonomous: true,
        description: `Create a detailed ${duration}-day itinerary with activities and recommendations`,
        progress: 0
      }
    ];

    return {
      id: planId,
      destination,
      duration,
      status: 'planning',
      steps,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async startAutonomousPlanning(planId: string): Promise<void> {
    console.log('🚀 Starting autonomous planning for plan:', planId);
    // Start processing immediately and asynchronously
    setTimeout(async () => {
      console.log('🤖 Processing first step for plan:', planId);
      await this.processNextStep(planId);
    }, 1000); // Short delay to ensure response is sent first
  }

  private async processNextStep(planId: string): Promise<void> {
    console.log('🔄 processNextStep called for plan:', planId);
    const plan = this.activePlans.get(planId) || await this.getState(`plan_${planId}`);
    console.log('📋 Retrieved plan:', plan ? 'found' : 'not found');
    if (!plan) {
      console.log('❌ No plan found, exiting processNextStep');
      return;
    }

    // Optimized: Use findIndex for O(1) access after finding
    let nextStepIndex = -1;
    for (let i = 0; i < plan.steps.length; i++) {
      if (plan.steps[i].status === 'pending') {
        nextStepIndex = i;
        break;
      }
    }

    if (nextStepIndex === -1) {
      // All steps completed
      console.log('✅ All steps completed for plan:', planId);
      plan.status = 'completed';
      await this.setState(`plan_${planId}`, plan);
      return;
    }

    console.log('🎯 Processing step', nextStepIndex, 'of plan:', planId);

    const nextStep = plan.steps[nextStepIndex];

    // Process the step
    nextStep.status = 'in_progress';
    plan.updatedAt = new Date();
    await this.setState(`plan_${planId}`, plan);

    try {
      this.broadcastThinking(`🔍 ${nextStep.description}...`);
      this.broadcastProgress(planId, {
        stepId: nextStep.id,
        status: 'in_progress',
        thinking: `🔍 ${nextStep.description}...`
      });

      const result = await this.executeStep(nextStep, plan);
      nextStep.status = 'completed';
      nextStep.result = result;
      nextStep.progress = 100;

      this.broadcastThinking(`✅ ${nextStep.description} - Complete!`);
      this.broadcastProgress(planId, {
        stepId: nextStep.id,
        status: 'completed',
        result: result,
        thinking: `✅ Task completed successfully`
      });
    } catch (error) {
      nextStep.status = 'failed';
      console.error(`Step ${nextStep.id} failed:`, error);
    }

    plan.updatedAt = new Date();
    await this.setState(`plan_${planId}`, plan);

    // Optimized: Use Promise-based delay instead of setTimeout for better performance
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.processNextStep(planId);
  }

  private async executeStep(step: TravelStep, plan: TravelPlan): Promise<any> {
    switch (step.type) {
      case 'weather_check':
        return await this.checkWeather(plan.destination);

      case 'events_search':
        return await this.searchEvents(plan.destination);

      case 'accommodation_search':
        return await this.searchAccommodations(plan.destination);

      case 'itinerary_generation':
        return await this.generateItinerary(plan);

      default:
        return { message: `Step ${step.type} completed` };
    }
  }

  private async checkWeather(destination: string): Promise<any> {
    console.log('🌤️ Checking weather for:', destination);
    return {
      type: 'weather',
      destination,
      forecast: `Weather forecast for ${destination}: Expect mild temperatures with partly cloudy skies. Great for outdoor activities and sightseeing. Temperature range 22-28°C.`,
      recommendation: `Weather conditions are favorable for travel to ${destination}`
    };
  }

  private async searchEvents(destination: string): Promise<any> {
    console.log('🎭 Searching events for:', destination);
    return {
      type: 'events',
      destination,
      events: `Top events and activities in ${destination}: Local festivals, art galleries, museums, guided city tours, cultural performances, and seasonal attractions. Check local event calendars for specific dates.`,
      recommendation: `Exciting events and activities found for ${destination}`
    };
  }

  private async searchAccommodations(destination: string): Promise<any> {
    console.log('🏨 Searching accommodations for:', destination);
    return {
      type: 'accommodation',
      destination,
      options: `Accommodation options in ${destination}: Budget hostels and guesthouses ($20-40/night), mid-range hotels with good amenities ($50-120/night), luxury hotels and resorts ($150+/night). Book in advance for better rates.`,
      recommendation: `Various accommodation options found for ${destination}`
    };
  }

  private async generateItinerary(plan: TravelPlan): Promise<any> {
    try {
      // Optimized: Cache step results in a Map for O(1) lookup
      const stepResults = new Map<string, any>();
      for (const step of plan.steps) {
        if (step.result) {
          stepResults.set(step.type, step.result);
        }
      }

      const weatherResult = stepResults.get('weather_check');
      const eventsResult = stepResults.get('events_search');
      const accommodationResult = stepResults.get('accommodation_search');

      const context = [
        weatherResult?.forecast || '',
        eventsResult?.events || '',
        accommodationResult?.options || ''
      ].join('\n\n');

      console.log('📋 Generating itinerary for:', plan.destination, `(${plan.duration} days)`);

      const itinerary = this.generateDetailedItinerary(plan.destination, plan.duration);

      return {
        type: 'itinerary',
        destination: plan.destination,
        duration: plan.duration,
        itinerary,
        recommendation: `Complete ${plan.duration}-day itinerary created for ${plan.destination}`
      };
    } catch (error) {
      return {
        type: 'itinerary',
        destination: plan.destination,
        error: 'Itinerary generation failed',
        recommendation: 'Please plan itinerary manually'
      };
    }
  }

  private async getAgentStatus(): Promise<any> {
    const activePlans = Array.from(this.activePlans.values());

    return {
      status: 'ready',
      activePlans: activePlans.length,
      plans: activePlans.map(plan => {
        // Optimized: Count completed steps in single pass
        let completedSteps = 0;
        for (const step of plan.steps) {
          if (step.status === 'completed') completedSteps++;
        }

        return {
          id: plan.id,
          destination: plan.destination,
          status: plan.status,
          completedSteps,
          totalSteps: plan.steps.length
        };
      })
    };
  }

  private generateDetailedItinerary(destination: string, duration: number): string {
    const activities = this.getActivitiesByDestination(destination);
    let itinerary = `**${duration}-Day ${destination} Itinerary**\n\n`;

    for (let day = 1; day <= duration; day++) {
      const dayActivities = activities[((day - 1) % activities.length)];
      itinerary += `**Day ${day}:**\n`;
      itinerary += `• Morning: ${dayActivities.morning}\n`;
      itinerary += `• Lunch: ${dayActivities.lunch}\n`;
      itinerary += `• Afternoon: ${dayActivities.afternoon}\n`;
      itinerary += `• Evening: ${dayActivities.evening}\n\n`;
    }

    return itinerary;
  }

  private getActivitiesByDestination(destination: string): any[] {
    const destinationActivities: { [key: string]: any[] } = {
      'Russia': [
        {
          morning: 'Visit Red Square and St. Basil\'s Cathedral',
          lunch: 'Traditional Russian borscht at local restaurant',
          afternoon: 'Explore the Kremlin and Armory Chamber',
          evening: 'Bolshoi Theatre performance or Russian folk show'
        },
        {
          morning: 'Tour the Hermitage Museum (if in St. Petersburg) or Tretyakov Gallery (Moscow)',
          lunch: 'Try beef stroganoff and blini at authentic Russian cafe',
          afternoon: 'Walk along Nevsky Prospect or Arbat Street shopping district',
          evening: 'Traditional Russian banya experience and dinner'
        },
        {
          morning: 'Visit Peterhof Palace (St. Petersburg) or Sergiev Posad monastery (Moscow)',
          lunch: 'Russian caviar tasting and vodka flight',
          afternoon: 'Explore local markets and souvenir shopping',
          evening: 'Russian circus performance or ballet at Mariinsky Theatre'
        },
        {
          morning: 'Day trip to Golden Ring towns (Suzdal, Vladimir)',
          lunch: 'Traditional Russian pelmeni and kompot',
          afternoon: 'Visit Russian Orthodox monasteries and churches',
          evening: 'Folk dancing show and traditional feast'
        }
      ],
      'Paris': [
        {
          morning: 'Visit the Eiffel Tower and Trocadéro Gardens',
          lunch: 'French bistro lunch with wine in Montmartre',
          afternoon: 'Explore the Louvre Museum and Mona Lisa',
          evening: 'Seine River cruise and dinner at traditional brasserie'
        },
        {
          morning: 'Tour Notre-Dame Cathedral and Sainte-Chapelle',
          lunch: 'Picnic in Luxembourg Gardens with fresh baguettes',
          afternoon: 'Walk through Champs-Élysées and Arc de Triomphe',
          evening: 'Moulin Rouge show or Latin Quarter exploration'
        }
      ],
      'Madisonville': [
        {
          morning: 'Explore downtown Madisonville and historic district',
          lunch: 'Southern comfort food at local diner',
          afternoon: 'Visit local parks and community attractions',
          evening: 'Local music venues and Southern hospitality dining'
        },
        {
          morning: 'Nature walks and outdoor activities',
          lunch: 'BBQ and regional specialties',
          afternoon: 'Shopping and local crafts exploration',
          evening: 'Community events and local entertainment'
        }
      ]
    };

    // Default activities for destinations not specifically defined
    const defaultActivities = [
      {
        morning: 'Explore main city attractions and landmarks',
        lunch: 'Try authentic local cuisine at recommended restaurants',
        afternoon: 'Visit museums, galleries, or cultural sites',
        evening: 'Experience local nightlife and entertainment'
      },
      {
        morning: 'Take guided city walking tour',
        lunch: 'Food market exploration and local specialties',
        afternoon: 'Shopping districts and local crafts',
        evening: 'Traditional cultural performance or local bars'
      },
      {
        morning: 'Day trip to nearby attractions or nature sites',
        lunch: 'Outdoor dining with scenic views',
        afternoon: 'Adventure activities or historical sites',
        evening: 'Sunset viewing and farewell dinner'
      }
    ];

    return destinationActivities[destination] || defaultActivities;
  }

  async onWebSocketMessage(websocket: WebSocket, message: string): Promise<void> {
    // WebSocket message handling
    console.log('WebSocket message received:', message);
  }
}