// Located at: netlify/functions/submit-post/main.go
package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	// Import the Firebase Admin SDK for Go
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"

	// Import AWS Lambda types for Netlify compatibility
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

// PostData defines the structure of the JSON we expect from the frontend.
// The `json:"..."` tags tell the JSON decoder how to map the incoming JSON keys to the struct fields.
type PostData struct {
	Author      string    `json:"author"`
	Content     string    `json:"content"`
	SubmittedAt time.Time `json:"submittedAt,omitempty"`
}

// Global variable to hold the initialized Firebase app instance.
// This is done to avoid re-initializing the app on every function invocation (hot start).
var firebaseApp *firebase.App

// The init() function runs only once when the function instance starts up (cold start).
// It's the perfect place to initialize the Firebase Admin SDK.
func init() {
  // Get the Firebase service account credentials from the Netlify environment variable.
  // This is the secure way to handle credentials.
  serviceAccountJSON := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
  if serviceAccountJSON == "" {
    log.Fatal("FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set.")
  }

  sa := option.WithCredentialsJSON([]byte(serviceAccountJSON))

  app, err := firebase.NewApp(context.Background(), nil, sa)
  if err != nil {
    log.Fatalf("error initializing Firebase app: %v\n", err)
  }
  firebaseApp = app
}

// HandleRequest is the main handler function for the Netlify serverless function.
// It conforms to the AWS Lambda Go function signature.
func HandleRequest
  (
    ctx context.Context,
    request events.APIGatewayProxyRequest
  )
  (
    events.APIGatewayProxyResponse,
    error
  ) {

	// Only allow POST requests
	if request.HTTPMethod != "POST" {
		return events.APIGatewayProxyResponse{StatusCode: 405, Body: "Method Not Allowed"}, nil
	}

	var data PostData
	err := json.Unmarshal([]byte(request.Body), &data)

	// Basic validation: check for JSON parsing errors and ensure author/content are not empty.
	if err != nil || data.Author == "" || data.Content == "" {
		log.Printf("Bad request: Invalid data received. Error: %v", err)
		// Return a helpful JSON error message
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Body:       `{"error":"Bad Request: Author and post content cannot be empty."}`,
			Headers:    map[string]string{"Content-Type": "application/json"},
		}, nil
	}

	// Add a server-side timestamp for when the post was received.
	data.SubmittedAt = time.Now()

	// Get a Firestore client from our initialized app.
	client, err := firebaseApp.Firestore(ctx)
	if err != nil {
		log.Printf("Error getting Firestore client: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: "{\"error\":\"Internal Server Error\"}"}, nil
	}
	defer client.Close()

	// Add the post data as a new document to the "discussionPosts" collection.
	// Firestore will automatically generate a unique ID for the document.
	_, _, err = client.Collection("discussionPosts").Add(ctx, data)
	if err != nil {
		log.Printf("Error adding document to Firestore: %v", err)
		return events.APIGatewayProxyResponse{StatusCode: 500, Body: "{\"error\":\"Error saving post\"}"}, nil
	}

	// Return a successful response.
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       `{"message": "Post submitted successfully!"}`,
		Headers:    map[string]string{"Content-Type": "application/json"},
	}, nil
}

// The main() function is the entry point for the Lambda function.
func main() {
	lambda.Start(HandleRequest)
}
