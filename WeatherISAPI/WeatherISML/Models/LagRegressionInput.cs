using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WeatherISML.Models
{
    public class LagRegressionInput
    {
        public float Temperature { get; set; }
        public float Lag1 { get; set; }
        public float Lag6 { get; set; }
        public float Lag12 { get; set; }
        public float Lag24 { get; set; }
        public float Hour { get; set; }
        public float DayOfYear { get; set; }
        public float Humidity { get; set; }
        public float Pressure { get; set; }
        public float WindSpeed { get; set; }
    }
}
