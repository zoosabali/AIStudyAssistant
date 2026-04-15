using System.Text.Json;
using AIStudyAssistant.Models; // adjust if your namespace is different

public class DocumentService
{
    private readonly string _filePath = "documents.json";

    public List<Document> GetAll()
    {
        if (!File.Exists(_filePath))
            return new List<Document>();

        var json = File.ReadAllText(_filePath);

        return JsonSerializer.Deserialize<List<Document>>(json)
               ?? new List<Document>();
    }

    //*********GENERATE VECTORS OF REQUESTS FROM STRING***********
    private static double CosineSimilarity(List<float> a, List<float> b)
    {
        double dot = 0, magA = 0, magB =0;

        for(int i = 0; i <a.Count; i++)
        {
            dot += a[i]*b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot/(Math.Sqrt(magA) * Math.Sqrt(magB) + 1e-10);

    }
    //************************************************************

    public void SaveAll(List<Document> documents)
    {
        var json = JsonSerializer.Serialize(documents, new JsonSerializerOptions
        {
            WriteIndented = true
        });

        File.WriteAllText(_filePath, json);
    }

    public void Add(Document doc)
    {
        var docs = GetAll();

        doc.Id = docs.Count > 0 ? docs.Max(d => d.Id) + 1 : 1;

        docs.Add(doc);

        SaveAll(docs);
    }

    public List<(Document doc, double score)> Search(List<float> queryEmbedding)
{
    var documents = GetAll();

    return documents
        .Select(d => new
        {
            Doc = d,
            Score = d.Embedding != null && d.Embedding.Any()
                ? CosineSimilarity(d.Embedding, queryEmbedding)
                : 0
        })
        .OrderByDescending(x => x.Score)
        .Take(5)
        .Select(x => (x.Doc, x.Score))
        .ToList();
}
}