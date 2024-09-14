import { EventBridgeEvent } from "aws-lambda";
import { sendCustomizedAlert } from "../sns/utils";

export const sendCustomizedNotificationFromEtlFailedEvent = async (event: EventBridgeEvent<string, any>) => {
    console.debug('received event', event);
    const { time } = event;
    const { jobName, message } = event.detail;
    console.info(`sending alert for failed job ${jobName}`);

    const subject = `ETL ${jobName} failure`;
    const body = `Etl ${jobName} failed at ${time}
    Reason: ${message}    
`;
    console.info(`sending notification for failed job ${jobName}`);
    await sendCustomizedAlert(subject, body);
};