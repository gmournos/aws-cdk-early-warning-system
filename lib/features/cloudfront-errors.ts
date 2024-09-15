import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { ILogGroup } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { buildLogGroupForLambda } from '../utils/cloudwatch';

export interface CloudfrontErrorsStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
    logCloudFrontBucketArn: string;
}

const FUNCTION_NAME = 'cf-access-log-processor-function';

export class CloudfrontErrorsStack extends NestedStack {
    logGroup: ILogGroup;
    cfAccessLogProcessor: NodejsFunction;
    accessLogsBucket: IBucket;

    constructor(scope: Construct, id: string, props: CloudfrontErrorsStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
        this.accessLogsBucket = Bucket.fromBucketArn(this, 'cf-access-log-bucket-ref', props.logCloudFrontBucketArn);

    }

}