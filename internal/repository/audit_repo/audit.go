package audit_repo

import (
	"context"

	"ops-cat/internal/model/entity/audit_entity"

	"github.com/cago-frame/cago/database/db"
)

// AuditRepo 审计日志数据访问接口
type AuditRepo interface {
	Create(ctx context.Context, log *audit_entity.AuditLog) error
	List(ctx context.Context, opts ListOptions) ([]*audit_entity.AuditLog, int64, error)
}

// ListOptions 列表查询选项
type ListOptions struct {
	Source         string
	AssetID        int64
	ConversationID int64
	Offset         int
	Limit          int
}

var defaultAudit AuditRepo

// Audit 获取 AuditRepo 实例
func Audit() AuditRepo {
	return defaultAudit
}

// RegisterAudit 注册 AuditRepo 实现
func RegisterAudit(i AuditRepo) {
	defaultAudit = i
}

// auditRepo 默认实现
type auditRepo struct{}

// NewAudit 创建默认实现
func NewAudit() AuditRepo {
	return &auditRepo{}
}

func (r *auditRepo) Create(ctx context.Context, log *audit_entity.AuditLog) error {
	return db.Ctx(ctx).Create(log).Error
}

func (r *auditRepo) List(ctx context.Context, opts ListOptions) ([]*audit_entity.AuditLog, int64, error) {
	var logs []*audit_entity.AuditLog
	var total int64

	query := db.Ctx(ctx).Model(&audit_entity.AuditLog{})
	if opts.Source != "" {
		query = query.Where("source = ?", opts.Source)
	}
	if opts.AssetID > 0 {
		query = query.Where("asset_id = ?", opts.AssetID)
	}
	if opts.ConversationID > 0 {
		query = query.Where("conversation_id = ?", opts.ConversationID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if opts.Limit > 0 {
		query = query.Limit(opts.Limit)
	}
	if opts.Offset > 0 {
		query = query.Offset(opts.Offset)
	}

	if err := query.Order("id DESC").Find(&logs).Error; err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}
