import { QuickSightClient, ListDataSetsCommand, Ingestion, ListIngestionsCommand, ListDataSetsCommandOutput, ListIngestionsCommandOutput, DataSetSummary } from "@aws-sdk/client-quicksight";
import { DateTime } from "luxon";
import { withThrottlingRety } from "../backoff/utils";

const client = new QuickSightClient();

const _getAllQsDatasetsInternal = async () => {
    let datasets: DataSetSummary[] = [];
    let nextToken: string | undefined;

    do {
        const response: ListDataSetsCommandOutput = await client.send(new ListDataSetsCommand({
            AwsAccountId: process.env.ACCOUNT_ID,
            NextToken: nextToken,
        }));
        if (response.DataSetSummaries) {
            datasets = datasets.concat(response.DataSetSummaries);
        }
        nextToken = response.NextToken;
    } while (nextToken);

    return datasets;
};

export const getAllQsDatasets = async () => {
    return withThrottlingRety(_getAllQsDatasetsInternal);
};

export const getLastHoursIngestions = async (datasetId: string, hours: number) => {
    return withThrottlingRety(_getLastHoursIngesionsWithPagingInternal, datasetId, hours);
};

const filterLastHours = (injestions: Ingestion[], hours: number) => {
    // Get the current timestamp and the timestamp hoursBack hours ago
    const now = DateTime.utc();
    const someHoursAgo = now.minus({ hours });

    return injestions.filter(ingestion => {
        const runTime = DateTime.fromJSDate(ingestion.CreatedTime!);
        return runTime > someHoursAgo;
    });
};

const _getLastHoursIngesionsWithPagingInternal = async (datasetId: string, hours: number) => {
    let ingestions: Ingestion[] = [];
    let nextToken: string | undefined;

    do {
        const response: ListIngestionsCommandOutput = await client.send(new ListIngestionsCommand({
            AwsAccountId: process.env.ACCOUNT_ID,
            DataSetId: datasetId,
            NextToken: nextToken,
        }));
        const latestInjestions = filterLastHours(response.Ingestions || [], hours);

        ingestions = ingestions.concat(latestInjestions);
        nextToken = response.NextToken;
    } while (nextToken);

    return ingestions;
};
