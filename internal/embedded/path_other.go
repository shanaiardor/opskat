//go:build !windows

package embedded

func addToUserPath(_ string) error {
	return nil
}
