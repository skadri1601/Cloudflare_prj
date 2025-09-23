# 🛠️ Quick Setup Guide

## Before You Deploy - Action Items

### 1. 🔑 Get API Keys (5 minutes)

**Required: Weather API**
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for free account
3. Go to "API Keys" tab
4. Copy your API key
5. Save it - you'll need it for deployment

**Optional: Events API**
- [Ticketmaster API](https://developer.ticketmaster.com/) - for events data
- [Eventbrite API](https://www.eventbrite.com/platform/api/) - for local events

### 2. 📝 Update Your Information

Replace these placeholders in the code:

**In README.md:**
- Line 8: Replace `[Your Cloudflare Pages URL]` with your actual URL after deployment
- Line 9: Replace `[Your Worker URL]` with your actual worker URL after deployment
- Line 470: Replace `<your-repo>` with your GitHub repo URL

**In wrangler.toml:**
- Line 1: `name = "cf-ai-travel-planner"` - You can customize this name
- Line 33-34: Update KV namespace IDs after creating them (optional)

### 3. 🌐 Cloudflare Account Setup

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Create Cloudflare account at cloudflare.com (free tier is fine)

# 3. Enable Workers AI in your dashboard:
#    - Go to Workers & Pages
#    - Click "Workers AI"
#    - Enable it (free tier: 10k tokens/day)

# 4. Login via Wrangler
wrangler login
```

### 4. 🚀 Deployment Commands

```bash
# Install dependencies
npm install

# Add your weather API key
wrangler secret put WEATHER_API_KEY
# Paste your OpenWeatherMap API key when prompted

# Deploy the Worker
wrangler deploy

# Deploy the frontend
wrangler pages deploy src/ui --project-name=ai-travel-planner
```

### 5. 🧪 Test Your Deployment

After deployment, test these URLs:

```bash
# Health check (replace with your worker URL)
curl https://cf-ai-travel-planner.your-subdomain.workers.dev/health

# Chat test
curl -X POST https://cf-ai-travel-planner.your-subdomain.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "userId": "test-123"}'
```

## 📋 Deployment Checklist

- [ ] OpenWeatherMap API key obtained
- [ ] Cloudflare account created
- [ ] Workers AI enabled in dashboard
- [ ] Wrangler CLI installed and logged in
- [ ] `npm install` completed
- [ ] Weather API key added via `wrangler secret put WEATHER_API_KEY`
- [ ] Worker deployed with `wrangler deploy`
- [ ] Frontend deployed with `wrangler pages deploy src/ui`
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Chat endpoint responds to test message

## 🔧 Optional Customizations

### Custom Domain
If you want a custom domain like `travel.yourdomain.com`:

1. Add domain in Cloudflare dashboard
2. Update `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "travel.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

### Branding
Update these for your personal branding:

**src/ui/index.html:**
- Line 6: `<title>` - Your custom title
- Line 15: Logo and app name

**src/ui/style.css:**
- Colors and styling to match your brand

**README.md:**
- Replace "Saad" with your name
- Add your social links/portfolio

## 🚨 Common Issues & Solutions

**"Workers AI not available"**
- Ensure Workers AI is enabled in your Cloudflare dashboard
- Check your account billing status

**"Durable Object binding not found"**
- The binding is auto-configured in wrangler.toml
- Try `wrangler deploy` again

**CORS errors in frontend**
- Ensure your frontend is deployed to the same domain or CORS is configured
- Check the corsHeaders in src/index.js

**Weather API not working**
- Verify your API key is correct
- Check you have free quota remaining at OpenWeatherMap

## 💡 Pro Tips

1. **Development**: Use `wrangler dev` for local testing
2. **Logs**: Use `wrangler tail` to see real-time logs
3. **Costs**: Free tier covers development and light usage
4. **Performance**: Global edge deployment = fast responses worldwide

## 📞 Need Help?

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Discord**: https://discord.gg/cloudflaredev
- **GitHub Issues**: Create issue in your repo

---

**You're ready to deploy! 🚀 This will be an impressive showcase for your Cloudflare application.**