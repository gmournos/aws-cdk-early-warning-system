import { EventBridgeEvent } from "aws-lambda";
import { sendCustomizedAlert } from "../sns/utils";
import { getAllEtlJobs, getJobRunsLastHours } from "./utils";
import { JobRunState } from "@aws-sdk/client-glue";

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

const HOURS = 12;

const sendSummaryNotification = async (nonRunJobs: string[], failedJobs: string[]) => {
    const subject = 'ETL summary';

    const body = 
`ETL jobs summary
================
Not run in the last ${HOURS} hours: ${nonRunJobs.join(', ')}
Failed (at least once) in the last ${HOURS} hours: ${failedJobs.join(', ')}
`;

    await sendCustomizedAlert(subject, body);
};

const JOBS_TO_SKIP: string[] = []; // put the jobs that you want to skip from examination here

export const findLastHoursNoSuccessfulRun = async () => {
    const nonRunJobs = [];
    const failedJobs = [];

    try {
        const allJobs = await getAllEtlJobs();
        for (const job of allJobs) {
            if (JOBS_TO_SKIP.includes(job.Name!)) {
                continue;
            }
            console.debug('looking up runs of job', job);
            const jobRuns = await getJobRunsLastHours(job.Name!, HOURS);
            if (jobRuns.length === 0) {
                nonRunJobs.push(job.Name!);
                continue;
            }

            for (const jobRun of jobRuns) {
                if (jobRun.JobRunState === JobRunState.FAILED) {
                    failedJobs.push(job.Name!);
                    break;
                }
            }
        }
        console.info(`Not run in the last ${HOURS} hours`, nonRunJobs.join(', '));
        console.info(`Failed at least once in the last ${HOURS} hours`, failedJobs.join(', '));

        if (failedJobs.length > 0 || nonRunJobs.length > 0) {
            await sendSummaryNotification(nonRunJobs, failedJobs);
        } else {
            console.info(`All etl jobs ran successfully in the last ${HOURS} hours`);
        }
    } catch (e) {
        console.error('Error building etl jobs summary', e);
        throw e;
    }
};