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

/*────────────────── Data model ─────────────────────────────────────*/

type postIn struct {
	// ─── Author + post (required) ─────────────────────────
	Author  string `json:"author"`
	Content string `json:"content"`

	// ─── Client metadata  ─────────────────────────────────
	Client struct {
		Tag    string `json:"tag"`
		Fid    string `json:"fid"`
		Locale string `json:"locale"`
	} `json:"client"`
}

//nolint:tagalign
type postDoc struct {
	// ─── Author + post (required) ─────────────────────────
	Author  string         `firestore:"author"           json:"author"`
	Content string         `firestore:"content"          json:"content"`
	// ─── Server / client metadata  ────────────────────────
	// UTC timestamp
	Date    time.Time      `firestore:"date"             json:"date"`
	// {mode, version}
	Server  map[string]any `firestore:"server,omitempty" json:"server,omitempty"`
	// {tag, fid, locale}
	Client  map[string]any `firestore:"client,omitempty" json:"client,omitempty"`
}

/*────────────────── Handler ────────────────────────────────────────*/

func HandleRequest(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// ── CORS pre-flight ───────────────────────────────────
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

	// ── Runtime dispatch ──────────────────────────────────
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
	// ─── Decode & trim text fields ────────────────────────
	var in postIn

	rdr := io.LimitReader(strings.NewReader(req.Body), shared.MaxBody)
	if err := json.NewDecoder(rdr).Decode(&in); err != nil {
		return shared.JSONError(http.StatusBadRequest, "invalid JSON"), nil
	}

	in.Content = strings.TrimSpace(in.Content)
	in.Author = strings.TrimSpace(in.Author)

	// ─── Validation ───────────────────────────────────────
	if len(in.Content) == 0 {
		return shared.JSONError(http.StatusBadRequest, "content required"), nil
	}

	if len(in.Content) > shared.MaxContentLen {
		return shared.JSONError(http.StatusBadRequest, "content too long"), nil
	}

	// ─── Firestore bootstrap ──────────────────────────────
	client, cleanup, err := shared.FirestoreClient(ctx)
	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "internal server error"), nil
	}
	defer cleanup()

	// ─── Build document to store ──────────────────────────
	doc := postDoc{
		// Author & content
		Author:  in.Author,
		Content: in.Content,

		// Metadata
		Date: time.Now().UTC(),
		Server: map[string]any{
			"mode":    os.Getenv(shared.EnvServerMode),
			"version": os.Getenv(shared.EnvServerVersion),
		},
		Client: map[string]any{
			"tag":    in.Client.Tag,
			"fid":    in.Client.Fid,
			"locale": in.Client.Locale,
		},
	}
	// ─── Insert into discussionPosts ──────────────────────
	ref, _, err := client.Collection("discussionPosts").Add(ctx, doc)
	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "error saving post"), nil
	}

	// ─── Return success with new document ID ──────────────
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
		Limit(shared.MaxPosts).
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
