import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { buildLogGroupForLambda } from '../utils/cloudwatch';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export interface GlueJobFailuresStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

const FUNCTION_NAME = 'etl-failure-rule-function';

export class GlueJobFailuresStack extends NestedStack {
    failedEtlFunction: IFunction;
    logGroup: ILogGroup;
    
    constructor(scope: Construct, id: string, props: GlueJobFailuresStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
        this.failedEtlFunction = this.createFailedEtlLambdaFunction(props.accountEnvironment, props.destinationTopic);
    }

    createFailedEtlLambdaFunction(accountEnvironment: string, destinationTopic: ITopic) {

        const sendToTopicPolicy = new PolicyStatement({
            actions: [
                'sns:Publish',
            ],
            effect: Effect.ALLOW,
            resources: [
                destinationTopic.topicArn,
            ],
        });

        const sendCustomizedEmailFromEtlFailedEvent = new NodejsFunction(this, 'failed-etl-function', {
            functionName: FUNCTION_NAME,
            logGroup: this.logGroup,
            runtime: Runtime.NODEJS_20_X,
            handler: 'sendCustomizedNotificationFromEtlFailedEvent',
            entry: path.join('lambda', 'glue', 'handlers.ts'),
            environment: {
                TOPIC_ARN : destinationTopic.topicArn,
                ACCOUNT_ENVIRONMENT: accountEnvironment.toUpperCase(),
            },
        });

        sendCustomizedEmailFromEtlFailedEvent.addToRolePolicy(sendToTopicPolicy);
        return sendCustomizedEmailFromEtlFailedEvent;
    }
}