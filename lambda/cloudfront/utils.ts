import { Readable } from "stream";
import { gunzipSync } from "zlib";
import { GetObjectCommand, S3Client, _Object } from "@aws-sdk/client-s3";
import { StreamingBlobPayloadOutputTypes } from "@smithy/types";

const s3 = new S3Client();

const getS3FileAsStream = async (bucket: string, key: string): Promise<StreamingBlobPayloadOutputTypes | undefined> => {
    const {Body} = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    }));

    return Body;
}

export const getZippedFileAsLines = async (bucketName: string, objectKey: string) => {
    const Body = await getS3FileAsStream(bucketName, objectKey);

    // Convert the Body to a Buffer and then unzip
    const streamToBuffer = (stream: Readable): Promise<Buffer> =>
        new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks)));
        });

    const gzippedContent = await streamToBuffer(Body as Readable);
    const uncompressedContent = gunzipSync(gzippedContent).toString("utf-8");

    return uncompressedContent.split("\n");
};