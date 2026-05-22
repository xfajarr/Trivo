.PHONY: build test clean deploy deploy-arc

# Build
build:
	forge build

# Test
test:
	forge test -vvv

test-gas:
	forge test -vvv --gas-report

# Clean
clean:
	forge clean

# Deploy to Arc testnet
deploy-arc:
	forge script script/Deploy.s.sol:Deploy --rpc-url arc --broadcast -vvv

# Verify on Arcscan
verify-arc:
	forge script script/Deploy.s.sol:Deploy --rpc-url arc --verify --broadcast -vvv
