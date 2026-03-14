#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { PlanUltraStack } from '../lib/plan-ultra-stack'

const app = new cdk.App()
new PlanUltraStack(app, 'PlanUltraStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
})
