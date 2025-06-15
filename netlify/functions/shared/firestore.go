package shared

// Located at: netlify/functions/shared/firestore.go

import (
	"context"
	"log"
	"os"
	"sync"

	"cloud.google.com/go/firestore"
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

// FirestoreClient returns an open *firestore.Client plus a cleanup
// function you **must** call (typically `defer cleanup()`).
//
//   c, cleanup, err := shared.FirestoreClient(ctx)
//   if err != nil { … }
//   defer cleanup()
//
func FirestoreClient(ctx context.Context) (*firestore.Client, func(), error) {
	app, err := FirestoreApp(ctx)
	if err != nil {
		return nil, nil, err
	}

	cl, err := app.Firestore(ctx)
	if err != nil {
		return nil, nil, err
	}

	cleanup := func() {
		if err := cl.Close(); err != nil {
			log.Printf("firestore close: %v", err)
		}
	}

	return cl, cleanup, nil
}
