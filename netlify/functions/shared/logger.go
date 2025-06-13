package shared

// Located at: netlify/functions/shared/logger.go

import (
	"fmt"
	"log"
)

// LogError logs the message and returns an error.
func LogError(format string, args ...any) error {
	log.Printf(format, args...)

	return fmt.Errorf(format, args...)
}
