import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT
    ? { endpoint: process.env.DYNAMODB_ENDPOINT, credentials: { accessKeyId: 'local', secretAccessKey: 'local' } }
    : process.env.DYNAMODB_ACCESS_KEY_ID
      ? { credentials: { accessKeyId: process.env.DYNAMODB_ACCESS_KEY_ID, secretAccessKey: process.env.DYNAMODB_SECRET_ACCESS_KEY! } }
      : {}),
})

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
})

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'PlanUltra'
