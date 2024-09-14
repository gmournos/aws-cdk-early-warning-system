import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { buildLogGroupForLambda } from '../utils/cloudwatch';

export interface GlueSummaryStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

const FUNCTION_NAME = 'etl-summary-function';

export class GlueSummaryStack extends NestedStack {
    failedEtlFunction: IFunction;
    logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: GlueSummaryStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
    }
}