// Package skillplugin provides embedded skill/plugin content for opsctl.
// Both the desktop app and CLI import this to access skill files.
package skillplugin

import _ "embed"

//go:embed opsctl/skills/opsctl/SKILL.md
var SkillMD string

//go:embed opsctl/skills/opsctl/references/commands.md
var CommandsMD string

//go:embed opsctl/commands/init.md
var InitMD string

//go:embed opsctl/.claude-plugin/plugin.json
var PluginJSON string

//go:embed .claude-plugin/marketplace.json
var MarketplaceJSON string

//go:embed opsctl/.claude-plugin/marketplace.json
var PluginMarketplaceJSON string
