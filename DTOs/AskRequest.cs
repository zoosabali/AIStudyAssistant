namespace AIStudyAssistant.DTOs;

public class AskRequest
{
    public string Question { get; set; } = string.Empty;
    public AskMode Mode {get; set;} = AskMode.Normal;
    public string? UserAttempt {get; set;}
    public Stage StageType {get; set;} = Stage.Final;
}