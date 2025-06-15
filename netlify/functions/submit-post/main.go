// netlify/functions/submit-post/main.go
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"google.golang.org/api/iterator"

	"github.com/IngoGiebel/project-genesis-asi/netlify/functions/shared"
)

/*────────────────── Constants ─────────────────────────────────────────*/

const (
	// "prod" | "test"
	envServerMode = "SERVER_MODE"
	// git SHA or "v1.2.3"
	envServerVersion = "SERVER_VERSION"
	// Return at most 50 posts to the browser
	maxPosts = 50
)

/*────────────────── Data model ─────────────────────────────────────*/

type postIn struct {
	Author  string `json:"author"`
	Content string `json:"content"`
	// optional – may be zero-value
	Client struct {
		Tag    string `json:"tag"`
		Fid    string `json:"fid"`
		Locale string `json:"locale"`
	} `json:"client"`
}

type postDoc struct {
	Author  string    `firestore:"author"`
	Content string    `firestore:"content"`
	Date    time.Time `firestore:"date"`

	Server map[string]any `firestore:"server,omitempty"`
	Client map[string]any `firestore:"client,omitempty"`
}

/*────────────────── Handler ────────────────────────────────────────*/

func HandleRequest(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	/*──────────── CORS pre-flight ────────────────────────*/
	if req.HTTPMethod == http.MethodOptions {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusNoContent,
			Headers: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		}, nil
	}

	switch req.HTTPMethod {
	case http.MethodPost:
		return handleCreate(ctx, req)
	case http.MethodGet:
		return handleList(ctx, req)
	default:
		return shared.JSONError(http.StatusMethodNotAllowed, "method not allowed"), nil
	}
}

/*────────────────── POST  /submit-post ─────────────────────────────*/

func handleCreate(
	ctx context.Context,
	req events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
	var in postIn

	rdr := io.LimitReader(strings.NewReader(req.Body), shared.MaxBody)
	if err := json.NewDecoder(rdr).Decode(&in); err != nil {
		return shared.JSONError(http.StatusBadRequest, "invalid JSON"), nil
	}

	in.Content = strings.TrimSpace(in.Content)
	in.Author = strings.TrimSpace(in.Author)

	if len(in.Content) == 0 {
		return shared.JSONError(http.StatusBadRequest, "content required"), nil
	}

	if len(in.Content) > shared.MaxContentLen {
		return shared.JSONError(http.StatusBadRequest, "content too long"), nil
	}

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
		Server: map[string]any{
			"mode":    os.Getenv(envServerMode),
			"version": os.Getenv(envServerVersion),
		},
		Client: map[string]any{
			"tag":    in.Client.Tag,
			"fid":    in.Client.Fid,
			"locale": in.Client.Locale,
		},
	}
	if _, _, err = client.Collection("discussionPosts").Add(ctx, doc); err != nil {
		return shared.JSONError(http.StatusInternalServerError, "error saving post"), nil
	}

	ref, _, err := client.Collection("discussionPosts").Add(ctx, doc)
	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "error saving post"), nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       fmt.Sprintf(`{"ok":true,"id":"%s"}`, ref.ID),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}, nil
}

/*────────────────── GET  /submit-post ───────────────────────────────*/

func handleList(
	ctx context.Context,
	_ events.APIGatewayProxyRequest,
) (events.APIGatewayProxyResponse, error) {
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

	iter := client.
		Collection("discussionPosts").
		OrderBy("date", firestore.Desc).
		Limit(maxPosts).
		Documents(ctx)

	var out []postDoc

	for {
		doc, err := iter.Next()

		if errors.Is(err, iterator.Done) {
			break
		}

		if err != nil {
			return shared.JSONError(http.StatusInternalServerError, "firestore query"), nil
		}

		var p postDoc
		if err := doc.DataTo(&p); err == nil {
			out = append(out, p)
		}
	}

	// Reverse so that the newest post is last
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}

	raw, err := json.Marshal(out)
	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "json encode"), nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       string(raw),
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}, nil
}

/*────────────────── Main ───────────────────────────────────────────*/

func main() { lambda.Start(HandleRequest) }
