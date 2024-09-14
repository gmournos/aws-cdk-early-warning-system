import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export type FunctionLatency = { functionName: string, maxLatencyMs: number };

export interface LambdaLongLatencyStackProps extends NestedStackProps {
    alarmPrefix: string,
    functionLatencies: FunctionLatency[]; 
}

export class LambdaLongLatencyStack extends NestedStack {

    constructor(scope: Construct, id: string, props: LambdaLongLatencyStackProps) {
        super(scope, id, props);
    }
}