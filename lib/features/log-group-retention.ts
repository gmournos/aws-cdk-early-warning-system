import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class LogGroupRetentionStack extends NestedStack {

    constructor(scope: Construct, id: string, props?: NestedStackProps) {
        super(scope, id, props);
        const defaultRetentionParam = StringParameter.valueForStringParameter(this, '/ews/cloudwatch/logs/retetion');
        const defaultRetention = parseFloat(defaultRetentionParam);
    }
}