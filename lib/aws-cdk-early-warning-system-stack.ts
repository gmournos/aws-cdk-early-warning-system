import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LogGroupRetentionStack } from './features/log-group-retention';
import { LogGroupErrorAlertsStack } from './features/log-group-error-alerts';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { sdkV2FiltersPerLogGroup } from './input/custom-log-filters';
import { GlueJobFailuresStack } from './features/glue-etl-failures';
import { GlueSummaryStack } from './features/glue-etl-summary';

export class AwsCdkEarlyWarningSystemStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const topic = new Topic(this, 'alerts-topic', {
      topicName : 'EarlyWarningSystemAlerts',
    });
    const accountEnvironment = this.node.tryGetContext('accountEnvironment');
    
    new LogGroupRetentionStack(this, 'log-group-retention-stack', props);
    new LogGroupErrorAlertsStack(this, 'log-group-error-alerts-stack', {
      ...props,
      destinationTopic: topic,
      accountEnvironment,
      customLogFilterPatternsPerLogGroup: sdkV2FiltersPerLogGroup,
    });

    new GlueJobFailuresStack(this, 'etl-failure-stack', {
      ...props,
      destinationTopic: topic,
      accountEnvironment,
    });

    new GlueSummaryStack(this, 'etl-summary-stack', {
      ...props,
      destinationTopic: topic,
      accountEnvironment,
    });
    
  }
}
