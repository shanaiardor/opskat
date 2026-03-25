package ai

import (
	"context"
	"testing"

	"github.com/opskat/opskat/internal/model/entity/asset_entity"
	"github.com/opskat/opskat/internal/model/entity/grant_entity"
	"github.com/opskat/opskat/internal/model/entity/group_entity"
	"github.com/opskat/opskat/internal/repository/grant_repo"
	"github.com/opskat/opskat/internal/repository/group_repo"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	. "github.com/smartystreets/goconvey/convey"
)

// --- stubGrantRepo for tests ---

type stubGrantRepo struct {
	sessions map[string]*grant_entity.GrantSession
	items    map[string][]*grant_entity.GrantItem
}

func newStubGrantRepo() *stubGrantRepo {
	return &stubGrantRepo{
		sessions: make(map[string]*grant_entity.GrantSession),
		items:    make(map[string][]*grant_entity.GrantItem),
	}
}

func (r *stubGrantRepo) CreateSession(_ context.Context, s *grant_entity.GrantSession) error {
	r.sessions[s.ID] = s
	return nil
}

func (r *stubGrantRepo) GetSession(_ context.Context, id string) (*grant_entity.GrantSession, error) {
	if s, ok := r.sessions[id]; ok {
		return s, nil
	}
	return nil, assert.AnError
}

func (r *stubGrantRepo) UpdateSessionStatus(_ context.Context, id string, status int) error {
	if s, ok := r.sessions[id]; ok {
		s.Status = status
	}
	return nil
}

func (r *stubGrantRepo) CreateItems(_ context.Context, items []*grant_entity.GrantItem) error {
	for _, item := range items {
		r.items[item.GrantSessionID] = append(r.items[item.GrantSessionID], item)
	}
	return nil
}

func (r *stubGrantRepo) UpdateItems(_ context.Context, sessionID string, items []*grant_entity.GrantItem) error {
	r.items[sessionID] = items
	return nil
}

func (r *stubGrantRepo) ListItems(_ context.Context, sessionID string) ([]*grant_entity.GrantItem, error) {
	return r.items[sessionID], nil
}

func (r *stubGrantRepo) ListApprovedItems(_ context.Context, sessionID string) ([]*grant_entity.GrantItem, error) {
	s, ok := r.sessions[sessionID]
	if !ok || s.Status != grant_entity.GrantStatusApproved {
		return nil, nil
	}
	return r.items[sessionID], nil
}

// --- Tests ---

func TestCheckPermission_SSH(t *testing.T) {
	Convey("CheckPermission SSH", t, func() {
		ctx, mockAsset, _ := setupPolicyTest(t)

		Convey("deny list match → Deny", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeSSH,
				CmdPolicy: mustJSON(asset_entity.CommandPolicy{
					DenyList: []string{"rm -rf *"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "ssh", 1, "rm -rf /")
			So(result.Decision, ShouldEqual, Deny)
			So(result.DecisionSource, ShouldEqual, SourcePolicyDeny)
		})

		Convey("allow list match → Allow", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeSSH,
				CmdPolicy: mustJSON(asset_entity.CommandPolicy{
					AllowList: []string{"ls *", "cat *"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "ssh", 1, "ls -la")
			So(result.Decision, ShouldEqual, Allow)
			So(result.DecisionSource, ShouldEqual, SourcePolicyAllow)
		})

		Convey("no match → NeedConfirm with HintRules", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeSSH,
				CmdPolicy: mustJSON(asset_entity.CommandPolicy{
					AllowList: []string{"ls *", "cat *"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "ssh", 1, "systemctl restart nginx")
			So(result.Decision, ShouldEqual, NeedConfirm)
			So(result.HintRules, ShouldContain, "ls *")
			So(result.HintRules, ShouldContain, "cat *")
		})

		Convey("exec type alias maps to SSH", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeSSH,
				CmdPolicy: mustJSON(asset_entity.CommandPolicy{
					AllowList: []string{"uptime"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "exec", 1, "uptime")
			So(result.Decision, ShouldEqual, Allow)
		})

		Convey("DB grant match → Allow", func() {
			asset := &asset_entity.Asset{ID: 1, Type: asset_entity.AssetTypeSSH}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			// Setup grant repo with approved item
			stubGrant := newStubGrantRepo()
			origGrant := grant_repo.Grant()
			grant_repo.RegisterGrant(stubGrant)
			t.Cleanup(func() {
				if origGrant != nil {
					grant_repo.RegisterGrant(origGrant)
				}
			})

			stubGrant.sessions["sess-1"] = &grant_entity.GrantSession{
				ID: "sess-1", Status: grant_entity.GrantStatusApproved,
			}
			stubGrant.items["sess-1"] = []*grant_entity.GrantItem{
				{GrantSessionID: "sess-1", AssetID: 1, Command: "uptime"},
			}

			grantCtx := WithSessionID(ctx, "sess-1")
			result := CheckPermission(grantCtx, "ssh", 1, "uptime")
			So(result.Decision, ShouldEqual, Allow)
			So(result.DecisionSource, ShouldEqual, SourceGrantAllow)
		})
	})
}

func TestCheckPermission_Database(t *testing.T) {
	Convey("CheckPermission Database", t, func() {
		ctx, mockAsset, _ := setupPolicyTest(t)

		Convey("allow types match → Allow", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeDatabase,
				CmdPolicy: mustJSON(asset_entity.QueryPolicy{
					AllowTypes: []string{"SELECT", "SHOW"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "database", 1, "SELECT * FROM users")
			So(result.Decision, ShouldEqual, Allow)
			So(result.DecisionSource, ShouldEqual, SourcePolicyAllow)
		})

		Convey("deny type → Deny", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeDatabase,
				CmdPolicy: mustJSON(asset_entity.QueryPolicy{
					DenyTypes: []string{"DROP TABLE"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "database", 1, "DROP TABLE users")
			So(result.Decision, ShouldEqual, Deny)
			So(result.DecisionSource, ShouldEqual, SourcePolicyDeny)
		})

		Convey("NeedConfirm returns SQL types as HintRules", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeDatabase,
				CmdPolicy: mustJSON(asset_entity.QueryPolicy{
					AllowTypes: []string{"SELECT", "SHOW"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "database", 1, "INSERT INTO users VALUES (1)")
			So(result.Decision, ShouldEqual, NeedConfirm)
			So(result.HintRules, ShouldContain, "SELECT")
			So(result.HintRules, ShouldContain, "SHOW")
		})

		Convey("invalid SQL → Deny", func() {
			asset := &asset_entity.Asset{ID: 1, Type: asset_entity.AssetTypeDatabase}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "database", 1, "NOT VALID SQL !!!")
			So(result.Decision, ShouldEqual, Deny)
			assert.Contains(t, result.Message, "SQL")
		})

		Convey("group deny overrides asset allow", func() {
			stubGrp := &stubGroupRepo{groups: make(map[int64]*group_entity.Group)}
			origGroup := group_repo.Group()
			group_repo.RegisterGroup(stubGrp)
			t.Cleanup(func() {
				if origGroup != nil {
					group_repo.RegisterGroup(origGroup)
				}
			})
			stubGrp.groups[10] = &group_entity.Group{
				ID: 10, Name: "prod",
				CmdPolicy: `{"deny_list":["INSERT *"]}`,
			}
			asset := &asset_entity.Asset{
				ID: 1, Type: asset_entity.AssetTypeDatabase, GroupID: 10,
				CmdPolicy: mustJSON(asset_entity.QueryPolicy{AllowTypes: []string{"SELECT", "INSERT"}}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "database", 1, "INSERT INTO users VALUES (1)")
			So(result.Decision, ShouldEqual, Deny)
		})
	})
}

func TestCheckPermission_Redis(t *testing.T) {
	Convey("CheckPermission Redis", t, func() {
		ctx, mockAsset, _ := setupPolicyTest(t)

		Convey("allow list match → Allow", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeRedis,
				CmdPolicy: mustJSON(asset_entity.RedisPolicy{
					AllowList: []string{"GET *", "HGETALL *"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "redis", 1, "GET user:1")
			So(result.Decision, ShouldEqual, Allow)
			So(result.DecisionSource, ShouldEqual, SourcePolicyAllow)
		})

		Convey("deny list match → Deny", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeRedis,
				CmdPolicy: mustJSON(asset_entity.RedisPolicy{
					DenyList: []string{"FLUSHDB", "FLUSHALL"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "redis", 1, "FLUSHDB")
			So(result.Decision, ShouldEqual, Deny)
			So(result.DecisionSource, ShouldEqual, SourcePolicyDeny)
		})

		Convey("NeedConfirm returns Redis commands as HintRules", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeRedis,
				CmdPolicy: mustJSON(asset_entity.RedisPolicy{
					AllowList: []string{"GET *", "HGETALL *"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "redis", 1, "SET user:1 val")
			So(result.Decision, ShouldEqual, NeedConfirm)
			So(result.HintRules, ShouldContain, "GET *")
			So(result.HintRules, ShouldContain, "HGETALL *")
		})

		Convey("no policy auto-allows", func() {
			asset := &asset_entity.Asset{ID: 1, Type: asset_entity.AssetTypeRedis}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			result := CheckPermission(ctx, "redis", 1, "GET user:1")
			So(result.Decision, ShouldEqual, Allow)
		})
	})
}

func TestSaveGrantPattern(t *testing.T) {
	Convey("SaveGrantPattern", t, func() {
		stubGrant := newStubGrantRepo()
		origGrant := grant_repo.Grant()
		grant_repo.RegisterGrant(stubGrant)
		t.Cleanup(func() {
			if origGrant != nil {
				grant_repo.RegisterGrant(origGrant)
			}
		})

		ctx := context.Background()

		Convey("creates session and item", func() {
			SaveGrantPattern(ctx, "sess-1", 1, "web-01", "uptime")

			So(stubGrant.sessions, ShouldContainKey, "sess-1")
			So(stubGrant.sessions["sess-1"].Status, ShouldEqual, grant_entity.GrantStatusApproved)
			So(stubGrant.items["sess-1"], ShouldHaveLength, 1)
			So(stubGrant.items["sess-1"][0].Command, ShouldEqual, "uptime")
			So(stubGrant.items["sess-1"][0].AssetID, ShouldEqual, 1)
			So(stubGrant.items["sess-1"][0].AssetName, ShouldEqual, "web-01")
		})

		Convey("adds to existing session", func() {
			stubGrant.sessions["sess-2"] = &grant_entity.GrantSession{
				ID: "sess-2", Status: grant_entity.GrantStatusApproved,
			}

			SaveGrantPattern(ctx, "sess-2", 1, "web-01", "ls *")
			SaveGrantPattern(ctx, "sess-2", 1, "web-01", "cat *")

			So(stubGrant.items["sess-2"], ShouldHaveLength, 2)
		})

		Convey("no-op for empty sessionID", func() {
			SaveGrantPattern(ctx, "", 1, "web-01", "uptime")
			So(stubGrant.sessions, ShouldBeEmpty)
		})

		Convey("no-op for empty command", func() {
			SaveGrantPattern(ctx, "sess-3", 1, "web-01", "")
			So(stubGrant.sessions, ShouldNotContainKey, "sess-3")
		})
	})
}

func TestCheckPermission_DBGrantForDatabaseRedis(t *testing.T) {
	Convey("DB Grant matching works for database/redis types", t, func() {
		ctx, mockAsset, _ := setupPolicyTest(t)

		stubGrant := newStubGrantRepo()
		origGrant := grant_repo.Grant()
		grant_repo.RegisterGrant(stubGrant)
		t.Cleanup(func() {
			if origGrant != nil {
				grant_repo.RegisterGrant(origGrant)
			}
		})

		Convey("database: grant match bypasses NeedConfirm", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeDatabase,
				CmdPolicy: mustJSON(asset_entity.QueryPolicy{
					AllowTypes: []string{"SELECT"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			// INSERT would normally be NeedConfirm, but grant allows it
			stubGrant.sessions["sess-db"] = &grant_entity.GrantSession{
				ID: "sess-db", Status: grant_entity.GrantStatusApproved,
			}
			stubGrant.items["sess-db"] = []*grant_entity.GrantItem{
				{GrantSessionID: "sess-db", AssetID: 1, Command: "INSERT *"},
			}

			grantCtx := WithSessionID(ctx, "sess-db")
			result := CheckPermission(grantCtx, "database", 1, "INSERT INTO users VALUES (1)")
			So(result.Decision, ShouldEqual, Allow)
			So(result.DecisionSource, ShouldEqual, SourceGrantAllow)
		})

		Convey("redis: grant match bypasses NeedConfirm", func() {
			asset := &asset_entity.Asset{
				ID:   1,
				Type: asset_entity.AssetTypeRedis,
				CmdPolicy: mustJSON(asset_entity.RedisPolicy{
					AllowList: []string{"GET *"},
				}),
			}
			mockAsset.EXPECT().Find(gomock.Any(), int64(1)).Return(asset, nil).AnyTimes()

			// SET would normally be NeedConfirm, but grant allows it
			stubGrant.sessions["sess-redis"] = &grant_entity.GrantSession{
				ID: "sess-redis", Status: grant_entity.GrantStatusApproved,
			}
			stubGrant.items["sess-redis"] = []*grant_entity.GrantItem{
				{GrantSessionID: "sess-redis", AssetID: 1, Command: "SET *"},
			}

			grantCtx := WithSessionID(ctx, "sess-redis")
			result := CheckPermission(grantCtx, "redis", 1, "SET user:1 val")
			So(result.Decision, ShouldEqual, Allow)
			So(result.DecisionSource, ShouldEqual, SourceGrantAllow)
		})
	})
}
