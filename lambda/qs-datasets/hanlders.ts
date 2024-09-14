import { IngestionStatus, Ingestion } from "@aws-sdk/client-quicksight";
import { sendCustomizedAlert } from "../sns/utils";
import { getAllQsDatasets, getLastHoursIngestions } from "./utils";

const HOURS = 12;

const sendSummaryNotification = async (notRefreshedDatasets: string[], failedIngestions: IngestionData[], skippedIngestions: IngestionData[], failingInspection: string[]) => {
    const subject = 'QS Ingestion summary';

    let body = 
`QS Ingestion summary
=====================
Not run in the last ${HOURS} hours: ${notRefreshedDatasets.join(', ')}
`;
    if (failedIngestions.length > 0) {
        body = `${body}
Failed (at least once) in the last ${HOURS} hours:
`;        
    }
    for (const failed of failedIngestions) {
        body = `${body}
    ${failed.dump()}\n`;    
    }
    if (skippedIngestions.length > 0) {
        body = `${body}
Having skipped rows in the last ${HOURS} hours:
`;        
    }
    for (const skipped of skippedIngestions) {
        body = `${body}
    ${skipped.dump()}\n`;    
    }

    if (failingInspection.length > 0) {
        body = `${body}
Failed inspection in the last ${HOURS} hours: ${failingInspection.join(', ')}`; 
    }
    await sendCustomizedAlert(subject, body);
};

class IngestionData {
    errorMessage? : string;
    droppedRows?: number;
    totalRows?: number; 
    status?: string;
    datasetName: string;

    constructor(datasetName: string, ingestion: Ingestion) {
        this.datasetName = datasetName;
        if (ingestion?.ErrorInfo?.Message || ingestion?.ErrorInfo?.Type) {
            this.errorMessage = `${ingestion?.ErrorInfo?.Message}-${ingestion?.ErrorInfo?.Type}`;
        }
        this.droppedRows = ingestion.RowInfo?.RowsDropped ?? 0;
        this.totalRows = ingestion.RowInfo?.TotalRowsInDataset;
        this.status = ingestion.IngestionStatus;
        return this;
    }

    dump() {
        return `dataset: ${this.datasetName}, status: ${this.status}, dropped: ${this.droppedRows}, error:${this.errorMessage}`;
    }
}

const representsSuccessfulIngestion = (data: IngestionData) => {
    return data.status === IngestionStatus.COMPLETED && data.droppedRows === 0 && data.errorMessage === undefined;
};

export const findLastHoursNoSuccessfulRun = async () => {
    const notRefreshedDatasets = [];
    const failedRefreshDatasets: IngestionData[] = [];
    const otherRefreshDatasets: IngestionData[] = [];
    const failingInspection: string[] = [];

    try {
        const allDatasets = await getAllQsDatasets();
        for (const dataset of allDatasets) {
            console.debug('Checking ingestions of dataset:', dataset.Name);
            let ingestions: Ingestion[] = [];
            try {
                ingestions = await getLastHoursIngestions(dataset.DataSetId!, HOURS);
            } catch (e) {
                console.error(`Failed getting ingestions for dataset ${dataset.Name}` , e);
                failingInspection.push(dataset.Name!);
                continue;
            }
            if (ingestions.length === 0) {
                console.debug(`Found non refreshed dataset ${dataset.Name}`);
                notRefreshedDatasets.push(dataset.Name!);
                continue;
            }

            for (const ingestion of ingestions) {
                const ingestionData = new IngestionData(dataset.Name!, ingestion);
                if (representsSuccessfulIngestion(ingestionData)) {
                    continue;
                } else {
                    const reportTarget = ingestionData.status === IngestionStatus.FAILED ? 
                        failedRefreshDatasets : otherRefreshDatasets;
                    reportTarget.push(ingestionData);
                    console.debug(`Found problematic/erroneous ingestion for dataset ${dataset.Name!} as:`, ingestionData);
                    break;
                }
            }
        }

        if (failedRefreshDatasets.length > 0 || notRefreshedDatasets.length > 0 || otherRefreshDatasets.length > 0 || failingInspection.length > 0) {
            await sendSummaryNotification(notRefreshedDatasets, failedRefreshDatasets, otherRefreshDatasets, failingInspection);
            console.debug(`Not refreshed in the last ${HOURS} hours`, notRefreshedDatasets);
            console.debug(`Failed in the last ${HOURS} hours`, failedRefreshDatasets);
            console.debug(`Skipped rows in the last ${HOURS} hours`, otherRefreshDatasets);
        } else {
            console.info(`All dataset refreshes ran successfully in the last ${HOURS} hours`);
        }
    } catch (e) {
        console.error('Error building dataset ingestion summary', e);
        throw e;
    }
};