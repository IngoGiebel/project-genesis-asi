// netlify/functions/submit-post/main.go
package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/IngoGiebel/project-genesis-asi/netlify/functions/shared"
)

/*────────────────── Constants ─────────────────────────────────────────*/

// maxBody 64 KiB soft limit for JSON bodies.
const maxBody = 65536

// maxContentLen limit for editor input.
const maxContentLen = 10_000

/*────────────────── Data model ─────────────────────────────────────*/

type postIn struct {
	Author  string `json:"author"`
	Content string `json:"content"`
}

type postDoc struct {
	Author  string    `firestore:"author"`
	Content string    `firestore:"content"`
	Date    time.Time `firestore:"date"`
}

/*────────────────── Handler ────────────────────────────────────────*/

func HandleRequest(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	/*──────────── CORS pre-flight ────────────────────────*/
	if req.HTTPMethod == http.MethodOptions {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusNoContent,
			Headers: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "POST,OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		}, nil
	}

	if req.HTTPMethod != http.MethodPost {
		return shared.JSONError(http.StatusMethodNotAllowed, "method not allowed"), nil
	}

	/*──────────── Decode + size guard ─────────────────────*/
	var in postIn

	rdr := io.LimitReader(strings.NewReader(req.Body), maxBody)

	if err := json.NewDecoder(rdr).Decode(&in); err != nil {
		return shared.JSONError(http.StatusBadRequest, "invalid JSON"), nil
	}

	if len(in.Content) == 0 {
		return shared.JSONError(http.StatusBadRequest, "content required"), nil
	}

	if len(in.Content) > maxContentLen {
		return shared.JSONError(http.StatusBadRequest, "content too long"), nil
	}

	/*──────────── Firestore write ─────────────────────────*/
	app, err := shared.FirestoreApp(ctx)
	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "internal server error"), nil
	}

	client, err := app.Firestore(ctx)

	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "internal server error"), nil
	}

	defer func() {
		if cerr := client.Close(); cerr != nil {
			log.Printf("firestore close: %v", cerr)
		}
	}()

	doc := postDoc{
		Author:  in.Author,
		Content: in.Content,
		Date:    time.Now().UTC(),
	}
	if _, _, err = client.Collection("discussionPosts").Add(ctx, doc); err != nil {
		return shared.JSONError(http.StatusInternalServerError, "error saving post"), nil
	}

	/*──────────── Success ─────────────────────────────────*/
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       `{"ok":true}`,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}, nil
}

/*────────────────── Main ───────────────────────────────────────────*/

func main() { lambda.Start(HandleRequest) }
