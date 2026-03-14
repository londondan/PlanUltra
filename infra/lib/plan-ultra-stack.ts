import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

export class PlanUltraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Single-table DynamoDB design
    const table = new dynamodb.Table(this, 'PlanUltraTable', {
      tableName: 'PlanUltra',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // IAM role for Amplify to access DynamoDB
    const amplifyRole = new iam.Role(this, 'AmplifyServiceRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      roleName: 'PlanUltraAmplifyRole',
    })

    table.grantReadWriteData(amplifyRole)

    new cdk.CfnOutput(this, 'TableName', { value: table.tableName })
    new cdk.CfnOutput(this, 'AmplifyRoleArn', { value: amplifyRole.roleArn })
  }
}
