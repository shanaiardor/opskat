package ai

import (
	"context"
	"fmt"
	"strings"
)

type policyLangKey struct{}

// WithPolicyLang 设置策略消息的语言（"zh-cn", "en" 等）
func WithPolicyLang(ctx context.Context, lang string) context.Context {
	return context.WithValue(ctx, policyLangKey{}, lang)
}

// isZh 判断 context 中的语言是否为中文，默认英文
func isZh(ctx context.Context) bool {
	lang, _ := ctx.Value(policyLangKey{}).(string)
	if lang == "" {
		return false
	}
	return strings.HasPrefix(strings.ToLower(lang), "zh")
}

// policyMsg 根据 context 语言选择消息
func policyMsg(ctx context.Context, en, zh string) string {
	if isZh(ctx) {
		return zh
	}
	return en
}

// policyFmt 根据 context 语言选择格式化消息
func policyFmt(ctx context.Context, enFmt, zhFmt string, args ...any) string {
	if isZh(ctx) {
		return fmt.Sprintf(zhFmt, args...)
	}
	return fmt.Sprintf(enFmt, args...)
}
