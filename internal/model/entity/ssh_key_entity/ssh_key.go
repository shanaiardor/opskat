package ssh_key_entity

import "errors"

// 密钥类型常量
const (
	KeyTypeRSA     = "rsa"
	KeyTypeED25519 = "ed25519"
	KeyTypeECDSA   = "ecdsa"
)

// SSHKey SSH 密钥实体
type SSHKey struct {
	ID          int64  `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Name        string `gorm:"column:name;type:varchar(255);not null" json:"name"`
	Comment     string `gorm:"column:comment;type:varchar(255)" json:"comment"`
	KeyType     string `gorm:"column:key_type;type:varchar(50);not null" json:"keyType"`
	KeySize     int    `gorm:"column:key_size" json:"keySize"`
	PrivateKey  string `gorm:"column:private_key;type:text;not null" json:"-"`
	PublicKey   string `gorm:"column:public_key;type:text;not null" json:"publicKey"`
	Fingerprint string `gorm:"column:fingerprint;type:varchar(255)" json:"fingerprint"`
	Createtime  int64  `gorm:"column:createtime" json:"createtime"`
	Updatetime  int64  `gorm:"column:updatetime" json:"updatetime"`
}

// TableName GORM 表名
func (SSHKey) TableName() string {
	return "ssh_keys"
}

// Validate 校验
func (k *SSHKey) Validate() error {
	if k.Name == "" {
		return errors.New("密钥名称不能为空")
	}
	switch k.KeyType {
	case KeyTypeRSA, KeyTypeED25519, KeyTypeECDSA:
	default:
		return errors.New("不支持的密钥类型")
	}
	if k.PrivateKey == "" {
		return errors.New("私钥不能为空")
	}
	if k.PublicKey == "" {
		return errors.New("公钥不能为空")
	}
	return nil
}
