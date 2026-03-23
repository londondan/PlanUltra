import { NextResponse } from 'next/server'

export async function GET() {
  // Check which AWS credential env vars are present (values redacted)
  const envCheck = {
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: !!process.env.AWS_SESSION_TOKEN,
    AWS_REGION: process.env.AWS_REGION ?? '(not set)',
    AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION ?? '(not set)',
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME ?? '(not set)',
    AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV ?? '(not set)',
    // Container credential endpoint (how Lambda gets creds from execution role)
    AWS_CONTAINER_CREDENTIALS_RELATIVE_URI:
      process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI ?? '(not set)',
    AWS_CONTAINER_CREDENTIALS_FULL_URI:
      process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI ?? '(not set)',
    // App-specific
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME ?? '(not set)',
    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT ?? '(not set)',
    DYNAMODB_ACCESS_KEY_ID: !!process.env.DYNAMODB_ACCESS_KEY_ID,
    DYNAMODB_SECRET_ACCESS_KEY: !!process.env.DYNAMODB_SECRET_ACCESS_KEY,
  }

  // Try DynamoDB DescribeTable
  let tableCheck = null
  let tableError = null
  try {
    const { DynamoDBClient, DescribeTableCommand } = await import('@aws-sdk/client-dynamodb')
    const ddb = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
    const result = await ddb.send(
      new DescribeTableCommand({ TableName: process.env.DYNAMODB_TABLE_NAME ?? 'PlanUltra' })
    )
    tableCheck = {
      tableName: result.Table?.TableName,
      status: result.Table?.TableStatus,
      itemCount: result.Table?.ItemCount,
    }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    tableError = { name: err.name, message: err.message }
  }

  return NextResponse.json({ envCheck, tableCheck, tableError })
}
