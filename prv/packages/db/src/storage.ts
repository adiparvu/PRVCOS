import { createClient } from "@supabase/supabase-js"

// Storage buckets — created via Supabase dashboard or bootstrap script
export const StorageBucket = {
  DOCUMENTS: "documents",
  IMAGES: "images",
  AVATARS: "avatars",
  EXPORTS: "exports",
  TEMP: "temp",
} as const

export type StorageBucket = (typeof StorageBucket)[keyof typeof StorageBucket]

// Max file sizes per bucket (bytes)
export const BucketMaxSize = {
  [StorageBucket.DOCUMENTS]: 524_288_000, // 500 MB
  [StorageBucket.IMAGES]: 52_428_800, // 50 MB
  [StorageBucket.AVATARS]: 5_242_880, // 5 MB
  [StorageBucket.EXPORTS]: 104_857_600, // 100 MB
  [StorageBucket.TEMP]: 52_428_800, // 50 MB
} as const

// Allowed MIME types per bucket
export const BucketAllowedMimes = {
  [StorageBucket.DOCUMENTS]: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],
  [StorageBucket.IMAGES]: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  [StorageBucket.AVATARS]: ["image/jpeg", "image/png", "image/webp"],
  [StorageBucket.EXPORTS]: ["application/pdf", "text/csv", "application/zip"],
  [StorageBucket.TEMP]: ["*"],
} as const

let _storageClient: ReturnType<typeof createClient> | null = null

function getStorageClient() {
  if (!_storageClient) {
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]

    if (!url || !serviceKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    }

    _storageClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    })
  }
  return _storageClient
}

// File path convention: {bucket}/{company_id}/{entity_type}/{entity_id}/{filename}
export function buildStoragePath(
  companyId: string,
  entityType: string,
  entityId: string,
  filename: string
): string {
  return `${companyId}/${entityType}/${entityId}/${filename}`
}

export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3_600
): Promise<string> {
  const client = getStorageClient()
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds)

  if (error) throw new Error(`Storage signed URL error: ${error.message}`)
  return data.signedUrl
}

export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const client = getStorageClient()
  const { error } = await client.storage.from(bucket).remove([path])
  if (error) throw new Error(`Storage delete error: ${error.message}`)
}
