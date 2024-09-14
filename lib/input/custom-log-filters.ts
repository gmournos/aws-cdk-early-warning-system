import { ErrorLogPatterns } from "../features/log-group-error-alerts";

const sdkV2LogPatterns: ErrorLogPatterns = [{
    "errorType": "error",
    "logPatternString": 'ERROR -"NOTE: We are formalizing our plans to enter AWS SDK for JavaScript (v2) into maintenance mode in 2023"',
}, {
    "errorType": "system-error",
    "logPatternString": '?"Task timed out after" ?Runtime.ExitError ?Exception',
}];


const sdkv2LogGroups = [] as string[]; // put your specific log groups here

export const sdkV2FiltersPerLogGroup = sdkv2LogGroups.reduce((acc, logGroupName) => {
    acc[logGroupName] = sdkV2LogPatterns;
    return acc;
}, {} as Record<string, ErrorLogPatterns>);