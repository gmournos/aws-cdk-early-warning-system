import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface LogGroupErrorAlertsStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

export class LogGroupErrorAlertsStack extends NestedStack {

    constructor(scope: Construct, id: string, props: LogGroupErrorAlertsStackProps) {
        super(scope, id, props);
    }
}