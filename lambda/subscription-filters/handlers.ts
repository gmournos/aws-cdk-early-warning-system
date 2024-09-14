import { CloudWatchLogsEvent } from "aws-lambda";
import { sendCustomizedNotificationFromLogGroupSubscription } from "./utils";

const stripLogGroupName = (logGroupName : string) => logGroupName.replace('/aws/lambda/', '');

export const sendCustomizedNotificationFromErrorLogSubscription = async (event: CloudWatchLogsEvent) => {
    console.info('sending notification for failure appearing in Log group');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const makeSubjectFunc = (logGroup: string, _: string) => `Error Alarm for ${stripLogGroupName(logGroup)}`;

    const makeBodyFragmentFunc = (logRecord: string) => {
        const accountEnvironment = process.env.ACCOUNT_ENVIRONMENT;

        const shortMessage = `Error in logs at ${logRecord.substring(0, Math.min(logRecord.length, 60))}...`; 
        return accountEnvironment === 'PRODUCTION' ? shortMessage : logRecord; 
    };

    await sendCustomizedNotificationFromLogGroupSubscription(event, makeBodyFragmentFunc, makeSubjectFunc);
};