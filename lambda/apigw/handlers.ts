import { CloudWatchLogsEvent } from "aws-lambda";
import { sendCustomizedNotificationFromLogGroupSubscription } from "../subscription-filters/utils";

interface ParsedLog {
    ip: string;
    datetime: string;
    httpMethod: string;
    uri: string;
    status: string;
}

const processApiGatewayAccessLogRecord = (logRecord: string): ParsedLog => {
    // CLF Format extended with the addition of $context.error.responseType and $context.error.message
    // $context.identity.sourceIp $context.identity.caller $context.identity.user [$context.requestTime]"$context.httpMethod $context.resourcePath $context.protocol" $context.status $context.responseLength $context.requestId $context.extendedRequestId $context.error.responseType "$context.error.message"
    // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html#http-api-enable-logging.examples 

    const regex = /^(\S+)\s+[^[]+\[([^\]]+)]\s+"(\S+)\s+(\S+)\s+\S+"\s+(\d{3})/;

    const match = logRecord.match(regex);

    if (match) {
        const ip = match[1];
        const datetime = match[2];
        const httpMethod = match[3];
        const uri = match[4];
        const status = match[5];

        return { ip, datetime, httpMethod, uri, status };
    } else {
        console.error(`Error parsing access log record ${logRecord}`);
        throw new Error(`Error parsing access log record ${logRecord}`);
    }
};

const stripLogGroupName = (logGroupName: string) => logGroupName.replace('/aws/lambda/', '');


export const sendCustomizedNotificationFromApiGatewaySubscription = async (event: CloudWatchLogsEvent) => {
    console.info('sending notification for failure appearing api gateway access log');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const makeSubjectFunc = (logGroup: string, _: string) => `API GW failure for ${stripLogGroupName(logGroup)}`;

    const makeBodyFragmentFunc = (logRecord: string) => {
        console.debug('Processing error line', logRecord);
        const { ip, datetime, httpMethod, uri, status} = processApiGatewayAccessLogRecord(logRecord);
        const accountEnvironment = process.env.ACCOUNT_ENVIRONMENT;

        const reductedLogRecord = accountEnvironment === 'PRODUCTION' ? logRecord.replace(ip, '#########') : logRecord;
        return `Api Gateway returned ${status} when accessing method ${httpMethod} on path ${uri} at ${datetime}
             ${reductedLogRecord}`; 
    };

    await sendCustomizedNotificationFromLogGroupSubscription(event, makeBodyFragmentFunc, makeSubjectFunc);
};