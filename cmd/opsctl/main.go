package main

import (
	"os"

	"github.com/opskat/opskat/cmd/opsctl/cmd"
)

func main() {
	os.Exit(cmd.Execute())
}
