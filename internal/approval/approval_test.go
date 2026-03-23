package approval

import (
	"encoding/json"
	"testing"

	"github.com/smartystreets/goconvey/convey"
	"github.com/stretchr/testify/assert"
)

func TestApprovalRequest_JSON(t *testing.T) {
	convey.Convey("ApprovalRequest JSON 序列化", t, func() {
		convey.Convey("单条审批请求", func() {
			req := ApprovalRequest{
				Type:      "exec",
				AssetID:   1,
				AssetName: "web-01",
				Command:   "uptime",
				Detail:    "opsctl exec web-01 -- uptime",
			}
			data, err := json.Marshal(req)
			assert.NoError(t, err)

			var decoded ApprovalRequest
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.Equal(t, "exec", decoded.Type)
			assert.Equal(t, int64(1), decoded.AssetID)
			assert.Equal(t, "uptime", decoded.Command)
			assert.Empty(t, decoded.PlanSessionID)
			assert.Empty(t, decoded.PlanItems)
		})

		convey.Convey("计划审批请求", func() {
			req := ApprovalRequest{
				Type:          "plan",
				PlanSessionID: "abc-123",
				Description:   "deploy nginx",
				PlanItems: []PlanItem{
					{Type: "exec", AssetID: 1, AssetName: "web-01", Command: "systemctl stop nginx"},
					{Type: "cp", AssetID: 1, AssetName: "web-01", Detail: "upload config"},
					{Type: "exec", AssetID: 1, AssetName: "web-01", Command: "systemctl start nginx"},
				},
			}
			data, err := json.Marshal(req)
			assert.NoError(t, err)

			var decoded ApprovalRequest
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.Equal(t, "plan", decoded.Type)
			assert.Equal(t, "abc-123", decoded.PlanSessionID)
			assert.Len(t, decoded.PlanItems, 3)
			assert.Equal(t, "systemctl stop nginx", decoded.PlanItems[0].Command)
			assert.Equal(t, "cp", decoded.PlanItems[1].Type)
		})

		convey.Convey("带 plan-session 的 exec 请求", func() {
			req := ApprovalRequest{
				Type:          "exec",
				AssetID:       1,
				AssetName:     "web-01",
				Command:       "uptime",
				PlanSessionID: "session-xyz",
			}
			data, err := json.Marshal(req)
			assert.NoError(t, err)

			var decoded ApprovalRequest
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.Equal(t, "exec", decoded.Type)
			assert.Equal(t, "session-xyz", decoded.PlanSessionID)
		})
	})
}

func TestApprovalResponse_JSON(t *testing.T) {
	convey.Convey("ApprovalResponse JSON 序列化", t, func() {
		convey.Convey("普通审批响应", func() {
			resp := ApprovalResponse{Approved: true}
			data, err := json.Marshal(resp)
			assert.NoError(t, err)

			var decoded ApprovalResponse
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.True(t, decoded.Approved)
			assert.Empty(t, decoded.PlanSessionID)
		})

		convey.Convey("计划审批响应带 session ID", func() {
			resp := ApprovalResponse{Approved: true, PlanSessionID: "plan-abc"}
			data, err := json.Marshal(resp)
			assert.NoError(t, err)

			var decoded ApprovalResponse
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.True(t, decoded.Approved)
			assert.Equal(t, "plan-abc", decoded.PlanSessionID)
		})

		convey.Convey("拒绝响应带原因", func() {
			resp := ApprovalResponse{Approved: false, Reason: "user denied"}
			data, err := json.Marshal(resp)
			assert.NoError(t, err)

			var decoded ApprovalResponse
			err = json.Unmarshal(data, &decoded)
			assert.NoError(t, err)
			assert.False(t, decoded.Approved)
			assert.Equal(t, "user denied", decoded.Reason)
		})
	})
}

func TestSocketPath(t *testing.T) {
	convey.Convey("SocketPath", t, func() {
		path := SocketPath("/tmp/ops-cat")
		assert.Equal(t, "/tmp/ops-cat/approval.sock", path)
	})
}
