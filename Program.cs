using Azure.AI.OpenAI;
using Azure;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<DocumentService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddSingleton<AzureOpenAIClient>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var endpoint = new Uri(config["AzureOpenAI:Endpoint"]!);
    var apiKey = config["AzureOpenAI:ApiKey"]!;

    return new AzureOpenAIClient(endpoint, new AzureKeyCredential(apiKey));
});


var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
app.UseCors("AllowFrontend");
//app.UseHttpsRedirection();

//app.MapControllers();   // important — keep before minimal APIs


var summaries = new[]
{
    "Freezing","Bracing","Chilly","Cool","Mild","Warm","Balmy","Hot","Sweltering","Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1,5).Select(index =>
        new WeatherForecast(
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20,55),
            summaries[Random.Shared.Next(summaries.Length)]
        )).ToArray();

    return forecast;
});
// if(app.Environment.IsDevelopment())
// {
//     app.MapOpenApi();
// }


app.MapControllers();   // important — keep before minimal APIs
app.MapGet("/test", () => "API is working");
app.Run();

record WeatherForecast(DateOnly Date,int TemperatureC,string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}