package shared

// Located at: netlify/functions/shared/config.go

const (
	// EnvServerMode is the environment variable for the server mode ("prod" | "test | dev").
	EnvServerMode = "SERVER_MODE"
	// GeminiModel we'll use from the Gemini API.
	GeminiModel = "gemini-2.5-flash"
	// EnvGeminiAPIKey is the environment variable for the Gemini API key.
	EnvGeminiAPIKey = "GEMINI_API_KEY"
)
