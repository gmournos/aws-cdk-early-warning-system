import { GlueClient, GetJobsCommand, GetJobRunsCommand, JobRun, GetJobRunsCommandInput } from "@aws-sdk/client-glue";
import { DateTime } from "luxon";
import { withThrottlingRety } from "../backoff/utils";

const glueClient = new GlueClient();

const _getAllEtlJobsInternal = async () => {
// Get the list of Glue jobs
    const getJobsCommand = new GetJobsCommand({});
    const { Jobs } = await glueClient.send(getJobsCommand);
    return Jobs || [];
};
const filterLastHours = (jobRuns: JobRun[], hours: number) => {
    // Get the current timestamp and the timestamp hoursBack hours ago
    const now = DateTime.utc();
    const someHoursAgo = now.minus({ hours });

    return jobRuns.filter(jobRun => {
        const runTime = DateTime.fromJSDate(jobRun.StartedOn!);
        return runTime > someHoursAgo;
    });
};

const _getLastHoursJobRunsInternal = async (jobName: string, hours: number) => {
    const jobRuns: JobRun[] = [];
    let nextToken: string | undefined;

    do {
        const getJobRunsParams : GetJobRunsCommandInput = {
            JobName: jobName,
            MaxResults: 25,
            NextToken: nextToken,
        };

        const getJobRunsCommand = new GetJobRunsCommand(getJobRunsParams);
        const { JobRuns, NextToken } = await glueClient.send(getJobRunsCommand);
        const latestJobRuns = filterLastHours(JobRuns || [], hours);

        jobRuns.push(...latestJobRuns);
        nextToken = NextToken;
    } while (nextToken);

    return jobRuns;
};

export const getAllEtlJobs = async () => {
    return withThrottlingRety(_getAllEtlJobsInternal);
};

export const getJobRunsLastHours = async (jobName: string, hours: number) => {
    return withThrottlingRety(_getLastHoursJobRunsInternal, jobName, hours);
};

