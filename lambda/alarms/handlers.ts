import { EventBridgeEvent } from "aws-lambda";
import { sendCustomizedAlert } from "../sns/utils";

export const sendCustomizedNotificationFromAlarm = async (event: EventBridgeEvent<string, any>) => {
    console.debug('received event', event);
    const alarmName = event.detail?.alarmName as string;

    const timestamp = event.detail?.state?.timestamp;
    const reason = event.detail?.state?.reason;

    const subject = `${alarmName} raised`;
    const body = `Alarm ${alarmName} was raised at ${timestamp}
    ${reason}`;

    await sendCustomizedAlert(subject, body);
};