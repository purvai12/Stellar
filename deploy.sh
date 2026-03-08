#!/bin/bash
set -e

echo "Building contracts..."
cd contract/savings_tracker
cargo build --target wasm32-unknown-unknown --release

echo "Deploying Reward Token..."
TOKEN_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/reward_token.wasm \
  --source admin \
  --network testnet)
echo "Reward Token deployed at: $TOKEN_ID"

echo "Initializing Reward Token..."
soroban contract invoke \
  --id $TOKEN_ID \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin admin

echo "Deploying Savings Tracker..."
TRACKER_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source admin \
  --network testnet)
echo "Savings Tracker deployed at: $TRACKER_ID"

echo "Linking Savings Tracker to Reward Token..."
soroban contract invoke \
  --id $TRACKER_ID \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --token_addr $TOKEN_ID

echo "Contracts successfully deployed and linked!"
