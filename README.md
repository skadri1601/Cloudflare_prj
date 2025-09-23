# 🌍 AI Travel Planner

> **An intelligent travel agent powered by Cloudflare's edge computing platform**

A sophisticated AI-powered travel planning application that leverages Cloudflare Workers, Durable Objects, Workers AI, and Workflows to create personalized travel experiences with real-time data integration.

## 🚀 Live Demo

**Frontend**: [Your Cloudflare Pages URL]
**API**: [Your Worker URL]

## ✨ Features

### 🤖 **AI-Powered Conversations**
- Natural language interaction using **Llama 3.3 70B** via Workers AI
- Context-aware responses that understand travel terminology
- Personalized recommendations based on user preferences

### 🧠 **Persistent Memory**
- **Durable Objects** store user preferences across sessions
- Remembers past conversations and travel interests
- Learns from user interactions to improve recommendations

### 🌊 **Workflow Orchestration**
- **Cloudflare Workflows** coordinate complex multi-step operations
- Parallel API calls for weather, events, and accommodation data
- Robust error handling and retry mechanisms

### 🌤️ **Real-Time Data Integration**
- Live weather data from OpenWeatherMap API
- Local events and activities (extensible to multiple APIs)
- Dynamic content based on current conditions

### 🎨 **Modern UI/UX**
- Responsive chat interface built with vanilla JavaScript
- Real-time typing indicators and smooth animations
- Mobile-optimized design with dark mode support

### ⚡ **Edge Computing Performance**
- Global deployment via Cloudflare's edge network
- Sub-100ms response times worldwide
- Automatic scaling and high availability

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Cloudflare    │    │   Cloudflare    │
│     Pages       │    │    Workers      │    │   Workers AI    │
│   (Frontend)    │◄──►│   (API/Logic)   │◄──►│ (LLaMA 3.3 70B) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Durable Objects│
                       │  (User Memory)  │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Workflows     │
                       │ (Orchestration) │
                       └─────────────────┘
                                │
                                ▼
                    ┌─────────────────────────────┐
                    │      External APIs          │
                    │  Weather • Events • Hotels  │
                    └─────────────────────────────┘
```

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Vanilla JS, HTML5, CSS3 | Responsive chat interface |
| **Backend** | Cloudflare Workers | Serverless API endpoints |
| **AI** | Workers AI (Llama 3.3 70B) | Natural language processing |
| **Memory** | Durable Objects | Persistent user state |
| **Orchestration** | Cloudflare Workflows | Multi-step operations |
| **Deployment** | Cloudflare Pages + Workers | Global edge deployment |
| **APIs** | OpenWeatherMap, Events APIs | Real-time data |

## 📁 Project Structure

```
cf_ai_travel_planner/
├── src/
│   ├── index.js           # Worker entrypoint & routing
│   ├── agent.js           # AI agent logic & Workers AI integration
│   ├── memory.js          # Durable Object for user memory
│   ├── workflows.js       # Workflow orchestration
│   └── ui/
│       ├── index.html     # Main frontend interface
│       ├── style.css      # Responsive styling
│       └── app.js         # Frontend JavaScript logic
├── prompts/
│   └── PROMPTS.md         # All system prompts for transparency
├── tests/
│   └── agent.test.js      # Unit tests
├── wrangler.toml          # Cloudflare configuration
├── package.json           # Dependencies
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Cloudflare Account](https://cloudflare.com)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. Clone & Install

```bash
git clone <your-repo>
cd cf-ai-travel-planner
npm install
```

### 2. Configure Environment

```bash
# Login to Cloudflare
wrangler login

# Copy and edit configuration
cp wrangler.toml.example wrangler.toml
```

### 3. Set Environment Variables

```bash
# Weather API (optional but recommended)
wrangler secret put WEATHER_API_KEY
# Enter your OpenWeatherMap API key

# Events API (optional)
wrangler secret put EVENTS_API_KEY
# Enter your events API key
```

### 4. Deploy

```bash
# Deploy Worker
wrangler deploy

# Deploy frontend to Pages
wrangler pages deploy src/ui --project-name=ai-travel-planner
```

### 5. Local Development

```bash
# Start local development server
npm run dev

# Preview frontend locally
npm run preview
```

## 🔧 Configuration

### Required Cloudflare Services

1. **Workers AI** - Enable in your Cloudflare dashboard
2. **Durable Objects** - Automatically configured via wrangler.toml
3. **Workflows** - Preview feature, request access if needed
4. **Pages** - For frontend hosting

### API Keys Setup

#### OpenWeatherMap (Recommended)
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key
3. Add to Cloudflare secrets: `wrangler secret put WEATHER_API_KEY`

#### Events APIs (Optional)
- Ticketmaster Discovery API
- Eventbrite API
- Meetup API

### wrangler.toml Configuration

```toml
name = "cf-ai-travel-planner"
main = "src/index.js"
compatibility_date = "2024-10-01"

[ai]
binding = "AI"

[[durable_objects.bindings]]
name = "TRAVEL_MEMORY"
class_name = "TravelMemory"

[[workflows]]
binding = "MY_WORKFLOW"
class_name = "TravelWorkflow"
```

## 🎯 Usage Examples

### Basic Travel Planning
```
User: "Plan me a 3-day trip to Seattle in November. I love hiking and museums."

AI: 🌍 Seattle - 3 Day Itinerary

Based on current weather (12°C, light rain) and your love for hiking and museums:

Day 1: Arrival & Indoor Exploration
- 10:00 AM: Pike Place Market - Perfect for a rainy day
- 2:00 PM: Museum of Pop Culture - Matches your museum interest
- 7:00 PM: Dinner in Capitol Hill

Day 2: Outdoor Adventure (Clearer Weather Expected)
- 8:00 AM: Mount Rainier Day Hike - Trail recommendations
- 6:00 PM: Return to city

Day 3: Cultural Immersion
- 9:00 AM: Seattle Art Museum
- 1:00 PM: Underground Tour
- 4:00 PM: Local coffee culture experience

💡 Pro Tips: Pack layers for weather changes, book museum tickets online...
```

### Weather-Based Recommendations
```
User: "What's the weather like in Tokyo right now?"

AI: 🌤️ Tokyo Weather Update:
Current: 18°C, partly cloudy
Perfect for outdoor sightseeing!

Since you enjoy cultural activities, this is ideal weather for:
- Walking through Senso-ji Temple
- Exploring Harajuku district
- Outdoor dining in Shibuya

Tomorrow shows rain, so save indoor activities like TeamLab Borderless...
```

## 🧪 Testing

### Local Testing
```bash
# Run tests
npm test

# Test specific components
npm test -- --grep "agent"
```

### Manual Testing Endpoints

```bash
# Health check
curl https://your-worker.your-subdomain.workers.dev/health

# Chat endpoint
curl -X POST https://your-worker.your-subdomain.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Plan a trip to Paris", "userId": "test-user"}'

# Memory check
curl https://your-worker.your-subdomain.workers.dev/memory/preferences?userId=test-user
```

## 📈 Performance & Monitoring

### Metrics to Monitor
- **Response Time**: Target <100ms for chat responses
- **AI Processing**: Monitor Workers AI usage and costs
- **Memory Usage**: Track Durable Object storage
- **Error Rates**: Watch for API failures and timeouts

### Cloudflare Analytics
- Worker invocations and duration
- Pages traffic and performance
- AI model usage and costs
- Durable Object operations

## 🔒 Security & Privacy

### Data Protection
- **User Privacy**: Conversations stored in user-specific Durable Objects
- **API Security**: All external API keys stored as Cloudflare secrets
- **CORS**: Properly configured for frontend-backend communication

### Rate Limiting
- Built-in rate limiting per user (configurable)
- Cloudflare's DDoS protection at the edge
- API key rotation support

## 🚀 Deployment

### Production Deployment

```bash
# Deploy to production
wrangler deploy --env production

# Deploy frontend
wrangler pages deploy src/ui --project-name=ai-travel-planner --branch=main
```

### Custom Domain Setup

1. Add custom domain in Cloudflare Dashboard
2. Update `wrangler.toml` with routes
3. Configure DNS records

```toml
[env.production]
routes = [
  { pattern = "travel.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch
4. **Make** your changes
5. **Test** thoroughly
6. **Submit** a pull request

### Code Standards

- **ESLint** configuration for consistent code style
- **Prettier** for code formatting
- **JSDoc** comments for all functions
- **Unit tests** for new features

### Areas for Contribution

- 🌐 **API Integrations**: Add new travel APIs (flights, hotels, restaurants)
- 🎨 **UI/UX**: Improve frontend design and user experience
- 🧠 **AI Improvements**: Enhance prompt engineering and response quality
- 🔧 **Performance**: Optimize Workers and reduce latency
- 📱 **Mobile**: Improve mobile experience and add PWA features
- 🌍 **Internationalization**: Add multi-language support

## 📊 Roadmap

### Phase 1: Core Features ✅
- [x] Basic chat interface
- [x] AI integration with Workers AI
- [x] User memory with Durable Objects
- [x] Weather API integration
- [x] Workflow orchestration

### Phase 2: Enhanced Features 🚧
- [ ] Flight and hotel booking integration
- [ ] Advanced itinerary export (PDF, calendar)
- [ ] Voice input/output
- [ ] Mobile app (React Native)
- [ ] Social sharing features

### Phase 3: Enterprise Features 🔮
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] B2B travel agency features
- [ ] Custom branding options
- [ ] Enterprise SSO integration

## 💰 Cost Estimation

### Cloudflare Services
- **Workers**: ~$5/month for 10M requests
- **Workers AI**: ~$10/month for moderate usage
- **Durable Objects**: ~$2/month for 1000 active users
- **Pages**: Free tier (generous limits)

### External APIs
- **OpenWeatherMap**: Free tier (1000 calls/day)
- **Additional APIs**: Varies by provider

**Total Estimated Cost**: $15-25/month for moderate usage

## 🆘 Troubleshooting

### Common Issues

#### Worker Deployment Fails
```bash
# Check wrangler authentication
wrangler whoami

# Verify configuration
wrangler dev --local
```

#### AI Responses Not Working
- Verify Workers AI is enabled in your account
- Check AI binding in wrangler.toml
- Monitor AI usage limits

#### Memory Not Persisting
- Confirm Durable Object binding configuration
- Check user ID generation in frontend
- Verify DO storage operations

#### API Integration Issues
- Test API keys with curl directly
- Check secret configuration: `wrangler secret list`
- Monitor external API rate limits

### Debug Mode

Enable debug logging:
```javascript
// In your Worker
console.log('Debug:', { userId, message, timestamp: Date.now() });
```

Monitor logs:
```bash
wrangler tail
```

## 📞 Support

### Getting Help

- **Documentation**: [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- **Community**: [Cloudflare Discord](https://discord.gg/cloudflaredev)
- **Issues**: [GitHub Issues](your-repo/issues)

### Feature Requests

Open an issue with:
- Clear description of the feature
- Use case and benefits
- Implementation suggestions (optional)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cloudflare** for the amazing edge computing platform
- **OpenWeatherMap** for weather data
- **Meta** for the Llama model
- **Travel community** for inspiration and feedback

---

**Built with ❤️ using Cloudflare's edge computing platform**

*Showcase project demonstrating the power of Workers AI, Durable Objects, and Workflows for intelligent applications.*