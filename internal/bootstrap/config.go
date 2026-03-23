package bootstrap

import (
	"encoding/json"
	"math/rand"
	"os"
	"path/filepath"
	"sync"
)

// AppConfig 应用持久化配置（config.json）
type AppConfig struct {
	MCPPort int `json:"mcp_port"` // MCP Server 固定端口
}

var (
	appConfig     *AppConfig
	appConfigOnce sync.Once
	configPath    string
)

// LoadConfig 加载应用配置，首次调用时自动生成默认值
// 必须在 Init 之后调用（依赖 dataDir）
func LoadConfig(dataDir string) (*AppConfig, error) {
	var loadErr error
	appConfigOnce.Do(func() {
		if dataDir == "" {
			dataDir = AppDataDir()
		}
		configPath = filepath.Join(dataDir, "config.json")

		data, err := os.ReadFile(configPath)
		if err != nil {
			// 文件不存在，生成默认配置
			appConfig = &AppConfig{
				MCPPort: generateHighPort(),
			}
			loadErr = saveConfigFile()
			return
		}

		var cfg AppConfig
		if err := json.Unmarshal(data, &cfg); err != nil {
			// 文件损坏，重新生成
			appConfig = &AppConfig{
				MCPPort: generateHighPort(),
			}
			loadErr = saveConfigFile()
			return
		}

		// 端口未设置则生成
		if cfg.MCPPort == 0 {
			cfg.MCPPort = generateHighPort()
		}
		appConfig = &cfg
		loadErr = saveConfigFile()
	})
	return appConfig, loadErr
}

// GetConfig 获取当前配置（LoadConfig 之后调用）
func GetConfig() *AppConfig {
	return appConfig
}

// SaveConfig 保存配置到文件
func SaveConfig(cfg *AppConfig) error {
	appConfig = cfg
	return saveConfigFile()
}

func saveConfigFile() error {
	data, err := json.MarshalIndent(appConfig, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0644)
}

// generateHighPort 生成 10000-60000 范围内的随机端口
func generateHighPort() int {
	return 10000 + rand.Intn(50000)
}
