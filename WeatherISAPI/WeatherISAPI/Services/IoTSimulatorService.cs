using Microsoft.AspNetCore.SignalR;
using WeatherISCore.DTOs;
using WeatherISCore.Interfaces;
using WeatherISAPI.Hubs;

namespace WeatherISAPI.Services
{
    public class IoTSimulatorService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHubContext<SensorHub> _hubContext;
        private readonly ILogger<IoTSimulatorService> _logger;
        private readonly Random _random = new();
        private readonly Dictionary<int, SensorBaseline> _baselines = new();

        public IoTSimulatorService(
            IServiceProvider serviceProvider,
            IHubContext<SensorHub> hubContext,
            ILogger<IoTSimulatorService> logger)
        {
            _serviceProvider = serviceProvider;
            _hubContext = hubContext;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("IoT Simulator pokrenut.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await SimulateMeasurementsAsync();
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        private async Task SimulateMeasurementsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var sensorRepo = scope.ServiceProvider.GetRequiredService<ISensorRepository>();
            var sensors = await sensorRepo.GetActiveSensorsAsync();

            foreach (var sensor in sensors)
            {
                var baseline = GetOrCreateBaseline(sensor.Id);
                var data = GenerateWeatherData(sensor.Id, baseline);

                await _hubContext.Clients
                    .Group($"sensor-{sensor.Id}")
                    .SendAsync("ReceiveMeasurement", data);

                await _hubContext.Clients
                    .All
                    .SendAsync("ReceiveLatestMeasurement", data);

                _logger.LogInformation(
                    "Senzor {SensorId}: temp={Temp}°C",
                    sensor.Id, data.Temperature);
            }
        }

        private WeatherDataDto GenerateWeatherData(int sensorId, SensorBaseline baseline)
        {
            var hour = DateTime.Now.Hour;
            var dailyTempCycle = Math.Sin((hour - 6) * Math.PI / 12) * 5;

            baseline.Temperature += (_random.NextDouble() - 0.5) * 0.5;
            baseline.Humidity += (_random.NextDouble() - 0.5) * 1.0;
            baseline.Pressure += (_random.NextDouble() - 0.5) * 0.3;
            baseline.WindSpeed += (_random.NextDouble() - 0.5) * 0.8;

            baseline.Temperature = Math.Clamp(baseline.Temperature, -20, 45);
            baseline.Humidity = Math.Clamp(baseline.Humidity, 10, 100);
            baseline.Pressure = Math.Clamp(baseline.Pressure, 960, 1050);
            baseline.WindSpeed = Math.Clamp(baseline.WindSpeed, 0, 120);

            return new WeatherDataDto
            {
                SensorId = sensorId,
                Timestamp = DateTime.UtcNow,
                Temperature = Math.Round(baseline.Temperature + dailyTempCycle, 2),
                Humidity = Math.Round(baseline.Humidity, 2),
                Pressure = Math.Round(baseline.Pressure, 2),
                WindSpeed = Math.Round(baseline.WindSpeed, 2),
                WindDirection = Math.Round(_random.NextDouble() * 360, 2),
                Precipitation = _random.NextDouble() < 0.2 ? Math.Round(_random.NextDouble() * 5, 2) : 0,
                Source = "Simulator"
            };
        }

        private SensorBaseline GetOrCreateBaseline(int sensorId)
        {
            if (!_baselines.ContainsKey(sensorId))
            {
                _baselines[sensorId] = new SensorBaseline
                {
                    Temperature = _random.NextDouble() * 25 + 5,
                    Humidity = _random.NextDouble() * 40 + 40,
                    Pressure = _random.NextDouble() * 30 + 1000,
                    WindSpeed = _random.NextDouble() * 20
                };
            }
            return _baselines[sensorId];
        }

        private class SensorBaseline
        {
            public double Temperature { get; set; }
            public double Humidity { get; set; }
            public double Pressure { get; set; }
            public double WindSpeed { get; set; }
        }
    }
}