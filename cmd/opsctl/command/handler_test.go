package command

import (
	"context"
	"sync"
	"testing"

	"github.com/opskat/opskat/internal/ai"

	. "github.com/smartystreets/goconvey/convey"
)

// mockAuditWriter 捕获审计日志写入
type mockAuditWriter struct {
	mu    sync.Mutex
	calls []ai.ToolCallInfo
}

func (m *mockAuditWriter) WriteToolCall(_ context.Context, info ai.ToolCallInfo) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls = append(m.calls, info)
}

func (m *mockAuditWriter) lastCall() ai.ToolCallInfo {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.calls[len(m.calls)-1]
}

func TestCallHandler_Decision(t *testing.T) {
	Convey("callHandler 审计日志决策信息", t, func() {
		mock := &mockAuditWriter{}
		origWriter := opsctlAuditWriter
		opsctlAuditWriter = mock
		defer func() { opsctlAuditWriter = origWriter }()

		handlers := map[string]ai.ToolHandlerFunc{
			"exec_sql": func(_ context.Context, args map[string]any) (string, error) {
				return `{"rows":[]}`, nil
			},
			"exec_redis": func(_ context.Context, args map[string]any) (string, error) {
				return "PONG", nil
			},
		}

		Convey("传入 decision 时审计日志包含决策信息", func() {
			decision := &ai.CheckResult{
				Decision:       ai.Allow,
				DecisionSource: ai.SourcePolicyAllow,
				MatchedPattern: "SELECT *",
			}
			exitCode := callHandler(context.Background(), handlers, "exec_sql", map[string]any{
				"asset_id": float64(1),
				"sql":      "SELECT 1",
			}, decision)

			So(exitCode, ShouldEqual, 0)
			So(len(mock.calls), ShouldEqual, 1)

			info := mock.lastCall()
			So(info.ToolName, ShouldEqual, "exec_sql")
			So(info.Decision, ShouldNotBeNil)
			So(info.Decision.Decision, ShouldEqual, ai.Allow)
			So(info.Decision.DecisionSource, ShouldEqual, ai.SourcePolicyAllow)
			So(info.Decision.MatchedPattern, ShouldEqual, "SELECT *")
		})

		Convey("exec_redis 传入 decision 时审计日志包含决策信息", func() {
			decision := &ai.CheckResult{
				Decision:       ai.Allow,
				DecisionSource: ai.SourceUserAllow,
			}
			exitCode := callHandler(context.Background(), handlers, "exec_redis", map[string]any{
				"asset_id": float64(1),
				"command":  "PING",
			}, decision)

			So(exitCode, ShouldEqual, 0)
			So(len(mock.calls), ShouldEqual, 1)

			info := mock.lastCall()
			So(info.Decision, ShouldNotBeNil)
			So(info.Decision.Decision, ShouldEqual, ai.Allow)
			So(info.Decision.DecisionSource, ShouldEqual, ai.SourceUserAllow)
		})

		Convey("不传 decision 时审计日志 Decision 为 nil", func() {
			exitCode := callHandler(context.Background(), handlers, "exec_sql", map[string]any{
				"asset_id": float64(1),
				"sql":      "SELECT 1",
			})

			So(exitCode, ShouldEqual, 0)
			So(len(mock.calls), ShouldEqual, 1)

			info := mock.lastCall()
			So(info.Decision, ShouldBeNil)
		})
	})
}
