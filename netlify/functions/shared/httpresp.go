// Located at: netlify/functions/shared/httpresp.go
package shared

import (
	"github.com/aws/aws-lambda-go/events"
	"strconv"
)

// 64 KiB soft limit for JSON bodies – exported because both handlers use it.
const MaxBody = 64 << 10 // lint-friendly: named constant, no “magic number”

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
