package shared

// Located at: netlify/functions/shared/meta.go

import (
	"os"
	"time"

	"github.com/IngoGiebel/project-genesis-asi/netlify/functions/version"
)

// BuildServerMeta returns the map that winds up in Firestore‐docs["server"].
func BuildServerMeta() map[string]any {
	return map[string]any{
		// UTC timestamp
		"date": time.Now().UTC(),
		// "prod" | "dev" | "test"
		"mode": os.Getenv(EnvServerMode),
		// Build/version string
		"version": version.Version,
	}
}

type ClientIn struct {
	Tag,
	Fid,
	Locale string
}

// BuildClientMeta builds the Firestore “client” sub-document and omits empty
// keys so that Tag is stored only when the browser really sent it.
func BuildClientMeta(c ClientIn) map[string]any {
	m := map[string]any{
		"fid":    c.Fid,
		"locale": c.Locale,
	}
	if c.Tag != "" {
		m["tag"] = c.Tag
	}

	return m
}
