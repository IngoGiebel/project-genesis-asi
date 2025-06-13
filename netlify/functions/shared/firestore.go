// Located at: netlify/functions/shared/firestore.go
package shared

import (
	"context"
	"os"
	"sync"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

// lazy-initialised Firebase app, protected by sync.Once
var (
	appOnce sync.Once
	app     *firebase.App
	appErr  error
)

// FirestoreApp returns an initialised *firebase.App (one per cold start).
func FirestoreApp(ctx context.Context) (*firebase.App, error) {
	appOnce.Do(func() {
		creds := os.Getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
		if creds == "" {
			appErr = LogError("FIREBASE_SERVICE_ACCOUNT_JSON env var not set")
			return
		}
		app, appErr = firebase.NewApp(ctx, nil, option.WithCredentialsJSON([]byte(creds)))
	})
	return app, appErr
}
