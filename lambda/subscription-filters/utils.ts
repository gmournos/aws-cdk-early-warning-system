import { CloudWatchLogsEvent } from "aws-lambda";
import { gunzip } from 'zlib'; 
import { sendCustomizedAlert } from "../sns/utils";
import { promisify } from 'util';
import { getUrlLink } from "../log-groups/utils";

const unzipAsync = promisify(gunzip);

// code inspired by https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html#LambdaFunctionExample
export const sendCustomizedNotificationFromLogGroupSubscription = async (event: CloudWatchLogsEvent, 
    makeBodyFragmentFunc: (logRecord: string) => string, makeSubjectFunc: (logGroup: string, logStream: string) => string) => {

    console.debug('received event', event);
    const region = process.env.ACCOUNT_REGION!;
    try {
        const zippedPayload = Buffer.from(event.awslogs.data, 'base64');

        const payload = await unzipAsync(zippedPayload);
        const resultAsString = payload.toString();
        console.debug('Event Data', resultAsString);
        const resultAsJson = JSON.parse(resultAsString);
        const { logGroup, logStream } = resultAsJson;

        const subject = makeSubjectFunc(logGroup, logStream);
        let body = `Alarm details 
LogGroup Name: ${logGroup}, 
LogStream  Id: ${logStream},
LogStream URL: ${getUrlLink(region, logGroup, logStream)}.
----------------------------------------------------------------------------------------------
`; 
        for (const record of resultAsJson.logEvents) {
            const logRecord = record.message;
            const bodyFragment = makeBodyFragmentFunc(logRecord);
            body = `${body}
- ${bodyFragment}`;
        }
        await sendCustomizedAlert(subject, body);
    } catch (e) {
        console.error('Error processing log subscription event', e);
    }
};