# Training Data Format

## How to Add Training Data

Training data is stored as JSON in `data.json`. Each entry is a prompt/response pair that teaches the AI how to respond.

### Format

```json
{
  "version": 1,
  "entries": [
    {
      "prompt": "Your question or input here",
      "response": "The response the AI should give",
      "added_by": "your_name",
      "timestamp": "2026-09-02T00:00:00Z"
    }
  ]
}
```

### Tips for Good Training Data

1. **Be specific**: Clear, focused prompt/response pairs work better than vague ones
2. **Be consistent**: If the AI should respond a certain way, include multiple examples of that style
3. **Add variety**: Include different phrasings of similar questions
4. **Keep responses reasonable length**: Very long responses are harder for the model to learn
5. **More data = better results**: Aim for at least 200+ entries for decent quality

### Adding Data via the Website

The easiest way to add training data is through the LocalMind website:

1. Click the **Train** tab
2. Log in with your GitHub token
3. Enter a prompt and the desired response
4. Click **Add Entry**
5. The data is automatically saved to this file in the repo

### Adding Data Manually

You can also edit `data.json` directly and commit to the repo. Just follow the format above.
