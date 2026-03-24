package bootstrap

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
)

const authTokenFile = "auth.token"

// AuthTokenPath 返回认证 token 文件路径
func AuthTokenPath(dataDir string) string {
	if dataDir == "" {
		dataDir = AppDataDir()
	}
	return filepath.Join(dataDir, authTokenFile)
}

// GenerateAuthToken 生成随机认证 token 并写入文件（0600 权限）
func GenerateAuthToken(dataDir string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)

	tokenPath := AuthTokenPath(dataDir)
	if err := os.WriteFile(tokenPath, []byte(token), 0600); err != nil {
		return "", err
	}
	return token, nil
}

// ReadAuthToken 从文件读取认证 token
func ReadAuthToken(dataDir string) (string, error) {
	tokenPath := AuthTokenPath(dataDir)
	data, err := os.ReadFile(tokenPath) //nolint:gosec // path from app data directory
	if err != nil {
		return "", err
	}
	return string(data), nil
}
