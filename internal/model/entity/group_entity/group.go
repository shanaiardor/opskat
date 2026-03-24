package group_entity

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/opskat/opskat/internal/model/entity/policy"
)

// Group 资产分组实体
type Group struct {
	ID          int64  `gorm:"column:id;primaryKey;autoIncrement"`
	Name        string `gorm:"column:name;type:varchar(255);not null"`
	ParentID    int64  `gorm:"column:parent_id;index"`
	Icon        string `gorm:"column:icon;type:varchar(100)"`
	Description string `gorm:"column:description;type:text"`
	CmdPolicy   string `gorm:"column:command_policy;type:text"`
	QryPolicy   string `gorm:"column:query_policy;type:text"`
	RdsPolicy   string `gorm:"column:redis_policy;type:text"`
	SortOrder   int    `gorm:"column:sort_order;default:0"`
	Createtime  int64  `gorm:"column:createtime"`
	Updatetime  int64  `gorm:"column:updatetime"`
}

// TableName GORM表名
func (Group) TableName() string {
	return "groups"
}

// Validate 校验分组
func (g *Group) Validate() error {
	if g.Name == "" {
		return errors.New("分组名称不能为空")
	}
	return nil
}

// IsRoot 是否为顶层分组
func (g *Group) IsRoot() bool {
	return g.ParentID == 0
}

// GetCommandPolicy 解析命令权限策略
func (g *Group) GetCommandPolicy() (*policy.CommandPolicy, error) {
	if g.CmdPolicy == "" {
		return &policy.CommandPolicy{}, nil
	}
	var p policy.CommandPolicy
	if err := json.Unmarshal([]byte(g.CmdPolicy), &p); err != nil {
		return nil, fmt.Errorf("解析命令权限策略失败: %w", err)
	}
	return &p, nil
}

// SetCommandPolicy 序列化命令权限策略
func (g *Group) SetCommandPolicy(p *policy.CommandPolicy) error {
	if p == nil || (len(p.AllowList) == 0 && len(p.DenyList) == 0) {
		g.CmdPolicy = ""
		return nil
	}
	data, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("序列化命令权限策略失败: %w", err)
	}
	g.CmdPolicy = string(data)
	return nil
}

// GetQueryPolicy 解析 SQL 权限策略
func (g *Group) GetQueryPolicy() (*policy.QueryPolicy, error) {
	if g.QryPolicy == "" {
		return &policy.QueryPolicy{}, nil
	}
	var p policy.QueryPolicy
	if err := json.Unmarshal([]byte(g.QryPolicy), &p); err != nil {
		return nil, fmt.Errorf("解析SQL权限策略失败: %w", err)
	}
	return &p, nil
}

// SetQueryPolicy 序列化 SQL 权限策略
func (g *Group) SetQueryPolicy(p *policy.QueryPolicy) error {
	if p == nil || (len(p.AllowTypes) == 0 && len(p.DenyTypes) == 0 && len(p.DenyFlags) == 0) {
		g.QryPolicy = ""
		return nil
	}
	data, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("序列化SQL权限策略失败: %w", err)
	}
	g.QryPolicy = string(data)
	return nil
}

// GetRedisPolicy 解析 Redis 权限策略
func (g *Group) GetRedisPolicy() (*policy.RedisPolicy, error) {
	if g.RdsPolicy == "" {
		return &policy.RedisPolicy{}, nil
	}
	var p policy.RedisPolicy
	if err := json.Unmarshal([]byte(g.RdsPolicy), &p); err != nil {
		return nil, fmt.Errorf("解析Redis权限策略失败: %w", err)
	}
	return &p, nil
}

// SetRedisPolicy 序列化 Redis 权限策略
func (g *Group) SetRedisPolicy(p *policy.RedisPolicy) error {
	if p == nil || (len(p.AllowList) == 0 && len(p.DenyList) == 0) {
		g.RdsPolicy = ""
		return nil
	}
	data, err := json.Marshal(p)
	if err != nil {
		return fmt.Errorf("序列化Redis权限策略失败: %w", err)
	}
	g.RdsPolicy = string(data)
	return nil
}
