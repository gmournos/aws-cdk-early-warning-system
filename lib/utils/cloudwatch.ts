import { Construct } from 'constructs';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

import * as path from 'path';
import { ILogGroup, LogGroup, MetricFilter, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';

export const DEFAULT_FILTER_PATTERN = '?Runtime.ExitError ?"Task timed out after" ?"ERROR" ?Exception'; // system error, e.g. out of memory error, lambda timeout, or just error,

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

export const buildLogGroupWithAlertForLambda = (scope: Construct, lamdbaName: string, topic: ITopic) => {
    const logGroup = buildLogGroupForLambda(scope, lamdbaName);
    const alarm = createErrorAlarmForLogGroup(scope, lamdbaName, 'internal-ews-error', DEFAULT_FILTER_PATTERN, logGroup, 'AwsCdkEarlyWarningSystemStack');
    alarm.addAlarmAction(new SnsAction(topic));
    return logGroup;
};

export const createErrorAlarmForLogGroup = (scope: Construct, id: string, errorType: string, logPatternString: string, logGroup: ILogGroup, stackName: string) => {

    // Define a filter pattern to search for ERROR in the logs
    const filterPattern = {
        logPatternString,
    };

    // Create a metric filter
    const metricFilter = new MetricFilter(scope, `${errorType}-mf-${id}`, {
        logGroup,
        metricNamespace: 'EWSError',
        metricName: `${errorType}-${stackName}-${id}`,
        filterPattern,
    });

    // Create a CloudWatch alarm
    const alarm = new Alarm(scope, `${errorType}-alarm-${id}`, {
        alarmName: `${errorType}-alarm-${stackName}-${id}`,
        metric: metricFilter.metric(),
        threshold: 1, // Raise an alarm if there is at least one occurrence of an error
        evaluationPeriods: 1,
        comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    return alarm;
};

export const stripLogGroupName = (logGroupName : string) => logGroupName.replace('/aws/lambda/', '');