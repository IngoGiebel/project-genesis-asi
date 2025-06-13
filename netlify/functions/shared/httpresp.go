package shared

// Located at: netlify/functions/shared/httpresp.go

import (
	"github.com/aws/aws-lambda-go/events"
	"strconv"
)

// MaxBody 64 KB soft limit for JSON bodies.
const MaxBody = 65536

// JSONError builds a CORS-enabled JSON error response.
func JSONError(code int, msg string) events.APIGatewayProxyResponse {
	return events.APIGatewayProxyResponse{
		StatusCode: code,
		Body:       `{"error":` + strconv.Quote(msg) + `}`,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	}
}
