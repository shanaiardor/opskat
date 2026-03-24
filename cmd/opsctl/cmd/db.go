package cmd

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/opskat/opskat/internal/ai"
	"github.com/opskat/opskat/internal/approval"
)

func cmdSQL(ctx context.Context, handlers map[string]ai.ToolHandlerFunc, args []string, session string) int {
	if len(args) == 0 || args[0] == "-h" || args[0] == "--help" {
		printSQLUsage()
		if len(args) > 0 {
			return 0
		}
		return 1
	}

	asset, err := resolveAsset(ctx, args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		return 1
	}

	fs := flag.NewFlagSet("sql", flag.ContinueOnError)
	file := fs.String("f", "", "Read SQL from file")
	database := fs.String("d", "", "Override default database")
	fs.Usage = func() { printSQLUsage() }
	_ = fs.Parse(args[1:])

	var sqlText string
	if *file != "" {
		data, readErr := os.ReadFile(*file)
		if readErr != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", readErr)
			return 1
		}
		sqlText = string(data)
	} else {
		sqlText = strings.Join(fs.Args(), " ")
	}

	if sqlText == "" {
		fmt.Fprintln(os.Stderr, "Error: SQL statement is required")
		printSQLUsage()
		return 1
	}

	// Require approval
	if _, approvalErr := requireApproval(ctx, approval.ApprovalRequest{
		Type:      "sql",
		AssetID:   asset.ID,
		AssetName: asset.Name,
		Command:   sqlText,
		Detail:    fmt.Sprintf("opsctl sql %s %q", args[0], truncateStr(sqlText, 100)),
		SessionID: session,
	}); approvalErr != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", approvalErr)
		return 1
	}

	params := map[string]any{
		"asset_id": float64(asset.ID),
		"sql":      sqlText,
	}
	if *database != "" {
		params["database"] = *database
	}
	return callHandler(ctx, handlers, "exec_sql", params)
}

func cmdRedisCmd(ctx context.Context, handlers map[string]ai.ToolHandlerFunc, args []string, session string) int {
	if len(args) == 0 || args[0] == "-h" || args[0] == "--help" {
		printRedisUsage()
		if len(args) > 0 {
			return 0
		}
		return 1
	}

	asset, err := resolveAsset(ctx, args[0])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		return 1
	}

	command := strings.Join(args[1:], " ")
	if command == "" {
		fmt.Fprintln(os.Stderr, "Error: Redis command is required")
		printRedisUsage()
		return 1
	}

	// Require approval
	if _, approvalErr := requireApproval(ctx, approval.ApprovalRequest{
		Type:      "redis",
		AssetID:   asset.ID,
		AssetName: asset.Name,
		Command:   command,
		Detail:    fmt.Sprintf("opsctl redis %s %q", args[0], truncateStr(command, 100)),
		SessionID: session,
	}); approvalErr != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", approvalErr)
		return 1
	}

	return callHandler(ctx, handlers, "exec_redis", map[string]any{
		"asset_id": float64(asset.ID),
		"command":  command,
	})
}

func printSQLUsage() {
	fmt.Fprint(os.Stderr, `Usage:
  opsctl [--session <id>] sql <asset> [flags] "<SQL>"

Arguments:
  asset     Database asset name or numeric ID

Flags:
  -f <file>     Read SQL from file instead of argument
  -d <database> Override the default database for this execution

Approval:
  This command requires approval from the running desktop app.
  SQL statements are checked against the asset's query policy:
  - Allowed types (e.g. SELECT) execute without approval
  - Denied types (e.g. DROP TABLE) are rejected
  - Other statements require user confirmation

Examples:
  opsctl sql prod-db "SELECT * FROM users LIMIT 10"
  opsctl sql prod-db "INSERT INTO logs (msg) VALUES ('test')"
  opsctl sql prod-db -f migration.sql
  opsctl sql prod-db -d other_db "SHOW TABLES"
`)
}

func printRedisUsage() {
	fmt.Fprint(os.Stderr, `Usage:
  opsctl [--session <id>] redis <asset> "<command>"

Arguments:
  asset     Redis asset name or numeric ID
  command   Redis command (e.g. "GET mykey", "HGETALL user:1")

Approval:
  This command requires approval from the running desktop app.
  Commands are checked against the asset's Redis policy:
  - Dangerous commands (FLUSHDB, CONFIG SET, etc.) are rejected by default
  - Other commands require user confirmation on first use

Examples:
  opsctl redis cache "GET session:abc123"
  opsctl redis cache "HGETALL user:1"
  opsctl redis cache "SET key value EX 3600"
  opsctl redis cache "KEYS user:*"
`)
}
