import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
})

const existing = await client.send(new ListTablesCommand({}))
if (existing.TableNames?.includes('PlanUltra')) {
  console.log('Table "PlanUltra" already exists.')
  process.exit(0)
}

await client.send(new CreateTableCommand({
  TableName: 'PlanUltra',
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
  ],
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' },
  ],
  BillingMode: 'PAY_PER_REQUEST',
}))

console.log('Table "PlanUltra" created.')
