namespace AIStudyAssistant.DTOs;

public class AskResponse
{
    public string Answer { get; set; } = string.Empty;
    public object Confidence { get; set; }
    public List<MatchedDocument> MatchedDocs { get; set; }
    
}

public class MatchedDocument
{
    public string Content { get; set; } = string.Empty;
    public double Score { get; set; }
}