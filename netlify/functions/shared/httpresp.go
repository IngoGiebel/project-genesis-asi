package shared

// Located at: netlify/functions/shared/httpresp.go

import (
	"strconv"

	"github.com/aws/aws-lambda-go/events"
)

// MaxBody 64 KiB soft limit for JSON bodies.
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
