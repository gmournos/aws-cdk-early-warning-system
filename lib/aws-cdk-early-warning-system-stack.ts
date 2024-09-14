import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LogGroupRetentionStack } from './features/log-group-retention';

export class AwsCdkEarlyWarningSystemStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new LogGroupRetentionStack(this, 'log-group-retention-stack', props);
  }
}
