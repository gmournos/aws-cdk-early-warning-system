import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LogGroupRetentionStack } from './features/log-group-retention';
import { LogGroupErrorAlertsStack } from './features/log-group-error-alerts';

export class AwsCdkEarlyWarningSystemStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    new LogGroupRetentionStack(this, 'log-group-retention-stack', props);
    new LogGroupErrorAlertsStack(this, 'log-group-error-alerts-stack', props);

  }
}
