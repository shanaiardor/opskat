.PHONY: dev run build clean install

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    BIN_PATH := ./build/bin/ops-cat.app/Contents/MacOS/ops-cat
else ifeq ($(UNAME_S),Linux)
    BIN_PATH := ./build/bin/ops-cat
else
    BIN_PATH := ./build/bin/ops-cat.exe
endif

# 开发模式（前后端热重载）
dev:
	wails dev

# 直接运行（不热重载）
run: build
	$(BIN_PATH)

# 构建生产版本
build:
	wails build

# 安装前端依赖
install:
	cd frontend && pnpm install

# 清理构建产物
clean:
	rm -rf build/bin frontend/dist
