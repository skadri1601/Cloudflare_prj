/**
 * Simulated Agents SDK for Cloudflare Workers
 * This provides the Agent base class functionality for our demo
 * In production, this would be imported from the official "agents" package
 */

// Import Cloudflare Workers types
declare global {
  interface DurableObjectState {
    storage: DurableObjectStorage;
  }

  interface DurableObjectStorage {
    get(key: string): Promise<any>;
    put(key: string, value: any): Promise<void>;
  }
}

/**
 * Base Agent class that extends Durable Object functionality
 * Provides state management and scheduled execution capabilities
 */
export class Agent {
  public state: DurableObjectState;
  public env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  /**
   * Get state from durable storage
   */
  async getState(key: string): Promise<any> {
    return await this.state.storage.get(key);
  }

  /**
   * Set state in durable storage
   */
  async setState(key: string, value: any): Promise<void> {
    await this.state.storage.put(key, value);
  }

  /**
   * Schedule a function to run later
   * This simulates the Agents SDK scheduling capability
   */
  async schedule(name: string, payload: any, scheduledTime: Date): Promise<void> {
    // In a real Agents SDK, this would use the scheduler
    // For demo purposes, we'll use setTimeout for immediate scheduling
    setTimeout(async () => {
      await this.scheduled(scheduledTime, name);
    }, Math.max(0, scheduledTime.getTime() - Date.now()));
  }

  /**
   * Scheduled function handler
   * Override this in your agent to handle scheduled tasks
   */
  async scheduled(scheduledTime: Date, name: string): Promise<void> {
    // Override in subclass
  }

  /**
   * Handle user messages - override in your agent
   */
  async onUserMessage(message: string, metadata?: any): Promise<any> {
    return { message: "Agent received: " + message };
  }

  /**
   * Handle WebSocket messages - override in your agent
   */
  async onWebSocketMessage(websocket: WebSocket, message: string): Promise<void> {
    // Override in subclass
  }
}