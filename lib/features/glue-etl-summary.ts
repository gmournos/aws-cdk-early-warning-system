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

export interface GlueSummaryStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

const FUNCTION_NAME = 'etl-summary-function';

export class GlueSummaryStack extends NestedStack {
    summaryEtlFunction: IFunction;
    logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: GlueSummaryStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
        this.summaryEtlFunction = this.createSummaryEtlLambdaFunction(props.accountEnvironment, props.destinationTopic);
        this.createEtlRule();
    }

    createSummaryEtlLambdaFunction(accountEnvironment: string, destinationTopic: ITopic) {

        const sendToTopicPolicy = new PolicyStatement({
            actions: [
                'sns:Publish',
            ],
            effect: Effect.ALLOW,
            resources: [
                destinationTopic.topicArn,
            ],
        });

        const gluePolicy = new PolicyStatement({
            actions: [
                'glue:GetJobs',
                'glue:GetJobRuns',
            ],
            effect: Effect.ALLOW,
            resources: [ '*'],
        });

        const sendCustomizedNotificationForEtlSummary = new NodejsFunction(this, 'etl-summary-function', {
            functionName: FUNCTION_NAME,
            logGroup : this.logGroup,
            runtime: Runtime.NODEJS_20_X,
            handler: 'findLastHoursNoSuccessfulRun',
            entry: path.join('lambda', 'glue', 'handlers.ts'),
            timeout: Duration.seconds(120), 
            environment: {
                TOPIC_ARN : destinationTopic.topicArn,
                ACCOUNT_ENVIRONMENT: accountEnvironment.toUpperCase(),
            },
        });

        sendCustomizedNotificationForEtlSummary.addToRolePolicy(sendToTopicPolicy);
        sendCustomizedNotificationForEtlSummary.addToRolePolicy(gluePolicy);
        return sendCustomizedNotificationForEtlSummary;
    }

    createEtlRule() {
        // Define the EventBridge rule
        const rule = new Rule(this, 'etl-summary-rule', {
            ruleName: 'etl-summary-rule',
            schedule: Schedule.cron({ minute: '0', hour: '7', day: '*' }), // in the morning
        });
        rule.addTarget(new LambdaFunction(this.summaryEtlFunction));
    }

}