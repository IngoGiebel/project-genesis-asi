// netlify/functions/submit-post/main.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	firebase "firebase.google.com/go/v4"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"google.golang.org/api/option"
)

/*────────────────── Constants & helpers ────────────────────────────*/

// 64 KiB soft limit for incoming JSON
const maxBody = 64 << 10

func jsonResp(code int, body string) events.APIGatewayProxyResponse {
	return events.APIGatewayProxyResponse{
		StatusCode: code,
		Body:       `{"error":` + strconv.Quote(body) + `}`,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}
}

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

/*────────────────── Firebase bootstrap ─────────────────────────────*/

// Lazy-initialised global; protected with sync.Once
var (
	appOnce     sync.Once
	firebaseApp *firebase.App
	appErr      error
)

// newFirestore returns a Firestore client, initializing the Firebase app
// exactly once (cold start). Callers must Close() the client.
func newFirestore(ctx context.Context) (*firebase.App, error) {
	appOnce.Do(func() {
		creds := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
		if creds == "" {
			appErr = logError("FIREBASE_SERVICE_ACCOUNT_JSON env var not set")

			return
		}
		firebaseApp, appErr = firebase.NewApp(
			ctx,
			nil,
			option.WithCredentialsJSON([]byte(creds)),
		)
	})

	return firebaseApp, appErr
}

func logError(msg string, args ...any) error {
	log.Printf(msg, args...)

	return fmt.Errorf(msg, args...)
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
		return jsonResp(405, "method not allowed"), nil
	}

	/*──────────── Decode + size guard ─────────────────────*/
	var in postIn
	rdr := io.LimitReader(strings.NewReader(req.Body), maxBody)
	if err := json.NewDecoder(rdr).Decode(&in); err != nil {
		return jsonResp(400, "invalid JSON"), nil
	}

	if len(in.Content) == 0 {
		return jsonResp(400, "content required"), nil
	}
	if len(in.Content) > 10_000 {
		return jsonResp(400, "content too long"), nil
	}

	/*──────────── Firestore write ─────────────────────────*/
	app, err := newFirestore(ctx)
	if err != nil {
		return jsonResp(500, "internal server error"), nil
	}
	client, err := app.Firestore(ctx)
	if err != nil {
		return jsonResp(500, "internal server error"), nil
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
		return jsonResp(500, "error saving post"), nil
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
