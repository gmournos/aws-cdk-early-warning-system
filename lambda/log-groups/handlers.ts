import { EventBridgeEvent } from 'aws-lambda';
import { setLogRetention } from './utils';

export const setDefaultRetentionFromRule = async (event: EventBridgeEvent<string, any>) => {
    console.debug('Received event', event);

    const logGroupName = event?.detail?.requestParameters?.logGroupName;
    const retentionDays = process.env.RETENTION_IN_DAYS!;

    try {
        console.info(`Setting log retention for exceptional log group '${logGroupName}' to ${retentionDays}`);
        setLogRetention(logGroupName, parseInt(retentionDays));
    } catch (error) {
        console.error('Error setting log retention policy:', error);
        throw error;
    }
};
