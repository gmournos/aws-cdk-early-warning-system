import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LogGroupRetentionStack } from './features/log-group-retention';
import { LogGroupErrorAlertsStack } from './features/log-group-error-alerts';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { sdkV2FiltersPerLogGroup } from './input/custom-log-filters';
import { GlueJobFailuresStack } from './features/glue-etl-failures';
import { GlueSummaryStack } from './features/glue-etl-summary';
import { QsDatasetRefreshSummaryStack } from './features/quicksight-dataset-refresh-summary';
import { NotificationsOnCloudwatchAlarmsStack } from './features/cloudwatch-alarms';
import { LambdaLongLatencyStack } from './features/lambda-long-latency';
import { CloudfrontErrorsStack } from './features/cloudfront-errors';

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

    new QsDatasetRefreshSummaryStack(this, 'qs-refresh-summary-stack', {
      ...props,
      destinationTopic: topic,
      accountEnvironment,
    });
    const LATENCY_ALARM_PREFIX = 'long-latency';

    new NotificationsOnCloudwatchAlarmsStack(this, 'alert-notifications-stack', {
      ...props,
      destinationTopic: topic,
      accountEnvironment,
      alarmPrefixes: [ LATENCY_ALARM_PREFIX ],
    });

    new LambdaLongLatencyStack(this, 'lambda-long-latency-stack', {
      ...props,
      alarmPrefix: LATENCY_ALARM_PREFIX,
      functionLatencies: [], // put here the functions that you want to monitor, and their max tolerable latency
    });

    const logCloudFrontBucketArn = cdk.Fn.importValue('logCloudFrontBucketRef');

    new CloudfrontErrorsStack(this, 'cf-notifications-stack', {
      ...props,
      destinationTopic: topic,
      accountEnvironment,
      logCloudFrontBucketArn, 
    });
    
  }
}
