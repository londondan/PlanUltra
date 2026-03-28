import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, TABLE_NAME } from '@/lib/db'

export interface UserRecord {
  userId: string
  email: string
  createdAt: string
}

export async function createOrUpdateUser(userId: string, email: string): Promise<void> {
  const now = new Date().toISOString()
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'USER',
      },
      // Preserve original createdAt on repeat sign-ins; always update email.
      UpdateExpression: 'SET email = :email, createdAt = if_not_exists(createdAt, :now)',
      ExpressionAttributeValues: {
        ':email': email,
        ':now': now,
      },
    })
  )
}

export async function getAllUsers(): Promise<UserRecord[]> {
  // TODO: add a GSI on SK when user count grows beyond ~1k to avoid full-table scans.
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: { ':sk': 'USER' },
      ProjectionExpression: 'userId, email, createdAt',
    })
  )

  const users = (result.Items ?? []) as UserRecord[]
  return users.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
