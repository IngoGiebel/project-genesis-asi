package shared

// Located at: netlify/functions/shared/config.go

// Environment-variable names that may be read by serverless functions.
const (
	// EnvServerMode = "prod" | "test"
	EnvServerMode    = "SERVER_MODE"
	// EnvServerVersion = git SHA or "v1.2.3"
	EnvServerVersion = "SERVER_VERSION"
)

// MaxPosts generic limit / paging constant.
const (
	MaxPosts = 50
)
