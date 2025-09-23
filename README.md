# 🌍 AI Travel Planner

> **An intelligent travel agent powered by Cloudflare's edge computing platform**

A sophisticated AI-powered travel planning application built by Saad that leverages Cloudflare Workers, Durable Objects, Workers AI, and Workflows to create personalized travel experiences with real-time data integration.

## 🚀 Live Demo

**Frontend**: https://79ff39e6.ai-travel-planner-2jl.pages.dev
**API**: https://cf-ai-travel-planner.kadrisaad16.workers.dev

## ✨ Features

### 🤖 **AI-Powered Conversations**
- Natural language interaction using **LLaMA 3.1 70B** via Workers AI
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
- Mobile-optimized design with modern CSS design system
- User authentication and personalized experience

### ⚡ **Edge Computing Performance**
- Global deployment via Cloudflare's edge network
- Sub-100ms response times worldwide
- Automatic scaling and high availability

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Cloudflare    │    │   Cloudflare    │
│     Pages       │    │    Workers      │    │   Workers AI    │
│   (Frontend)    │◄──►│   (API/Logic)   │◄──►│ (LLaMA 3.1 70B) │
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
| **AI** | Workers AI (LLaMA 3.1 70B) | Natural language processing |
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
│       ├── style.css      # Responsive styling with design system
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
git clone https://github.com/skadri1601/Cloudflare_prj.git
cd Cloudflare_prj
npm install
```

### 2. Configure Environment

```bash
# Login to Cloudflare
wrangler login

# Configuration is already set up in wrangler.toml
```

### 3. Set Environment Variables

```bash
# Weather API (required for weather features)
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

#### OpenWeatherMap (Required)
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key
3. Add to Cloudflare secrets: `wrangler secret put WEATHER_API_KEY`

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
script_name = "cf-ai-travel-planner"

[[workflows]]
binding = "MY_WORKFLOW"
class_name = "TravelWorkflow"

[durable_objects]
bindings = [
  { name = "TRAVEL_MEMORY", class_name = "TravelMemory" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["TravelMemory"]
```

## 🎯 Key Features Implemented

### User Experience
- **Login System**: Personalized user authentication with username validation
- **Home Navigation**: Easy return to welcome screen from any conversation
- **Memory Management**: Clear conversation history with user confirmation
- **Real-time Feedback**: Loading states, typing indicators, and notifications

### Technical Features
- **API Routing**: Sophisticated endpoint handling for chat, memory, and workflows
- **Error Handling**: Comprehensive error management with user-friendly messages
- **CORS Support**: Proper cross-origin configuration for frontend-backend communication
- **Rate Limiting**: Built-in protection against abuse

### Design System
- **CSS Variables**: Consistent theming and easy customization
- **Responsive Design**: Mobile-first approach with fluid layouts
- **Modern Animations**: Smooth transitions and micro-interactions
- **Accessibility**: Focus states and keyboard navigation support

## 🧪 Testing

### Manual Testing Endpoints

```bash
# Health check
curl https://cf-ai-travel-planner.kadrisaad16.workers.dev/health

# Chat endpoint
curl -X POST https://cf-ai-travel-planner.kadrisaad16.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Plan a trip to Paris", "userId": "test-user"}'

# Clear memory
curl -X POST "https://cf-ai-travel-planner.kadrisaad16.workers.dev/clear-memory?userId=test-user"
```

## 📈 Performance & Monitoring

### Metrics to Monitor
- **Response Time**: Current performance <200ms for chat responses
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
- **Input Validation**: Username and message validation on both client and server

### Rate Limiting
- Built-in rate limiting per user (configurable)
- Cloudflare's DDoS protection at the edge
- API key rotation support

## 💰 Cost Estimation

### Cloudflare Services
- **Workers**: ~$5/month for 10M requests
- **Workers AI**: ~$10/month for moderate usage
- **Durable Objects**: ~$2/month for 1000 active users
- **Pages**: Free tier (generous limits)

### External APIs
- **OpenWeatherMap**: Free tier (1000 calls/day)

**Total Estimated Cost**: $15-20/month for moderate usage

## 🆘 Troubleshooting

### Common Issues

#### Clear Memory Not Working
- Verify user authentication
- Check network connectivity
- Ensure proper API endpoint configuration

#### AI Responses Not Working
- Verify Workers AI is enabled in your account
- Check AI binding in wrangler.toml
- Monitor AI usage limits

#### Memory Not Persisting
- Confirm Durable Object binding configuration
- Check user ID generation in frontend
- Verify DO storage operations

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

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cloudflare** for the amazing edge computing platform
- **OpenWeatherMap** for weather data
- **Meta** for the LLaMA model
- **Travel community** for inspiration and feedback

---

**Built by Saad Kadri using Cloudflare's edge computing platform**

*Internship application project demonstrating advanced use of Workers AI, Durable Objects, and Workflows for intelligent applications.*