package shared

// Located at: netlify/functions/shared/logger.go

import (
	"fmt"
	"log/slog"
	"os"
	"time"
)

var Logger = slog.New(
	slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
		ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey {
				a.Value = slog.StringValue(a.Value.Time().Format(time.RFC3339))
			}

			return a
		},
	}),
)

// LogError logs the message and returns an error.
func LogError(format string, args ...any) error {
	err := fmt.Errorf(format, args...)
	Logger.Error(err.Error())

	return err
}
