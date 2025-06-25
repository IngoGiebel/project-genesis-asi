package shared

// Located at: netlify/functions/shared/gemini.go

import (
	_ "embed"
	"fmt"
)

/*────────────────── Model + URL ──────────────────────────────────────*/

// GeminiModel we are going call.
const GeminiModel = "gemini-2.5-flash"

// GeminiURL builds the full REST endpoint you POST to.
func GeminiURL(apiKey string) string {
	return fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		GeminiModel,
		apiKey,
	)
}

/*────────────────── System-level messages ──────────────────────────────*/

//go:embed master_prompt.txt
var MasterPrompt string

//go:embed site_context.txt
var SiteContext string
