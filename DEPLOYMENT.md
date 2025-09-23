# 🚀 Deployment Guide

Complete step-by-step deployment guide for the AI Travel Planner.

## Prerequisites Checklist

- [ ] Cloudflare account with Workers enabled
- [ ] Wrangler CLI installed (`npm install -g wrangler`)
- [ ] Node.js 18+ installed
- [ ] Git repository ready

## 🔧 Pre-Deployment Setup

### 1. Cloudflare Account Setup

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Enable Required Services

In your Cloudflare Dashboard:
- ✅ **Workers** - Enable in Workers & Pages
- ✅ **Workers AI** - Enable in AI section
- ✅ **Durable Objects** - Automatically enabled with Workers
- ✅ **Workflows** - Request preview access if needed

### 3. API Keys Configuration

#### OpenWeatherMap API (Recommended)
```bash
# Get API key from https://openweathermap.org/api
wrangler secret put WEATHER_API_KEY
# Enter your API key when prompted
```

#### Optional APIs
```bash
# Events API (if using Ticketmaster, Eventbrite, etc.)
wrangler secret put EVENTS_API_KEY
```

## 📦 Deployment Steps

### Step 1: Deploy Worker

```bash
# Install dependencies
npm install

# Deploy to Cloudflare Workers
wrangler deploy

# Expected output:
# ✅ Successfully deployed to:
#    https://cf-ai-travel-planner.your-subdomain.workers.dev
```

### Step 2: Test Worker Deployment

```bash
# Test health endpoint
curl https://cf-ai-travel-planner.your-subdomain.workers.dev/health

# Expected response:
# {"status":"healthy","timestamp":"2024-...","version":"1.0.0"}
```

### Step 3: Deploy Frontend to Pages

```bash
# Deploy UI to Cloudflare Pages
wrangler pages deploy src/ui --project-name=ai-travel-planner

# Expected output:
# ✅ Successfully deployed to:
#    https://ai-travel-planner.pages.dev
```

### Step 4: Configure Custom Domain (Optional)

1. **Add Custom Domain in Dashboard**
   - Go to Workers & Pages > Your Worker > Triggers
   - Add Custom Domain: `travel.yourdomain.com`

2. **Update DNS Records**
   ```
   Type: CNAME
   Name: travel
   Target: cf-ai-travel-planner.your-subdomain.workers.dev
   ```

3. **Update Frontend Configuration**
   ```javascript
   // In src/ui/app.js
   const API_BASE = 'https://travel.yourdomain.com';
   ```

## 🧪 Post-Deployment Testing

### 1. Automated Tests

```bash
# Run test suite
npm test

# Test specific components
npm test -- --grep "TravelAgent"
```

### 2. Manual API Testing

```bash
# Health check
curl https://your-worker-url/health

# Chat endpoint test
curl -X POST https://your-worker-url/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Plan a 2-day trip to Paris",
    "userId": "test-user-123"
  }'

# Memory endpoint test
curl https://your-worker-url/memory/preferences?userId=test-user-123
```

### 3. Frontend Testing

1. **Open your Pages URL**
2. **Test chat functionality**
3. **Verify memory persistence**
4. **Test responsive design**

## 📊 Monitoring Setup

### 1. Cloudflare Analytics

Monitor in your Dashboard:
- **Worker Requests**: Volume and performance
- **AI Usage**: Token consumption and costs
- **Durable Objects**: Storage operations
- **Error Rates**: 4xx/5xx responses

### 2. Custom Metrics (Optional)

Add to your Worker:
```javascript
// In src/index.js
ctx.waitUntil(logMetrics({
  timestamp: Date.now(),
  userId: userId,
  responseTime: Date.now() - startTime,
  tokensUsed: aiResponse.usage?.total_tokens
}));
```

## 🔧 Environment Configuration

### Production Environment

```toml
# wrangler.toml
[env.production]
name = "cf-ai-travel-planner-prod"
routes = [
  { pattern = "travel.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "warn"
```

### Staging Environment

```toml
[env.staging]
name = "cf-ai-travel-planner-staging"

[env.staging.vars]
ENVIRONMENT = "staging"
LOG_LEVEL = "debug"
```

Deploy to specific environment:
```bash
wrangler deploy --env production
wrangler deploy --env staging
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### 1. "Durable Object binding not found"
```bash
# Verify binding in wrangler.toml
[[durable_objects.bindings]]
name = "TRAVEL_MEMORY"
class_name = "TravelMemory"
script_name = "cf-ai-travel-planner"
```

#### 2. "Workers AI not available"
- Verify Workers AI is enabled in dashboard
- Check account limits and billing
- Ensure compatibility_date is recent

#### 3. "Module not found" errors
```bash
# Check exports in index.js
export { TravelMemory, TravelWorkflow };
```

#### 4. CORS issues
```javascript
// Verify CORS headers in index.js
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

### Performance Issues

#### 1. Slow Response Times
- Check external API response times
- Monitor Durable Object operations
- Optimize AI prompt length

#### 2. High Memory Usage
- Implement conversation history cleanup
- Optimize data structures in Durable Objects

### Debugging Tools

```bash
# Stream real-time logs
wrangler tail

# Stream logs for specific environment
wrangler tail --env production

# Filter logs
wrangler tail --grep "ERROR"
```

## 💰 Cost Optimization

### Workers Billing
- **Requests**: $0.50 per million requests
- **CPU Time**: $12.50 per million GB-seconds
- **First 100k requests/day**: Free

### Workers AI Billing
- **Input tokens**: ~$0.50 per million tokens
- **Output tokens**: ~$2.50 per million tokens
- **Free tier**: 10k tokens/day

### Optimization Strategies

1. **Reduce AI Token Usage**
   ```javascript
   // Limit conversation history
   const recentHistory = history.slice(-5); // Only last 5 messages

   // Optimize system prompts
   const shortPrompt = "You are a travel agent. Be concise.";
   ```

2. **Cache External API Responses**
   ```javascript
   // Use KV for weather caching
   const cachedWeather = await env.CACHE.get(`weather:${location}`);
   if (cachedWeather && Date.now() - cachedWeather.timestamp < 3600000) {
     return JSON.parse(cachedWeather.data);
   }
   ```

3. **Optimize Durable Object Usage**
   ```javascript
   // Batch operations
   await this.state.storage.put({
     'userMemory': memory,
     'lastUpdate': Date.now()
   });
   ```

## 🔄 Continuous Deployment

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production

      - name: Deploy Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          projectName: ai-travel-planner
          directory: src/ui
```

### Environment Secrets

Add to GitHub Secrets:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token
- `WEATHER_API_KEY`: OpenWeatherMap API key

## 📈 Scaling Considerations

### Traffic Growth
- **Workers**: Auto-scales globally
- **Durable Objects**: Consider data partitioning
- **AI Usage**: Monitor token consumption

### Feature Expansion
- **Multiple AI Models**: A/B test different models
- **Additional APIs**: Rate limiting and fallbacks
- **Multi-language**: i18n implementation

## 🔒 Security Checklist

- [ ] API keys stored as secrets (not in code)
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] No sensitive data in logs
- [ ] Regular security updates

## 📞 Support Resources

- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Workers Discord**: https://discord.gg/cloudflaredev
- **Status Page**: https://www.cloudflarestatus.com/

## 🎯 Next Steps

After successful deployment:

1. **Monitor Performance**: Set up alerts for errors/latency
2. **Gather Feedback**: User testing and iteration
3. **Feature Development**: Add new capabilities
4. **Optimization**: Improve costs and performance

---

**🎉 Congratulations! Your AI Travel Planner is now live on Cloudflare's global network!**