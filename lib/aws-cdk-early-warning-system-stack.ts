import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LogGroupRetentionStack } from './features/log-group-retention';
import { LogGroupErrorAlertsStack } from './features/log-group-error-alerts';
import { Topic } from 'aws-cdk-lib/aws-sns';

export class AwsCdkEarlyWarningSystemStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const topic = new Topic(this, 'alerts-topic', {
      topicName : 'EarlyWarningSystemAlerts',
    });
    
    new LogGroupRetentionStack(this, 'log-group-retention-stack', props);
    new LogGroupErrorAlertsStack(this, 'log-group-error-alerts-stack', {
      ...props,
      destinationTopic: topic
    });

  }
}
