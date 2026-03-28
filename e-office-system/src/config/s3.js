import { S3Client } from "@aws-sdk/client-s3";
import "dotenv/config";

const endpointHost = process.env.MINIO_ENDPOINT || "localhost";
const endpointPort = process.env.MINIO_PORT || "9000";
const useSSL =
  String(process.env.MINIO_USE_SSL || "false").toLowerCase() === "true";
const protocol = useSSL ? "https" : "http";

// If you need a fully custom endpoint (e.g. behind a reverse proxy), set MINIO_S3_ENDPOINT.
const endpoint =
  process.env.MINIO_S3_ENDPOINT ||
  `${protocol}://${endpointHost}:${endpointPort}`;

export const s3Client = new S3Client({
  region: process.env.MINIO_REGION || "us-east-1",
  endpoint,
  forcePathStyle: true, // Required for most MinIO setups
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  },
});
