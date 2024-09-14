import { Construct } from 'constructs';
import { Stack } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

import * as path from 'path';

export interface LogSubscriptionAlertFunctionProps {
    scope: Construct, 
    functionName: string, 
    accountEnvironment: string, 
    handler: string, 
    sourceFile: string, 
    destinationTopic: ITopic,
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
        entry: path.join('lambda', props.sourceFile),
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