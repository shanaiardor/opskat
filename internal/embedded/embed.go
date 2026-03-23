package embedded

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// opsctlBinary 由 embed_prod.go (embed_opsctl tag) 或 embed_dev.go 设置
var opsctlBinary []byte

// HasEmbeddedOpsctl 检查是否嵌入了 opsctl 二进制
func HasEmbeddedOpsctl() bool {
	return len(opsctlBinary) > 0
}

// DefaultInstallDir 返回默认安装目录
func DefaultInstallDir() string {
	if runtime.GOOS == "windows" {
		return filepath.Join(os.Getenv("LOCALAPPDATA"), "opsctl")
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".local", "bin")
}

// InstallOpsctl 将嵌入的 opsctl 二进制写入指定目录
func InstallOpsctl(targetDir string) (string, error) {
	if len(opsctlBinary) == 0 {
		return "", fmt.Errorf("no embedded opsctl binary")
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return "", fmt.Errorf("create directory failed: %w", err)
	}

	binName := "opsctl"
	if runtime.GOOS == "windows" {
		binName = "opsctl.exe"
	}
	targetPath := filepath.Join(targetDir, binName)

	if err := os.WriteFile(targetPath, opsctlBinary, 0755); err != nil {
		return "", fmt.Errorf("write binary failed: %w", err)
	}

	return targetPath, nil
}
