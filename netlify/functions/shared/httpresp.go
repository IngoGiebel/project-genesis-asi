package shared

// Located at: netlify/functions/shared/httpresp.go

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/aws/aws-lambda-go/events"
)

// JSONError builds a CORS-enabled `{ "error": "…" }` body.
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

// JSONSuccess marshals any Go value to JSON and returns 200.
func JSONSuccess(payload any) (events.APIGatewayProxyResponse, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		// log and fall back to 500
		Logger.Error("json encode", "err", err)
		return JSONError(http.StatusInternalServerError, "failed to encode response"), nil
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
