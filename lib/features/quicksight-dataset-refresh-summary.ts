import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { buildLogGroupForLambda } from '../utils/cloudwatch';

export interface QsDatasetRefreshSummaryStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
}

const FUNCTION_NAME = 'qs-refresh-summary-function';

export class QsDatasetRefreshSummaryStack extends NestedStack {
    summaryEtlFunction: IFunction;
    logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: QsDatasetRefreshSummaryStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
    }
}