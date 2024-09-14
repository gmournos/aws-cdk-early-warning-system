import { Duration, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { buildLogGroupForLambda } from '../utils/cloudwatch';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export interface QsDatasetRefreshSummaryStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

const FUNCTION_NAME = 'qs-refresh-summary-function';

export class QsDatasetRefreshSummaryStack extends NestedStack {
    summaryQsRefreshFunction: IFunction;
    logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: QsDatasetRefreshSummaryStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
        this.summaryQsRefreshFunction = this.createSummaryQsDatasetLambdaFunction(props.accountEnvironment, props.destinationTopic);
        this.createErrorAlarmForQsDatasetRefresh();
    }

    createSummaryQsDatasetLambdaFunction(accountEnvironment: string, destinationTopic: ITopic) {

        const sendToTopicPolicy = new PolicyStatement({
            actions: [
                'sns:Publish',
            ],
            effect: Effect.ALLOW,
            resources: [
                destinationTopic.topicArn,
            ],
        });

        const quicksightPolicy = new PolicyStatement({
            actions: [
                'quicksight:ListDataSets',
                'quicksight:ListIngestions',
                'quicksight:DescribeDataSet',
            ],
            effect: Effect.ALLOW,
            resources: [ '*'],
        });

        const sendCustomizedAlertForQsRefreshSummary = new NodejsFunction(this, 'qs-dataset-summary-function', {
            functionName: FUNCTION_NAME,
            logGroup : this.logGroup,
            runtime: Runtime.NODEJS_20_X,
            handler: 'findLastHoursNoSuccessfulRun',
            entry: path.join('lambda', 'qs-datasets', 'handlers.ts'),
            timeout: Duration.seconds(10 * 60), 
            environment: {
                TOPIC_ARN : destinationTopic.topicArn,
                ACCOUNT_ENVIRONMENT: accountEnvironment.toUpperCase(),
                ACCOUNT_ID: this.account,
            },
        });

        sendCustomizedAlertForQsRefreshSummary.addToRolePolicy(sendToTopicPolicy);
        sendCustomizedAlertForQsRefreshSummary.addToRolePolicy(quicksightPolicy);

        return sendCustomizedAlertForQsRefreshSummary;
    }

    createErrorAlarmForQsDatasetRefresh() {
        // Define the EventBridge rule
        const rule = new Rule(this, 'qs-dataset-summary-rule', {
            ruleName: 'qs-dataset-summary-rule',
            schedule: Schedule.cron({ minute: '0', hour: '7', day: '*' }), 
        });
        rule.addTarget(new LambdaFunction(this.summaryQsRefreshFunction));
    }
}
