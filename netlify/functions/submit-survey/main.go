// Located at: netlify/functions/submit-survey/main.go
package main

import (
  "context"
  "encoding/json"
  "log"
  "os"
  "time"

  firebase "firebase.google.com/go/v4"
  "google.golang.org/api/option"

  "github.com/aws/aws-lambda-go/events"
  "github.com/aws/aws-lambda-go/lambda"
)

type SurveyData struct {
  // Define fields matching your form, e.g.:
  AiCanBeConscious string `json:"ai_can_be_conscious"`
  Age              int    `json:"age"`
  // TODO... other fields
  SubmittedAt time.Time   `json:"submittedAt,omitempty"`
}

var firebaseApp *firebase.App

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

func HandleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    if request.HTTPMethod != "POST" {
        return events.APIGatewayProxyResponse{StatusCode: 405, Body: "Method Not Allowed"}, nil
    }

    var data SurveyData
    err := json.Unmarshal([]byte(request.Body), &data)
    if err != nil {
        log.Printf("Error unmarshalling request: %v", err)
        return events.APIGatewayProxyResponse{StatusCode: 400, Body: "Bad Request"}, nil
    }

    data.SubmittedAt = time.Now()

    client, err := firebaseApp.Firestore(ctx)
    if err != nil {
        log.Printf("Error getting Firestore client: %v", err)
        return events.APIGatewayProxyResponse{StatusCode: 500, Body: "Internal Server Error"}, nil
    }
    defer client.Close()

    _, _, err = client.Collection("surveySubmissions").Add(ctx, data)
    if err != nil {
        log.Printf("Error adding document to Firestore: %v", err)
        return events.APIGatewayProxyResponse{StatusCode: 500, Body: "Error saving submission"}, nil
    }

    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Body:       "{\"message\": \"Submission successful! (Go)\"}",
        Headers:    map[string]string{"Content-Type": "application/json"},
    }, nil
}

func main() {
  lambda.Start(HandleRequest)
}
