package migrations

import (
	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"
)

func migration202603270001() *gormigrate.Migration {
	return &gormigrate.Migration{
		ID: "202603270001",
		Migrate: func(tx *gorm.DB) error {
			_ = tx.Exec("ALTER TABLE ai_providers ADD COLUMN max_output_tokens INTEGER DEFAULT 0").Error
			_ = tx.Exec("ALTER TABLE ai_providers ADD COLUMN context_window INTEGER DEFAULT 0").Error
			return nil
		},
		Rollback: func(tx *gorm.DB) error {
			return nil
		},
	}
}
