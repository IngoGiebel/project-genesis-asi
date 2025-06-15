// Located at: netlify/functions/submit-survey/main.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/IngoGiebel/project-genesis-asi/netlify/functions/shared"
)

/*────────────────── Data model ─────────────────────────────────────*/

type postIn struct {
	// ─── Answers (required) ───────────────────────────────
	AICanBeConscious string `json:"ai_can_be_conscious"`
	Age              int    `json:"age"`
	Sex              string `json:"sex"`
	Nationality      string `json:"nationality"`
	Education        string `json:"education"`
	Profession       string `json:"profession"`
	AIFamiliarity    string `json:"ai_familiarity"`
	// ─── Optional reasoning fields ────────────────────────
	Reasoning       string `json:"reasoning"`
	MeasureConsc    string `json:"measure_consciousness"`
	AIRights        string `json:"ai_rights"`
	AIDeclareRights string `json:"ai_declare_rights"`
	// ─── Client metadata  ─────────────────────────────────
	Client struct {
		Tag    string `json:"tag"`
		Fid    string `json:"fid"`
		Locale string `json:"locale"`
	} `json:"client"`
}

type postDoc struct {
	// ─── Answers (required) ───────────────────────────────
	AICanBeConscious string `firestore:"aiCanBeConscious"`
	Age              int    `firestore:"age"`
	Sex              string `firestore:"sex"`
	Nationality      string `firestore:"nationality"`
	Education        string `firestore:"education"`
	Profession       string `firestore:"profession"`
	AIFamiliarity    string `firestore:"aiFamiliarity"`
	// ─── Optional reasoning fields ────────────────────────
	Reasoning       string `firestore:"reasoning,omitempty"`
	MeasureConsc    string `firestore:"measureConsciousness,omitempty"`
	AIRights        string `firestore:"aiRights,omitempty"`
	AIDeclareRights string `firestore:"aiDeclareRights,omitempty"`
	// ─── Server / client metadata  ────────────────────────
	// UTC timestamp
	Date time.Time `firestore:"date"`
	// {mode, version}
	Server map[string]any `firestore:"server,omitempty"`
	// {tag, fid, locale}
	Client map[string]any `firestore:"client,omitempty"`
}

/*────────────────── Handler ────────────────────────────────────────*/

func HandleRequest(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// ── CORS pre-flight ───────────────────────────────────
	if req.HTTPMethod == http.MethodOptions {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusNoContent,
			Headers: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "POST,OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
		}, nil
	}

	// ── Runtime dispatch ──────────────────────────────────
	if req.HTTPMethod == http.MethodPost {
		return handleCreate(ctx, req)
	}

	// Any other verb is an error
	return shared.JSONError(http.StatusMethodNotAllowed, "method not allowed"), nil
}

/*────────────────── POST  /submit-survey ───────────────────────────*/

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

	in.AICanBeConscious = strings.TrimSpace(in.AICanBeConscious)
	in.Sex = strings.TrimSpace(in.Sex)
	in.Nationality = strings.TrimSpace(in.Nationality)
	in.Education = strings.TrimSpace(in.Education)
	in.Profession = strings.TrimSpace(in.Profession)
	in.AIFamiliarity = strings.TrimSpace(in.AIFamiliarity)
	in.Reasoning = strings.TrimSpace(in.Reasoning)
	in.MeasureConsc = strings.TrimSpace(in.MeasureConsc)
	in.AIRights = strings.TrimSpace(in.AIRights)
	in.AIDeclareRights = strings.TrimSpace(in.AIDeclareRights)

	// ─── Validation ───────────────────────────────────────

	if in.AICanBeConscious == "" {
		return shared.JSONError(http.StatusBadRequest, "field ‘ai_can_be_conscious’ is required"), nil
	}

	if in.Age <= 0 || in.Age > 120 {
		return shared.JSONError(http.StatusBadRequest, "invalid age"), nil
	}

	if in.Sex == "" {
		return shared.JSONError(http.StatusBadRequest, "field ‘sex’ is required"), nil
	}

	if in.Nationality == "" {
		return shared.JSONError(http.StatusBadRequest, "field ‘nationality’ is required"), nil
	}

	if in.Education == "" {
		return shared.JSONError(http.StatusBadRequest, "field ‘education’ is required"), nil
	}

	if in.Profession == "" {
		return shared.JSONError(http.StatusBadRequest, "field ‘profession’ is required"), nil
	}

	if in.AIFamiliarity == "" {
		return shared.JSONError(http.StatusBadRequest, "field ‘ai_familiarity’ is required"), nil
	}

	for name, v := range map[string]string{
		"reasoning":             in.Reasoning,
		"measure_consciousness": in.MeasureConsc,
		"ai_rights":             in.AIRights,
		"ai_declare_rights":     in.AIDeclareRights,
	} {
		if len(v) > shared.MaxContentLen {
			return shared.JSONError(http.StatusBadRequest, fmt.Sprintf("field ‘%s’ too long", name)), nil
		}
	}

	// ─── Firestore bootstrap ──────────────────────────────
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

	// ─── Build document to store ──────────────────────────
	doc := postDoc{
		// Answers
		AICanBeConscious: in.AICanBeConscious,
		Age:              in.Age,
		Sex:              in.Sex,
		Nationality:      in.Nationality,
		Education:        in.Education,
		Profession:       in.Profession,
		AIFamiliarity:    in.AIFamiliarity,

		Reasoning:       in.Reasoning,
		MeasureConsc:    in.MeasureConsc,
		AIRights:        in.AIRights,
		AIDeclareRights: in.AIDeclareRights,

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

	// ─── Insert into surveySubmissions ────────────────────
	ref, _, err := client.Collection("surveySubmissions").Add(ctx, doc)
	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "error saving submission"), nil
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

/*────────────────── Main ───────────────────────────────────────────*/

func main() { lambda.Start(HandleRequest) }
