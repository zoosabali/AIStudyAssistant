using Microsoft.AspNetCore.Mvc;
using AIStudyAssistant.Models;
using AIStudyAssistant.DTOs;
using Azure;
using Azure.AI.OpenAI;
using OpenAI.Chat;
using System.Linq;
using System.Runtime.Intrinsics.X86;
using Azure.AI.FormRecognizer.DocumentAnalysis;

namespace AIStudyAssistant.Controllers;

[ApiController]
[Route("documents")]
public class DocumentController : ControllerBase
{
    private readonly AzureOpenAIClient _client;
    private readonly IConfiguration _config;

    private readonly DocumentService _documentService;

    public DocumentController(
        AzureOpenAIClient client, 
        IConfiguration config,
        DocumentService documentService)
    {
        _client = client;
        _config = config;
        _documentService = documentService;
    }
    string GetConfidenceLabel(double score)
            {
                if (score >= 0.6) return "High";
                if (score >= 0.3) return "Medium";
                return "Low";
            }

    string ExtractTitle(string content)
    {
        if (content.Contains("BFS")) return "BFS";
        if (content.Contains("DFS")) return "DFS";
        return "Note";
    }
    //private static List<Document> documents = new List<Document>();
    //private static List<Document> documents = LoadDocuments();

    private bool IsHeading(string text)
{
    return text.Length < 40 &&
           text.ToUpper() == text &&   // ALL CAPS
           text.Split(' ').Length <= 4;
}


private async Task<string> ExtractTextFromFile(IFormFile file)
{
    var endpoint = _config["DocumentIntelligence:Endpoint"];
    var key = _config["DocumentIntelligence:ApiKey"];

    var client = new DocumentAnalysisClient(
        new Uri(endpoint),
        new AzureKeyCredential(key));

    using var stream = file.OpenReadStream();

    var operation = await client.AnalyzeDocumentAsync(
        WaitUntil.Completed,
        "prebuilt-read",
        stream);

    var result = operation.Value;

    var lines = new List<string>();

    foreach (var page in result.Pages)
    {
        foreach (var line in page.Lines)
        {
            lines.Add(line.Content);
        }
    }

    return string.Join("\n", lines);
}

    // ✅ Create document
    [HttpPost]
    public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        var document = new Document
        {
            Title = request.Title,
            Content = request.Content
        };
        
        var deployment = _config["AzureOpenAI:EmbeddingDeployment"];
        var embeddingClient = _client.GetEmbeddingClient(deployment);
        var embeddingResponse = await embeddingClient.GenerateEmbeddingAsync(document.Content);
        document.Embedding = embeddingResponse.Value.ToFloats().ToArray().ToList();
        //documents.Add(document);
        //SaveDocuments(documents);
        _documentService.Add(document);
        return Ok(document);
    }

    // ✅ Mass/Create document
    [HttpPost("bulk")]
    public async Task<IActionResult> AddDocuments([FromBody] List<CreateDocumentRequest> requests)
    {
        var deployment = _config["AzureOpenAI:EmbeddingDeployment"];
        var embeddingClient = _client.GetEmbeddingClient(deployment);

        foreach (var req in requests)
        {
            var doc = new Document
            {
                Title = req.Title,
                Content = req.Content
            };

        var embeddingResponse = await embeddingClient.GenerateEmbeddingAsync(doc.Content);
        doc.Embedding = embeddingResponse.Value.ToFloats().ToArray().ToList();

        _documentService.Add(doc);
    }

    return Ok("Bulk upload successful");
}

[HttpPost("upload")]
public async Task<IActionResult> UploadFile(IFormFile file)
{
    if (file == null || file.Length == 0)
        return BadRequest("No file uploaded");

    // 1. Extract text
    var extractedText = await ExtractTextFromFile(file);

    // 2. Split into paragraphs / blocks
    var paragraphs = extractedText
        .Split(new[] { "\n\n", "\r\n\r\n" }, StringSplitOptions.RemoveEmptyEntries)
        .Select(p => p.Trim())
        .Where(p => !string.IsNullOrWhiteSpace(p))
        .ToList();

    // fallback if no paragraph breaks preserved
    if (!paragraphs.Any())
    {
        paragraphs = extractedText
            .Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();
    }

    // 3. Build chunks safely
    var chunks = new List<string>();
    string currentChunk = "";

    foreach (var para in paragraphs)
    {
        var candidate = string.IsNullOrWhiteSpace(currentChunk)
            ? para
            : currentChunk + "\n\n" + para;

        if (candidate.Length <= 800)
        {
            currentChunk = candidate;
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(currentChunk))
                chunks.Add(currentChunk);

            currentChunk = para;
        }
    }

    if (!string.IsNullOrWhiteSpace(currentChunk))
        chunks.Add(currentChunk);

    // 4. Convert to docs
    var docs = chunks.Select(chunk =>
    {
        var firstLine = chunk
            .Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault();

        return new CreateDocumentRequest
        {
            Title = firstLine ?? "Untitled",
            Content = chunk
        };
    }).ToList();

    // 5. Save
    await AddDocuments(docs);

    return Ok("File processed and stored");
}

    // ✅ Get all documents
    [HttpGet]
    public IActionResult GetDocuments()
    {
        return Ok(_documentService.GetAll());
    }

    

    // ✅ Ask question (AI-powered)
    [HttpPost("ask")]
    public async Task<IActionResult> AskQuestion([FromBody] AskRequest request)
    {
        var deploymentName = _config["AzureOpenAI:DeploymentName"];

        var embeddingDeployment = _config["AzureOpenAI:EmbeddingDeployment"];
        var embeddingClient = _client.GetEmbeddingClient(embeddingDeployment);

        var questionEmbeddingResponse = await embeddingClient.GenerateEmbeddingAsync(request.Question);
        var questionEmbedding = questionEmbeddingResponse.Value.ToFloats().ToArray().ToList();

        // var documents = _documentService.GetAll();

        // //var scoredDocs = documents

        // var scoredDocs = documents
        //     .Select(d => new
        //     {
        //         Doc = d,
        //         Score = d.Embedding != null && d.Embedding.Any()
        //         ? CosineSimilarity(d.Embedding, questionEmbedding)
        //         : 0
        //         //Score = CosineSimilarity(d.Embedding, questionEmbedding)
        //     })
        //     .OrderByDescending(x => x.Score)
        //     .ToList();

        var results = _documentService.Search(questionEmbedding);

            // Step 1: take more initially
        var topCandidates = results
        .Select(r => new
        {
            Doc = r.doc,
            score = r.score
        })
        .ToList();

            // Step 2: remove duplicates by Title (better than Content)
        var uniqueDocs = topCandidates
            .GroupBy(x => x.Doc.Title)
            .Select(g => g.First())
            .ToList();

            // Step 3: apply threshold
        var filteredDocs = uniqueDocs
            .Where(x => x.score > 0.20)
            .ToList();

            // Step 4: fallback if too strict
        if (!filteredDocs.Any())
            {
                filteredDocs = uniqueDocs.Take(2).ToList();
            }

            // Step 5: final selection
        var finalDocs = filteredDocs.Take(3).ToList();

        var bestScore = finalDocs.Any() ? 
        finalDocs.Max(x => x.score) : 0;

        var matchedDocs = finalDocs.Select(x => new MatchedDocument
            {
            Content = x.Doc.Content,
            Score = x.score
            }).ToList();

            Console.WriteLine("FINAL DOCS:");
            foreach (var doc in finalDocs)
            {
                Console.WriteLine($"{doc.score} → {doc.Doc.Title}");
            }
            
        if (bestScore < 0.25 && finalDocs.Count < 2)
            {
                return Ok(new AskResponse
                {
                    Answer = "No relevant notes found. Try adding more details.",
                    Confidence = new {score = 0, label = "Low"}
                });
            }

            // 👇 Print scores (for learning)
            foreach (var item in results)
            {
                Console.WriteLine($"Score: {item.score} | Content: {item.doc.Content}");
            }

            var topDocs = finalDocs.Select(x => x.Doc).ToList();

            var context = string.Join("\n\n###\n\n", 
                topDocs.Select(d => $"Title: {d.Title}\nContent: {d.Content}")
                );

        var prompt = $"""
        You are a helpful study assistant.

        Use ONLY the provided notes to answer the question.

        Notes:
        {context}

        Question:
        {request.Question}
        """;

        var chatClient = _client.GetChatClient(deploymentName);

        var response = await chatClient.CompleteChatAsync(
            new List<ChatMessage>
            {
                new SystemChatMessage
                (
                "You are a study assistant. Answer ONLY using the provided context.\n\n" +
                "Rules:\n" +
                "- Do NOT use external knowledge\n" +
                "- If something is not explicitly present in the context, DO NOT include it." +
                "- If answer is not found, say: 'I could not find this in your notes.'\n\n" +

                "Formatting Rules:\n" +
                "- Always structure answers clearly\n" +
                "- Use bullet points when possible\n" +
                "- For comparisons, use sections like:\n" +
                "  BFS:\n" +
                "  DFS:\n" +
                "- Keep answers concise but informative\n" +
                "- Do NOT repeat the question\n"
                ),
                new UserChatMessage(prompt)
            
            });

    var sources = matchedDocs
    .GroupBy(d => ExtractTitle(d.Content))
    .Select(g => g.First())
    .Select(d => new
    {
        title = ExtractTitle(d.Content),
        score = d.Score,
        preview = d.Content.Length > 120
            ? d.Content.Substring(0, 120) + "..."
            : d.Content
    })
    .ToList();

        var explanation = $"This answer is based on the top {matchedDocs.Count} most relevant notes.";

        var answerText = string.Join("\n",
            response.Value.Content.Select(c => c.Text));

        var cleanedAnswer = answerText.Replace("\\n", "\n");

        return Ok(new
        {
            answer = cleanedAnswer,
            confidence = new
            {
                score = bestScore,
                label = GetConfidenceLabel(bestScore)
            },
            sources,
            explanation
        });


        // var answer = response.Value.Content[0].Text;

        // matchedDocs = scoredDocs.Select(x => new MatchedDocument
        // {       
        //     Content = x.Doc.Content,
        //     Score = x.Score
        // }).ToList();

        // return Ok(new
        // {
        //     answer = cleanedAnswer,
        //     confidence = bestScore,
        //     matchedDocs
        // });
    }
}