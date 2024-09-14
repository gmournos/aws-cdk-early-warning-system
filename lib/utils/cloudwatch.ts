import { Construct } from 'constructs';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

import * as path from 'path';
import { ILogGroup, LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface LogSubscriptionAlertFunctionProps {
    scope: Construct, 
    functionName: string, 
    accountEnvironment: string, 
    handler: string, 
    sourceFilePath: string[], 
    destinationTopic: ITopic,
    logGroup: ILogGroup,
}

export const createLogSubscriptionAlertFunction = (props: LogSubscriptionAlertFunctionProps) => {

    const sendToTopicPolicy = new PolicyStatement({
        actions: [
            'sns:Publish',
        ],
        effect: Effect.ALLOW,
        resources: [
            props.destinationTopic.topicArn,
        ],
    });

    const logSubscriptionAlertFunction = new NodejsFunction(props.scope, `${props.functionName}-subscription-handler`, {
        functionName: props.functionName,
        runtime: Runtime.NODEJS_20_X,
        handler: props.handler,
        entry: path.join('lambda', ...props.sourceFilePath),
        logGroup: props.logGroup,
        environment: {
            TOPIC_ARN : props.destinationTopic.topicArn,
            ACCOUNT_ENVIRONMENT: props.accountEnvironment.toUpperCase(),
            ACCOUNT_REGION: Stack.of(props.scope).region,
        },
    });

    logSubscriptionAlertFunction.addToRolePolicy(sendToTopicPolicy);

    // Define IAM policy allowing CloudWatch Logs to invoke the Lambda function
    const lambdaInvocationPolicy = {
        actions: ['lambda:InvokeFunction'],
        principal: new ServicePrincipal('logs.amazonaws.com'),
    };
    logSubscriptionAlertFunction.addPermission('allow-invocation', lambdaInvocationPolicy);

    return logSubscriptionAlertFunction;
};

export const buildLogGroupForLambda = (scope: Construct, lamdbaName: string) => {
    const logGroupName = `/aws/lambda/${lamdbaName}`;

    const logGroup = new LogGroup(scope, logGroupName, {
        logGroupName,
        retention: RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
    });

    return logGroup;
};