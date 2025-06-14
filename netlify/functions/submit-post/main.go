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
			StatusCode: 204,
			Headers: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "POST,OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		}, nil
	}

	if req.HTTPMethod != http.MethodPost {
		return shared.JSONError(405, "method not allowed"), nil
	}

	/*──────────── Decode + size guard ─────────────────────*/
	var in postIn
	rdr := io.LimitReader(strings.NewReader(req.Body), shared.MaxBody)

	if err := json.NewDecoder(rdr).Decode(&in); err != nil {
		return shared.JSONError(400, "invalid JSON"), nil
	}

	if len(in.Content) == 0 {
		return shared.JSONError(400, "content required"), nil
	}
	if len(in.Content) > 10_000 {
		return shared.JSONError(400, "content too long"), nil
	}

	/*──────────── Firestore write ─────────────────────────*/
	app, err := shared.FirestoreApp(ctx)
	if err != nil {
		return shared.JSONError(500, "internal server error"), nil
	}
	client, err := app.Firestore(ctx)
	if err != nil {
		return shared.JSONError(500, "internal server error"), nil
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
		return shared.JSONError(500, "error saving post"), nil
	}

	/*──────────── Success ─────────────────────────────────*/
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       `{"ok":true}`,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}, nil
}

/*────────────────── Main ───────────────────────────────────────────*/

func main() { lambda.Start(HandleRequest) }
