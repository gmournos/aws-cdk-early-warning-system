import { sendCustomizedAlert } from "../sns/utils";
import { getZippedFileAsLines } from "./utils";

const accountEnvironment = process.env.ACCOUNT_ENVIRONMENT;

const sendNotificationForFailedLines = async (failedLines: string[], objectKey: string) => {
    const subject = `CloudFront Error in ${objectKey}`;
    let body = `Error alarm details 
File Name: ${objectKey} 
----------------------------------------------------------------------------------------------
`; 
    for (const line of failedLines) {
        // to avoid automatic escaping by sns email destination
        // cleanup uri, host, and referer fields
        // 6: cs(Host) 7: cs-uri-stem ... 9: cs(Referer), 15: x-host-header  
        const noUrlsLine = cleanUrls(line, 6, 7, 9, 15);
        const finalCleanLine = accountEnvironment === 'PRODUCTION' ? reductIp(noUrlsLine) : noUrlsLine;
        body = `${body}
- ${finalCleanLine}`;
    }
    await sendCustomizedAlert(subject, body);
};

const cleanUrls = (line: string, ...urlPositions: number[]) => {
    let inputLine = line;
    console.debug('logging line was', line);
    const urlPatterns = [/^https?:\/\//, /^\//, /^www\./];
    const parts = line.split(/\s+/);
    for (const pos of urlPositions) {
        const uri = parts[pos];
        let newUri = uri;
        for (const urlPattern of urlPatterns) {
            newUri = newUri?.replace(urlPattern, ''); // to avoid automatic escaping by sns email destination
        }
        inputLine = uri ? inputLine.replace(uri, newUri): inputLine;
        console.debug('logging line became', inputLine);
    }
    return inputLine;
};

const reductIp = (line: string) => {
    const parts = line.split(/\s+/);
    const ip = parts[4];
    console.debug('ip is', ip);
    return line.replace(ip, '##############');
}; 

export const retrieveErrorLines = async (event: any) => {
    try {
    // Get the bucket and object key from the event
        console.debug('received event', JSON.stringify(event));
        const bucketName = event.Records[0].s3.bucket.name;
        const objectKey = event.Records[0].s3.object.key;
        const size = event.Records[0].s3.object.key;
        if (size === 0) { // folder or empty file
            console.warn(`Skipping folder or empty file ${objectKey}`);
            return;
        }
        console.info(`examining access log file ${objectKey}`);

        const lines = await getZippedFileAsLines(bucketName, objectKey);

        // log format described in https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html#access-logs-analyzing
        const filteredLines = lines.filter((line) => {
            if (line) {
                const parts = line.split(/\s+/);
                const resultType = parts[13]; // x-edge-result-type
                const isInvalidResultType = !['Hit', 'Miss', 'RefreshHit', 'Redirect'].includes(resultType);
                const detailedResultType = parts[28]; // x-edge-detailed-result-type
                const isFalsePositive = detailedResultType === 'ClientCommError'; // typically combined with sc-status=000. thrown when client cuts the connection
                return !isFalsePositive && isInvalidResultType ;
            }
            return false;
        });

        if (filteredLines.length > 2) { // the first two header lines are not an error
            await sendNotificationForFailedLines(filteredLines, objectKey);
        }

    } catch (error) {
        console.error("Error processing log file:", error);
    }
};