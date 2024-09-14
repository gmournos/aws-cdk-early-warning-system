import { NestedStack, NestedStackProps, RemovalPolicy } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { buildLogGroupWithAlertForLambda, createLogSubscriptionAlertFunction, DEFAULT_FILTER_PATTERN } from '../utils/cloudwatch';
import { CfnAccountPolicy, ILogGroup } from 'aws-cdk-lib/aws-logs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export type ErrorLogPattern = {
    errorType: string,
    logPatternString : string;
};

export type ErrorLogPatterns = [] | [ErrorLogPattern] | [ErrorLogPattern, ErrorLogPattern]; 
// can be zero if we want no logging, is 2 at maximum, as Cloudwatch does not allow more than 2 subscription filters per log group

export interface LogGroupErrorAlertsStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
    customLogFilterPatternsPerLogGroup: Record<string, ErrorLogPatterns>; // keeps the correspondence of logGroupName to custom log patterns
}

const FUNCTION_NAME = 'alert-for-log-group-error-function';

export class LogGroupErrorAlertsStack extends NestedStack {
    logErrorSubcriptionFunction: IFunction;
    logGroup: ILogGroup;

    constructor(scope: Construct, private id: string, props: LogGroupErrorAlertsStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupWithAlertForLambda(this, FUNCTION_NAME, props.destinationTopic);

        this.logErrorSubcriptionFunction = this.createLogErrorSubcriptionFunction(props.accountEnvironment, props.destinationTopic);
        this.createGeneralSubscriptionFilter(props.customLogFilterPatternsPerLogGroup);
    }

    createGeneralSubscriptionFilter(customLogFilterPatternsPerLogGroup: Record<string, ErrorLogPatterns>) {
        const allCustomFiltersLogGroups = Object.keys(customLogFilterPatternsPerLogGroup);
        const exceptionalLogGroups = JSON.stringify([...allCustomFiltersLogGroups, this.logGroup.logGroupName]); // do not subscribe to this.logGroup.logGroupName, to avoid infinite loops

        const logsPolicy = new CfnAccountPolicy(this, `${this.id}-policy`, {
            policyDocument: JSON.stringify({
                DestinationArn: this.logErrorSubcriptionFunction.functionArn,
                FilterPattern: DEFAULT_FILTER_PATTERN,
                Distribution: 'Random',
                selectionCriteria: `LogGroupName NOT IN ${JSON.stringify(exceptionalLogGroups)}`,
            }),
            policyName: `${this.id}-policy`,
            policyType: 'SUBSCRIPTION_FILTER_POLICY',
            scope: 'ALL',
        });
        logsPolicy.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }

    createLogErrorSubcriptionFunction(accountEnvironment: string, destinationTopic: ITopic) {
        return createLogSubscriptionAlertFunction({
            scope: this,
            functionName: FUNCTION_NAME,
            accountEnvironment,
            handler: 'sendCustomizedNotificationFromErrorLogSubscription',
            sourceFilePath: ['subscription-filters', 'handlers.ts'],
            destinationTopic,
            logGroup: this.logGroup,
        });
    }
}