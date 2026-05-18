using Microsoft.AspNetCore.SignalR;

namespace WeatherISAPI.Hubs
{
    public class WeatherHub : Hub
    {
        public async Task JoinWeatherFeed()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "weather-feed");
        }

        public async Task LeaveWeatherFeed()
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "weather-feed");
        }
    }
}