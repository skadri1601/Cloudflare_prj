import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class TravelWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { location, userPreferences, requestType } = event.payload;

    try {
      switch (requestType) {
        case 'full_planning':
          return await this.fullTravelPlanning(step, location, userPreferences);
        case 'weather_check':
          return await this.weatherCheck(step, location);
        case 'events_search':
          return await this.eventsSearch(step, location, userPreferences);
        case 'itinerary_generation':
          return await this.generateDetailedItinerary(step, location, userPreferences);
        default:
          throw new Error(`Unknown request type: ${requestType}`);
      }
    } catch (error) {
      console.error('Workflow error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async fullTravelPlanning(step, location, userPreferences) {
    // Step 1: Get weather data
    const weatherData = await step.do('fetch-weather', async () => {
      return await this.fetchWeatherData(location);
    });

    // Step 2: Get local events (parallel with weather)
    const eventsData = await step.do('fetch-events', async () => {
      return await this.fetchEventsData(location, userPreferences);
    });

    // Step 3: Get accommodation suggestions (if needed)
    const accommodationData = await step.do('fetch-accommodations', async () => {
      if (userPreferences.needsAccommodation) {
        return await this.fetchAccommodationData(location, userPreferences);
      }
      return null;
    });

    // Step 4: Generate comprehensive travel advice
    const travelAdvice = await step.do('generate-advice', async () => {
      return await this.generateTravelAdvice({
        location,
        weather: weatherData,
        events: eventsData,
        accommodations: accommodationData,
        preferences: userPreferences
      });
    });

    return {
      success: true,
      data: {
        location,
        weather: weatherData,
        events: eventsData,
        accommodations: accommodationData,
        advice: travelAdvice
      },
      timestamp: new Date().toISOString()
    };
  }

  async weatherCheck(step, location) {
    const weatherData = await step.do('weather-api-call', async () => {
      return await this.fetchWeatherData(location);
    });

    return {
      success: true,
      data: { weather: weatherData },
      timestamp: new Date().toISOString()
    };
  }

  async eventsSearch(step, location, userPreferences) {
    const eventsData = await step.do('events-api-call', async () => {
      return await this.fetchEventsData(location, userPreferences);
    });

    return {
      success: true,
      data: { events: eventsData },
      timestamp: new Date().toISOString()
    };
  }

  async generateDetailedItinerary(step, location, userPreferences) {
    // Step 1: Gather all necessary data in parallel
    const [weatherData, eventsData] = await Promise.all([
      step.do('weather-for-itinerary', async () => {
        return await this.fetchWeatherData(location);
      }),
      step.do('events-for-itinerary', async () => {
        return await this.fetchEventsData(location, userPreferences);
      })
    ]);

    // Step 2: Generate structured itinerary
    const itinerary = await step.do('create-itinerary', async () => {
      return await this.createStructuredItinerary({
        location,
        weather: weatherData,
        events: eventsData,
        preferences: userPreferences
      });
    });

    return {
      success: true,
      data: { itinerary },
      timestamp: new Date().toISOString()
    };
  }

  async fetchWeatherData(location) {
    try {
      const apiKey = this.env.WEATHER_API_KEY;
      if (!apiKey) {
        return {
          error: 'Weather API key not configured',
          location,
          fallback: 'Please check local weather conditions before traveling'
        };
      }

      // OpenWeatherMap current weather
      const currentWeatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
      );

      if (!currentWeatherResponse.ok) {
        throw new Error(`Weather API error: ${currentWeatherResponse.status}`);
      }

      const currentWeather = await currentWeatherResponse.json();

      // 5-day forecast
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
      );

      let forecast = null;
      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json();
        forecast = forecastData.list.slice(0, 10); // Next 10 forecasts (roughly 2-3 days)
      }

      return {
        location: currentWeather.name,
        country: currentWeather.sys.country,
        current: {
          temperature: Math.round(currentWeather.main.temp),
          description: currentWeather.weather[0].description,
          humidity: currentWeather.main.humidity,
          windSpeed: currentWeather.wind.speed,
          visibility: currentWeather.visibility / 1000, // Convert to km
          icon: currentWeather.weather[0].icon
        },
        forecast: forecast ? forecast.map(item => ({
          datetime: item.dt_txt,
          temperature: Math.round(item.main.temp),
          description: item.weather[0].description,
          icon: item.weather[0].icon
        })) : null
      };

    } catch (error) {
      console.error('Weather fetch error:', error);
      return {
        error: error.message,
        location,
        fallback: 'Weather data unavailable. Please check local conditions.'
      };
    }
  }

  async fetchEventsData(location, userPreferences) {
    try {
      // In a real implementation, you would use APIs like:
      // - Ticketmaster Discovery API
      // - Eventbrite API
      // - Facebook Events API
      // - Meetup API

      // For demo purposes, we'll return curated events based on preferences
      const sampleEvents = this.generateSampleEvents(location, userPreferences);

      return {
        location,
        events: sampleEvents,
        source: 'demo_data',
        count: sampleEvents.length
      };

    } catch (error) {
      console.error('Events fetch error:', error);
      return {
        error: error.message,
        location,
        events: [],
        fallback: 'Event data unavailable. Check local event listings.'
      };
    }
  }

  generateSampleEvents(location, preferences) {
    const baseEvents = [
      {
        name: 'Local Art Gallery Opening',
        type: 'culture',
        date: '2024-11-20',
        time: '18:00',
        description: 'Contemporary art exhibition featuring local artists',
        venue: 'Downtown Gallery',
        category: 'museums'
      },
      {
        name: 'Weekend Hiking Group',
        type: 'outdoor',
        date: '2024-11-23',
        time: '08:00',
        description: 'Guided nature hike through scenic trails',
        venue: 'Mountain Trail Head',
        category: 'hiking'
      },
      {
        name: 'Food Truck Festival',
        type: 'food',
        date: '2024-11-22',
        time: '12:00',
        description: 'Local cuisine and international food vendors',
        venue: 'City Park',
        category: 'food'
      },
      {
        name: 'Live Music Concert',
        type: 'entertainment',
        date: '2024-11-21',
        time: '20:00',
        description: 'Local bands and live performances',
        venue: 'Music Hall',
        category: 'entertainment'
      },
      {
        name: 'Historical Walking Tour',
        type: 'culture',
        date: '2024-11-24',
        time: '14:00',
        description: 'Discover the rich history of the city',
        venue: 'Historic District',
        category: 'culture'
      }
    ];

    // Filter events based on user preferences
    if (preferences && preferences.activities) {
      return baseEvents.filter(event =>
        preferences.activities.some(activity =>
          event.category.includes(activity.toLowerCase()) ||
          event.type.includes(activity.toLowerCase())
        )
      );
    }

    return baseEvents.slice(0, 3); // Return first 3 if no specific preferences
  }

  async fetchAccommodationData(location, preferences) {
    // Placeholder for accommodation API integration
    // Could integrate with Booking.com, Hotels.com, Airbnb APIs
    return {
      location,
      accommodations: [
        {
          name: 'Downtown Hotel',
          type: 'hotel',
          priceRange: '$100-150/night',
          rating: 4.2,
          amenities: ['WiFi', 'Breakfast', 'Gym']
        },
        {
          name: 'Cozy Apartment',
          type: 'apartment',
          priceRange: '$80-120/night',
          rating: 4.5,
          amenities: ['Kitchen', 'WiFi', 'Parking']
        }
      ],
      source: 'demo_data'
    };
  }

  async generateTravelAdvice(data) {
    const { location, weather, events, accommodations, preferences } = data;

    let advice = `Here's your personalized travel advice for ${location}:\n\n`;

    // Weather-based advice
    if (weather && !weather.error) {
      advice += `🌤️ **Weather**: Currently ${weather.current.temperature}°C with ${weather.current.description}. `;
      if (weather.current.temperature < 10) {
        advice += `Pack warm clothes! `;
      } else if (weather.current.temperature > 25) {
        advice += `Great weather for outdoor activities! `;
      }
      advice += `\n\n`;
    }

    // Events advice
    if (events && events.events && events.events.length > 0) {
      advice += `🎭 **Recommended Events**:\n`;
      events.events.slice(0, 3).forEach(event => {
        advice += `• ${event.name} (${event.date}) - ${event.description}\n`;
      });
      advice += `\n`;
    }

    // Accommodation advice
    if (accommodations && accommodations.accommodations) {
      advice += `🏨 **Accommodation Suggestions**:\n`;
      accommodations.accommodations.forEach(acc => {
        advice += `• ${acc.name} (${acc.type}) - ${acc.priceRange}\n`;
      });
      advice += `\n`;
    }

    // Preference-based advice
    if (preferences && preferences.activities) {
      advice += `🎯 **Based on your interests**: `;
      if (preferences.activities.includes('hiking')) {
        advice += `Look for local trails and nature reserves. `;
      }
      if (preferences.activities.includes('museums')) {
        advice += `Check out local museums and cultural sites. `;
      }
      if (preferences.activities.includes('food')) {
        advice += `Don't miss the local cuisine and food markets. `;
      }
      advice += `\n`;
    }

    return advice;
  }

  async createStructuredItinerary(data) {
    const { location, weather, events, preferences } = data;
    const days = preferences.days || 3;

    const itinerary = {
      destination: location,
      duration: `${days} days`,
      weather_summary: weather && !weather.error ?
        `${weather.current.temperature}°C, ${weather.current.description}` :
        'Check local weather',
      days: []
    };

    // Generate day-by-day itinerary
    for (let day = 1; day <= days; day++) {
      const dayPlan = {
        day: day,
        title: `Day ${day} in ${location}`,
        activities: this.generateDayActivities(day, events, preferences, weather)
      };
      itinerary.days.push(dayPlan);
    }

    return itinerary;
  }

  generateDayActivities(day, events, preferences, weather) {
    const activities = [];

    // Morning activity
    if (day === 1) {
      activities.push({
        time: '9:00 AM',
        activity: 'Arrival and Check-in',
        description: 'Settle into accommodation and explore immediate area',
        duration: '2 hours'
      });
    } else {
      activities.push({
        time: '9:00 AM',
        activity: 'Morning Exploration',
        description: preferences && preferences.activities?.includes('hiking') ?
          'Nature walk or hiking trail' : 'Cultural site visit',
        duration: '3 hours'
      });
    }

    // Afternoon activity
    if (events && events.events && events.events.length > 0) {
      const dayEvent = events.events[day - 1];
      if (dayEvent) {
        activities.push({
          time: '2:00 PM',
          activity: dayEvent.name,
          description: dayEvent.description,
          duration: '2-3 hours',
          venue: dayEvent.venue
        });
      }
    } else {
      activities.push({
        time: '2:00 PM',
        activity: 'Local Highlights',
        description: 'Visit main attractions and local points of interest',
        duration: '3 hours'
      });
    }

    // Evening activity
    activities.push({
      time: '7:00 PM',
      activity: 'Dinner & Evening',
      description: preferences && preferences.activities?.includes('food') ?
        'Food tour or local restaurant experience' :
        'Dinner at recommended local restaurant',
      duration: '2-3 hours'
    });

    return activities;
  }
}