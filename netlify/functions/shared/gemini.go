package shared

// Located at: netlify/functions/shared/gemini.go

import "fmt"

// GeminiModel we'll use from the Gemini API.
const GeminiModel = "gemini-2.5-flash"

// GeminiURL builds the full REST endpoint you POST to.
func GeminiURL(apiKey string) string {
	return fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		GeminiModel,
		apiKey,
	)
}
