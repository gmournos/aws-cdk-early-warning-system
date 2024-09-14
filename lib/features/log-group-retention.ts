import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';

export class LogGroupRetentionStack extends NestedStack {

    constructor(scope: Construct, id: string, props?: NestedStackProps) {
        super(scope, id, props);
        const defaultRetentionParam = StringParameter.valueForStringParameter(this, '/ews/cloudwatch/logs/retetion');
        const defaultRetention = parseInt(defaultRetentionParam); // validation to make sure it is an integer

        const setLogPolicy = new PolicyStatement({
            actions: [
                'logs:PutRetentionPolicy',  
            ],
            effect: Effect.ALLOW,
            resources: [
                '*',
            ],
        });

        const setDefaultRetentionLambda = new NodejsFunction(this, `set-default-retention-function`, {
            functionName: 'set-default-log-retention-from-rule',
            runtime: Runtime.NODEJS_20_X,
            handler: 'setDefaultRetentionFromRule',
            entry: path.join('lambda', 'log-groups', 'handlers.ts'),
            environment: {
                RETENTION_IN_DAYS : defaultRetentionParam,
            },
        });

        setDefaultRetentionLambda.addToRolePolicy(setLogPolicy);
    }
}