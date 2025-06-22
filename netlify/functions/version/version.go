package version

// Located at: netlify/functions/version/version.go

import (
	_ "embed"
	"strings"
)

//go:embed VERSION
var rawVersion string

// Version is the build’s semantic version string (e.g. "v1.3.0").
var Version = strings.TrimSpace(rawVersion)
