using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WeatherISCore.DTOs
{
    public class SubscribeRequest
    {
        public string Email { get; set; } = string.Empty;
        public int? SensorId { get; set; }
    }
}
