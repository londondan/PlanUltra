#!/bin/bash
# Start DynamoDB Local and create the PlanUltra table
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JAR_DIR="$SCRIPT_DIR/../local/dynamodb"

if [ ! -f "$JAR_DIR/DynamoDBLocal.jar" ]; then
  echo "DynamoDB Local JAR not found. Download it first:"
  echo "  mkdir -p local/dynamodb && curl -o local/dynamodb/dynamodb_local.tar.gz https://d1ni2b6xgvw0s0.cloudfront.net/v2.x/dynamodb_local_latest.tar.gz && tar -xzf local/dynamodb/dynamodb_local.tar.gz -C local/dynamodb && rm local/dynamodb/dynamodb_local.tar.gz"
  exit 1
fi

# Start DynamoDB Local
mkdir -p "$JAR_DIR/data"
java -Djava.library.path="$JAR_DIR/DynamoDBLocal_lib" -jar "$JAR_DIR/DynamoDBLocal.jar" -sharedDb -dbPath "$JAR_DIR/data" -port 8000 &
DYNAMO_PID=$!
echo "DynamoDB Local started (PID: $DYNAMO_PID) on port 8000"

# Wait for it to be ready
sleep 2

# Create table using Node SDK (no aws CLI needed)
node "$SCRIPT_DIR/create-local-table.mjs"

echo ""
echo "DynamoDB Local running at http://localhost:8000"
echo "Press Ctrl+C to stop"

trap "kill $DYNAMO_PID 2>/dev/null" EXIT
wait $DYNAMO_PID
