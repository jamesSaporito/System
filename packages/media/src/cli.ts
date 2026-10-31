#!/usr/bin/env node
/**
 * Syncs the portfolio's photos between its local, gitignored `media/` folder and the `media/`
 * prefix of its S3 bucket, which CloudFront serves at https://<domain>/media/.
 *
 *   portfolio-media push   upload new or changed local files
 *   portfolio-media pull   download files missing (or different) locally
 *
 * Run from the app folder (apps/portfolio). Defaults to the local s3mock.
 * Env: S3_ENDPOINT (set it empty to use real AWS), MEDIA_BUCKET (default: the folder's name),
 * plus the usual AWS_PROFILE / AWS_REGION / credentials for AWS.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const PREFIX = "media/";
// Photos are replaced in place under the same name, so cache for a day rather than forever.
const CACHE_CONTROL = "public, max-age=86400";
const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

type FileInfo = { size: number; md5: string | null };

const command = process.argv[2];
if (command !== "push" && command !== "pull") {
  console.error("Usage: portfolio-media <push|pull> (run from apps/portfolio)");
  process.exit(1);
}

const appDir = process.cwd();
const localRoot = path.join(appDir, "media");
const bucket = process.env.MEDIA_BUCKET || path.basename(appDir);
const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9090";

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  ...(endpoint
    ? // s3mock ignores credentials but the SDK requires some.
      {
        endpoint,
        forcePathStyle: true,
        credentials: { accessKeyId: "local", secretAccessKey: "local" },
      }
    : {}),
});

const target = `${endpoint || "aws"} s3://${bucket}/${PREFIX}`;
const [local, remote] = await Promise.all([listLocal(), listRemote()]);
let changed = 0;

if (command === "push") {
  for (const [key, file] of local) {
    const existing = remote.get(key);
    if (existing?.size === file.size && existing.md5 === file.md5) continue;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: PREFIX + key,
        Body: await readFile(path.join(localRoot, key)),
        ContentType: CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream",
        CacheControl: CACHE_CONTROL,
      }),
    );
    console.log(`  ↑ ${key}`);
    changed++;
  }
  console.log(`Pushed ${changed} of ${local.size} files to ${target}`);
} else {
  for (const [key, file] of remote) {
    const existing = local.get(key);
    // Multipart uploads have non-MD5 ETags (md5 null); fall back to comparing sizes.
    if (existing?.size === file.size && (file.md5 === null || existing.md5 === file.md5)) continue;
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: PREFIX + key }));
    const destination = path.join(localRoot, key);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, await object.Body!.transformToByteArray());
    console.log(`  ↓ ${key}`);
    changed++;
  }
  console.log(`Pulled ${changed} of ${remote.size} files from ${target}`);
}

/** Files under the local media folder, keyed by their path relative to it (POSIX separators). */
async function listLocal(): Promise<Map<string, FileInfo>> {
  const files = new Map<string, FileInfo>();
  let entries;
  try {
    entries = await readdir(localRoot, { recursive: true, withFileTypes: true });
  } catch {
    return files; // No media folder yet.
  }
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const absolute = path.join(entry.parentPath, entry.name);
    const content = await readFile(absolute);
    files.set(path.relative(localRoot, absolute).split(path.sep).join("/"), {
      size: content.length,
      md5: createHash("md5").update(content).digest("hex"),
    });
  }
  return files;
}

async function listRemote(): Promise<Map<string, FileInfo>> {
  const files = new Map<string, FileInfo>();
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }),
    );
    for (const object of page.Contents ?? []) {
      if (!object.Key || object.Key.endsWith("/")) continue;
      const etag = object.ETag?.replaceAll('"', "") ?? "";
      files.set(object.Key.slice(PREFIX.length), {
        size: object.Size ?? 0,
        md5: /^[0-9a-f]{32}$/.test(etag) ? etag : null,
      });
    }
    token = page.NextContinuationToken;
  } while (token);
  return files;
}
