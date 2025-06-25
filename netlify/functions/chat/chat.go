// Located at: netlify/functions/chat/chat.go
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/IngoGiebel/project-genesis-asi/netlify/functions/shared"
)

/*────────────────── Data structures for Gemini API ────────────────────*/

// GeminiMessage matches the structure required by the Gemini API for chat history.
type GeminiMessage struct {
	Role  string       `json:"role"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

// ChatRequest is the structure we expect to receive from our frontend.
type ChatRequest struct {
	History []GeminiMessage `json:"history"`
}

// GeminiRequest is the structure we send to the Gemini API.
type GeminiRequest struct {
	Contents []GeminiMessage `json:"contents"`
}

// GeminiResponse defines the structure of the response from the Gemini API.
// We only need to unmarshal the parts relevant to us.
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []GeminiPart `json:"parts"`
			Role  string       `json:"role"`
		} `json:"content"`
	} `json:"candidates"`
}

/*────────────────── Handler ────────────────────────────────────────*/

func HandleRequest(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Only allow POST requests for this function
	if req.HTTPMethod != http.MethodPost {
		return shared.JSONError(http.StatusMethodNotAllowed, "method not allowed"), nil
	}

	// Get the Gemini API Key from Netlify environment variables.
	geminiAPIKey := os.Getenv("GEMINI_API_KEY")
	if geminiAPIKey == "" {
		shared.Logger.Error("GEMINI_API_KEY environment variable not set.")

		return shared.JSONError(http.StatusInternalServerError, "server configuration error"), nil
	}

	// Decode the incoming request body from the frontend
	var chatReq ChatRequest
	if err := json.Unmarshal([]byte(req.Body), &chatReq); err != nil {
		shared.Logger.Error("Bad request - could not unmarshal JSON", slog.Any("error", err))

		return shared.JSONError(http.StatusBadRequest, "invalid request body"), nil
	}

	// Prepare the request for the Gemini API
	geminiReqBody := GeminiRequest{Contents: chatReq.History}
	reqBytes, err := json.Marshal(geminiReqBody)

	if err != nil {
		shared.Logger.Error("Could not marshal Gemini request", slog.Any("error", err))

		return shared.JSONError(http.StatusInternalServerError, "internal server error"), nil
	}

	// Construct the Gemini API request
	geminiURL := shared.GeminiURL(geminiAPIKey)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, geminiURL, bytes.NewBuffer(reqBytes))

	if err != nil {
		shared.Logger.Error("Could not create Gemini HTTP request", slog.Any("error", err))

		return shared.JSONError(http.StatusInternalServerError, "Internal server error"), nil
	}

	httpReq.Header.Set("Content-Type", "application/json")

	// Make the API call to Gemini
	client := &http.Client{}
	httpResp, err := client.Do(httpReq)

	if err != nil {
		shared.Logger.Error("Failed to call Gemini API", slog.Any("error", err))

		return shared.JSONError(http.StatusServiceUnavailable, "AI service currently unavailable"), nil
	}

	// Defer closing the response body and handle any potential error
	defer func() {
		err := httpResp.Body.Close()
		if err != nil {
			shared.Logger.Error("Failed to close response body", slog.Any("error", err))
		}
	}()

	// Read the response from Gemini
	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		shared.Logger.Error("Could not read Gemini response body", slog.Any("error", err))

		return shared.JSONError(http.StatusInternalServerError, "Error processing AI response"), nil
	}

	// Check if the API call was successful
	if httpResp.StatusCode != http.StatusOK {
		shared.Logger.Error("Gemini API returned non-OK status",
			slog.Int("status_code", httpResp.StatusCode),
			slog.String("response_body", string(respBody)),
		)

		return shared.JSONError(http.StatusInternalServerError, "AI service returned an error"), nil
	}

	// Unmarshal the Gemini response to get the content
	var geminiResp GeminiResponse
	if err := json.Unmarshal(respBody, &geminiResp); err != nil {
		shared.Logger.Error("Could not unmarshal Gemini response",
			slog.Any("error", err),
			slog.String("response_body", string(respBody)),
		)

		return shared.JSONError(http.StatusInternalServerError, "error processing AI response format"), nil
	}

	// Extract the text from the first candidate
	var aiTextResponse string
	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		aiTextResponse = geminiResp.Candidates[0].Content.Parts[0].Text
	} else {
		shared.Logger.Warn("Gemini response had no candidates or content parts",
			slog.String("response_body", string(respBody)),
		)

		aiTextResponse = "I'm sorry, I could not generate a response."
	}

	// Send the successful response back to the frontend
	return shared.JSONSuccess(map[string]string{"response": aiTextResponse})
}

/*────────────────── Main ───────────────────────────────────────────*/

func main() { lambda.Start(HandleRequest) }
