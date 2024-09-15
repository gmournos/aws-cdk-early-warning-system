import { Fn, NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { FilterPattern, ILogGroup, LogGroup } from 'aws-cdk-lib/aws-logs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { buildLogGroupForLambda, createLogSubscriptionAlertFunction } from '../utils/cloudwatch';
import { LambdaDestination } from 'aws-cdk-lib/aws-logs-destinations';

const FUNCTION_NAME = 'api-gw-failed-rule-function';

interface ApiGatewayNotificationsStackProps extends NestedStackProps {
    destinationTopic: ITopic;
    accountEnvironment: string;
    accessLogsArnRefs: string[];
}

export class ApiGatewayNotificationsStack extends NestedStack {
    private sendCustomizedNotificationFunction: IFunction;
    private logGroup: ILogGroup;

    constructor(scope: Construct, id: string, props: ApiGatewayNotificationsStackProps) {
        super(scope, id, props);
        this.logGroup = buildLogGroupForLambda(this, FUNCTION_NAME);
        this.sendCustomizedNotificationFunction = this.createApiGatewayFailLambdaFunction(props.accountEnvironment, props.destinationTopic);
        props.accessLogsArnRefs.forEach(logGroupRef => this.createAlertOnErrorStatusesForLogGroup(logGroupRef));
    }

    createApiGatewayFailLambdaFunction(accountEnvironment: string, destinationTopic: ITopic) {
        return createLogSubscriptionAlertFunction({
            scope: this,
            functionName: FUNCTION_NAME,
            logGroup: this.logGroup,
            accountEnvironment,
            handler: 'sendCustomizedNotificationFromApiGatewaySubscription',
            sourceFilePath: ['apigw', 'handlers.ts'],
            destinationTopic,
        });
    }
    
    createAlertOnErrorStatusesForLogGroup(logGroupArnRef: string) {
        const logGroup = LogGroup.fromLogGroupArn(this, `lg-${logGroupArnRef}`, Fn.importValue(logGroupArnRef));

        logGroup.addSubscriptionFilter(`${logGroupArnRef}-api-gw-subscription`, {
            filterName: `${logGroupArnRef}-api-gw-error-status-filter`,
            destination: new LambdaDestination(this.sendCustomizedNotificationFunction),
            // listed at https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html
            filterPattern: FilterPattern.anyTerm(
                'ACCESS_DENIED', 
                'API_CONFIGURATION_ERROR',
                'AUTHORIZER_CONFIGURATION_ERROR',
                'AUTHORIZER_FAILURE', 
                'BAD_REQUEST_PARAMETERS',
                'BAD_REQUEST_BODY',
                'INTEGRATION_FAILURE', 
                'INTEGRATION_TIMEOUT',
                'INVALID_API_KEY',
                'INTEGRATION_FAILURE', 
                'INTEGRATION_TIMEOUT',
                'INVALID_API_KEY',
                'INVALID_SIGNATURE',
                'MISSING_AUTHENTICATION_TOKEN',
                'QUOTA_EXCEEDED',
                'REQUEST_TOO_LARGE',
                'RESOURCE_NOT_FOUND',
                'THROTTLED', 
                'UNAUTHORIZED',
                'UNSUPPORTED_MEDIA_TYPE',
                'WAF_FILTERED',
                'DEFAULT_4XX',
                'DEFAULT_5XX',
            ), 
        });
    }
}