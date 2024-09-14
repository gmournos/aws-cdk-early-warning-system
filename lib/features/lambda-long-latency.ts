import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Alarm, ComparisonOperator, TreatMissingData, Unit } from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export type FunctionLatency = { functionName: string, maxLatencyMs: number };

export interface LambdaLongLatencyStackProps extends NestedStackProps {
    alarmPrefix: string,
    functionLatencies: FunctionLatency[]; 
}

export class LambdaLongLatencyStack extends NestedStack {

    constructor(scope: Construct, id: string, props: LambdaLongLatencyStackProps) {
        super(scope, id, props);
        for (const functionLatencyRecord of props.functionLatencies) {
            this.createLongLatencyAlarmForFunction(props?.alarmPrefix, functionLatencyRecord.functionName, functionLatencyRecord.maxLatencyMs);
        }
    }

    createLongLatencyAlarmForFunction(alarmPrefix: string, functionName: string,  maxLatencyMs: number) {

        const lambdaFn = lambda.Function.fromFunctionName(this, `long-latency-existing-${functionName}-ref`, functionName);

        // Create CloudWatch alarm
        new Alarm(this, `${alarmPrefix}-alarm-${functionName}`, {
            metric: lambdaFn.metricDuration({
                unit: Unit.MILLISECONDS,
                statistic: "max",
            }),
            threshold: maxLatencyMs,
            evaluationPeriods: 1, // Number of periods to evaluate
            comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD, // Trigger if value >= threshold
            alarmName: `${alarmPrefix}-${functionName}`, // Alarm name
            treatMissingData: TreatMissingData.NOT_BREACHING,
        });
    }
}