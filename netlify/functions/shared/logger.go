// Located at: netlify/functions/shared/logger.go
package shared

import (
	"fmt"
	"log"
)

// LogError logs the message and returns an error – one line replaces two.
func LogError(format string, args ...any) error {
	log.Printf(format, args...)
	return fmt.Errorf(format, args...)
}
