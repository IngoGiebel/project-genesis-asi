package shared

// Located at: netlify/functions/shared/limits.go

const (
	// MaxBody is a 64 KiB soft limit for incoming JSON bodies.
	MaxBody = 65_536
	// MaxContentLen is the upper bound (bytes) for an editor payload.
	MaxContentLen = 10_000
	// MaxPosts generic limit / paging constant.
	MaxPosts = 50
)
