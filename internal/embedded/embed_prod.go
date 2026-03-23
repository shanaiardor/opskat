//go:build embed_opsctl

package embedded

import _ "embed"

//go:embed opsctl_bin
var opsctlBinaryData []byte

func init() {
	opsctlBinary = opsctlBinaryData
}
