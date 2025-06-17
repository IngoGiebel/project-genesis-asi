// Located at: netlify/functions/submit-survey/main.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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
	AICanBeConscious     string `json:"ai_can_be_conscious"`
	Age                  int    `json:"age"`
	Sex                  string `json:"sex"`
	Nationality          string `json:"nationality"`
	Education            string `json:"education"`
	Profession           string `json:"profession"`
	AIFamiliarity        string `json:"ai_familiarity"`
	// ─── Optional reasoning fields ────────────────────────
	Reasoning            string `json:"reasoning"`
	MeasureConsciousness string `json:"measure_consciousness"`
	AIRights             string `json:"ai_rights"`
	AIDeclareRights      string `json:"ai_declare_rights"`
	// ─── Client metadata  ─────────────────────────────────
	Client struct {
		Tag                string `json:"tag"`
		Fid                string `json:"fid"`
		Locale             string `json:"locale"`
	} `json:"client"`
}

//nolint:tagalign, lll
type postDoc struct {
	// ─── Answers (required) ───────────────────────────────
	AICanBeConscious     string          `firestore:"aiCanBeConscious"               json:"ai_can_be_conscious"`
	Age                  int             `firestore:"age"                            json:"age"`
	Sex                  string          `firestore:"sex"                            json:"sex"`
	Nationality          string          `firestore:"nationality"                    json:"nationality"`
	Education            string          `firestore:"education"                      json:"education"`
	Profession           string          `firestore:"profession"                     json:"profession"`
	AIFamiliarity        string          `firestore:"aiFamiliarity"                  json:"ai_familiarity"`
	// ─── Optional reasoning fields ────────────────────────
	Reasoning            string          `firestore:"reasoning,omitempty"            json:"reasoning,omitempty"`
	MeasureConsciousness string          `firestore:"measureConsciousness,omitempty" json:"measure_consciousness,omitempty"`
	AIRights             string          `firestore:"aiRights,omitempty"             json:"ai_rights,omitempty"`
	AIDeclareRights      string          `firestore:"aiDeclareRights,omitempty"      json:"ai_declare_rights,omitempty"`
	// ─── Server / client metadata  ────────────────────────
	// UTC timestamp
	Date                 time.Time       `firestore:"date,omitempty"                 json:"date,omitempty"`
	// {mode, version}
	Server               map[string]any `firestore:"server,omitempty"               json:"server,omitempty"`
	// {tag, fid, locale}
	Client               map[string]any `firestore:"client,omitempty"               json:"client,omitempty"`
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

	trimFields(
		&in.AICanBeConscious,
		&in.Sex,
		&in.Nationality,
		&in.Education,
		&in.Profession,
		&in.AIFamiliarity,
		&in.Reasoning,
		&in.MeasureConsciousness,
		&in.AIRights,
		&in.AIDeclareRights,
	)

	// ─── Validation ───────────────────────────────────────
	if bad := validate(&in); bad != "" {
		return shared.JSONError(http.StatusBadRequest, bad), nil
	}

	// ─── Firestore bootstrap ──────────────────────────────
	client, cleanup, err := shared.FirestoreClient(ctx)
	if err != nil {
		return shared.JSONError(http.StatusInternalServerError, "internal server error"), nil
	}
	defer cleanup()

	// ─── Build document to store ──────────────────────────
	doc := postDoc{
		// Answers
		AICanBeConscious:     in.AICanBeConscious,
		Age:                  in.Age,
		Sex:                  in.Sex,
		Nationality:          in.Nationality,
		Education:            in.Education,
		Profession:           in.Profession,
		AIFamiliarity:        in.AIFamiliarity,
		Reasoning:            in.Reasoning,
		MeasureConsciousness: in.MeasureConsciousness,
		AIRights:             in.AIRights,
		AIDeclareRights:      in.AIDeclareRights,

		// Metadata
		Date: time.Now().UTC(),
		Server: map[string]any{
			"mode":             os.Getenv(shared.EnvServerMode),
			"version":          os.Getenv(shared.EnvServerVersion),
		},
		Client: map[string]any{
			"tag":              in.Client.Tag,
			"fid":              in.Client.Fid,
			"locale":           in.Client.Locale,
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

// trimFields applies strings.TrimSpace to each *string passed in.
func trimFields(ptrs ...*string) {
	for _, p := range ptrs {
		if p != nil {
			*p = strings.TrimSpace(*p)
		}
	}
}

// validate returns an empty string on success.
// On failure, it returns a human-readable message to send back to the user.
func validate(p *postIn) string {
	switch {
	case p.AICanBeConscious == "":
		return "field ‘ai_can_be_conscious’ is required"
	case p.Age <= 0 || p.Age > 120:
		return "invalid age"
	case p.Sex == "":
		return "field ‘sex’ is required"
	case p.Nationality == "":
		return "field ‘nationality’ is required"
	case p.Education == "":
		return "field ‘education’ is required"
	case p.Profession == "":
		return "field ‘profession’ is required"
	case p.AIFamiliarity == "":
		return "field ‘ai_familiarity’ is required"
	}

	// Length-limited free-text boxes
	for name, v := range map[string]string{
		"reasoning":             p.Reasoning,
		"measure_consciousness": p.MeasureConsciousness,
		"ai_rights":             p.AIRights,
		"ai_declare_rights":     p.AIDeclareRights,
	} {
		if len(v) > shared.MaxContentLen {
			return fmt.Sprintf("field ‘%s’ too long", name)
		}
	}

	// Everything OK
	return ""
}

/*────────────────── Main ───────────────────────────────────────────*/

func main() { lambda.Start(HandleRequest) }
