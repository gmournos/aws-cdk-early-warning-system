import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { createLogSubscriptionAlertFunction } from '../utils/cloudwatch';

export interface LogGroupErrorAlertsStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

const FUNCTION_NAME = 'alert-for-log-group-error-function';

export class LogGroupErrorAlertsStack extends NestedStack {

    constructor(scope: Construct, id: string, props: LogGroupErrorAlertsStackProps) {
        super(scope, id, props);
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