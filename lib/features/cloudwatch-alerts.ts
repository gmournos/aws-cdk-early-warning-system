import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { buildLogGroupForLambda } from '../utils/cloudwatch';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export interface NotificationsOnAlertsStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
    alarmPrefixes: string[];
}

const FUNCTION_NAME = 'custom-notifications-on-alerts-function';

export class NotificationsOnAlertsStack extends NestedStack {
    customNotificationsOnAlerts: IFunction;
    logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: NotificationsOnAlertsStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
        this.customNotificationsOnAlerts = this.createLambdaFunction(props.accountEnvironment, props.destinationTopic);
        this.createRuleForAlarm(props.alarmPrefixes);
    }

    createLambdaFunction(accountEnvironment: string, destinationTopic: ITopic) {

        const sendToTopicPolicy = new PolicyStatement({
            actions: [
                'sns:Publish',
            ],
            effect: Effect.ALLOW,
            resources: [
                destinationTopic.topicArn,
            ],
        });

        const sendCustomizedNotificationFromAlarm = new NodejsFunction(this, 'send-customized-event-from-alarm-function', {
            functionName: FUNCTION_NAME,
            logGroup: this.logGroup,
            runtime: Runtime.NODEJS_20_X,
            handler: 'sendCustomizedNotificationFromAlarm',
            entry: path.join('lambda', 'alerts', 'handlers.ts'),
            environment: {
                TOPIC_ARN : destinationTopic.topicArn,
                ACCOUNT_ENVIRONMENT: accountEnvironment.toUpperCase(),
            },
        });

        sendCustomizedNotificationFromAlarm.addToRolePolicy(sendToTopicPolicy);
        return sendCustomizedNotificationFromAlarm;
    }

    createRuleForAlarm(alarmPrefixes: string[] | undefined) {
        const detail: any = {
            state: {
                value: ['ALARM'],
            },
        };
        if (alarmPrefixes && alarmPrefixes.length > 0) {
            const prefixArray : { prefix: string}[] = [];
            for (const prefix of alarmPrefixes) {
                prefixArray.push({ 
                    prefix,
                });
            }
            detail.alarmName = prefixArray;
        }

        new Rule(this, 'send-customized-notification-from-alarm-rule', {
            ruleName: 'send-customized-notification-from-alarm-rule',
            description: 'Send customized notifications containing the env in the subject',
            eventPattern: {
                detailType: ['CloudWatch Alarm State Change'],
                source: ['aws.cloudwatch'],
                detail,
            },

            targets: [ new LambdaFunction(this.customNotificationsOnAlerts) ],
        });

    }


}