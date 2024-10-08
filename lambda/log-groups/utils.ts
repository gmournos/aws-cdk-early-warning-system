import { CloudWatchLogsClient, PutRetentionPolicyCommand } from '@aws-sdk/client-cloudwatch-logs';

const cloudwatchlogs = new CloudWatchLogsClient();

export const setLogRetention = async (logGroupName: string, retentionDays: number) => {
    // Parameters to set the retention policy for the log group
    const params = {
        logGroupName,
        retentionInDays: retentionDays,
    };

    // Call AWS SDK to set the log retention policy
    const command = new PutRetentionPolicyCommand(params);
    console.debug(`Setting log retention policy for log group '${logGroupName}' to ${retentionDays} days...`);
    const response = await cloudwatchlogs.send(command);
    console.debug('Received:', response);
    if (response.$metadata.httpStatusCode !== 200) {
        throw new Error(`Error setting log retention policy for logGroup '${logGroupName}' to ${retentionDays} days.`);
    }
    console.info(`Log retention policy set for log group '${logGroupName}' to ${retentionDays} days.`);
    return response;
};

const awsEncode = (text: string) => encodeURIComponent(encodeURIComponent(text)).replace(/%/g, '$');

export const getUrlLink = (region: string, logGroupName: string, logStreamName: string) => {
    return `${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${awsEncode(logGroupName)}/log-events/${awsEncode(logStreamName)}`;
};