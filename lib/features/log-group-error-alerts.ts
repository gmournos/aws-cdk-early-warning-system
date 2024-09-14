import { NestedStack, NestedStackProps, RemovalPolicy } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { createLogSubscriptionAlertFunction } from '../utils/cloudwatch';
import { CfnAccountPolicy } from 'aws-cdk-lib/aws-logs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export interface LogGroupErrorAlertsStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

const FUNCTION_NAME = 'alert-for-log-group-error-function';

export class LogGroupErrorAlertsStack extends NestedStack {
    logErrorSubcriptionFunction: IFunction;

    constructor(scope: Construct, private id: string, props: LogGroupErrorAlertsStackProps) {
        super(scope, id, props);

        this.logErrorSubcriptionFunction = this.createLogErrorSubcriptionFunction(props.accountEnvironment, props.destinationTopic);
        this.createGeneralSubscriptionFilter();
    }

    createGeneralSubscriptionFilter() {
        const logsPolicy = new CfnAccountPolicy(this, `${this.id}-policy`, {
            policyDocument: JSON.stringify({
                DestinationArn: this.logErrorSubcriptionFunction.functionArn,
                FilterPattern: '?Runtime.ExitError ?"Task timed out after" ?"ERROR" ?Exception', // system error, e.g. out of memory error, lambda timeout, or just error,
                Distribution: 'Random',
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
        });
    }
}