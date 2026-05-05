using Microsoft.EntityFrameworkCore;
using WeatherISAPI.Hubs;
using WeatherISAPI.Services;
using WeatherISCore.Interfaces;
using WeatherISDB;
using WeatherISDB.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Repozitoriji
builder.Services.AddScoped<ISensorRepository, SensorRepository>();
builder.Services.AddScoped<IMeasurementRepository, MeasurementRepository>();
builder.Services.AddScoped<IPredictionRepository, PredictionRepository>();
builder.Services.AddScoped<IAlertRepository, AlertRepository>();

// CORS za React
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
builder.Services.AddSignalR();
builder.Services.AddHostedService<IoTSimulatorService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("ReactPolicy");
app.UseAuthorization();
app.MapControllers();
app.MapHub<SensorHub>("/hubs/sensor");

app.Run();