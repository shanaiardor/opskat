package import_svc

import (
	"testing"

	. "github.com/smartystreets/goconvey/convey"
)

func TestParseSSHConfig(t *testing.T) {
	Convey("parseSSHConfig", t, func() {
		Convey("基本解析", func() {
			config := `
Host myserver
    HostName 192.168.1.100
    Port 2222
    User admin
    IdentityFile ~/.ssh/id_rsa

Host webserver
    HostName 10.0.0.1
    User root
`
			hosts := parseSSHConfig(config)
			So(len(hosts), ShouldEqual, 2)

			So(hosts[0].alias, ShouldEqual, "myserver")
			So(hosts[0].hostName, ShouldEqual, "192.168.1.100")
			So(hosts[0].port, ShouldEqual, 2222)
			So(hosts[0].user, ShouldEqual, "admin")
			So(hosts[0].identityFile, ShouldEqual, "~/.ssh/id_rsa")

			So(hosts[1].alias, ShouldEqual, "webserver")
			So(hosts[1].hostName, ShouldEqual, "10.0.0.1")
			So(hosts[1].user, ShouldEqual, "root")
			So(hosts[1].port, ShouldEqual, 0)
		})

		Convey("跳过通配符 Host", func() {
			config := `
Host *
    ServerAliveInterval 60

Host prod
    HostName prod.example.com
    User deploy
`
			hosts := parseSSHConfig(config)
			So(len(hosts), ShouldEqual, 1)
			So(hosts[0].alias, ShouldEqual, "prod")
		})

		Convey("跳过没有 HostName 的条目", func() {
			config := `
Host alias-only
    User test

Host real
    HostName 1.2.3.4
`
			hosts := parseSSHConfig(config)
			So(len(hosts), ShouldEqual, 1)
			So(hosts[0].alias, ShouldEqual, "real")
		})

		Convey("ProxyJump 解析", func() {
			config := `
Host jump
    HostName 10.0.0.1
    User admin

Host target
    HostName 10.0.0.2
    User root
    ProxyJump jump
`
			hosts := parseSSHConfig(config)
			So(len(hosts), ShouldEqual, 2)
			So(hosts[1].proxyJump, ShouldEqual, "jump")
		})

		Convey("等号分隔格式", func() {
			config := `
Host eqserver
    HostName=192.168.1.1
    Port=22
    User=root
`
			hosts := parseSSHConfig(config)
			So(len(hosts), ShouldEqual, 1)
			So(hosts[0].hostName, ShouldEqual, "192.168.1.1")
			So(hosts[0].port, ShouldEqual, 22)
			So(hosts[0].user, ShouldEqual, "root")
		})

		Convey("注释和空行", func() {
			config := `
# This is a comment
Host server1
    HostName 1.1.1.1
    # inline comment
    User test

`
			hosts := parseSSHConfig(config)
			So(len(hosts), ShouldEqual, 1)
			So(hosts[0].hostName, ShouldEqual, "1.1.1.1")
		})
	})
}
