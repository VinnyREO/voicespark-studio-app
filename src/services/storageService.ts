import { supabase } from '@/lib/supabase';

const BUCKET_NAME = 'voicespark-projects';

// Upload file to project folder
export async function uploadFile(
  projectId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('[storageService] uploadFile called');
  console.log('[storageService]   projectId:', projectId);
  console.log('[storageService]   fileName:', file.name);
  console.log('[storageService]   fileSize:', file.size);
  console.log('[storageService]   fileType:', file.type);

  const timestamp = Date.now();
  const randomId = crypto.randomUUID().slice(0, 8);
  const fileName = `${timestamp}-${randomId}-${file.name}`;
  const filePath = `${projectId}/assets/${fileName}`;

  console.log('[storageService]   filePath:', filePath);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[storageService] ❌ Upload error:', error);
    throw error;
  }

  console.log('[storageService] ✅ Upload success:', filePath);

  if (onProgress) onProgress(100);

  return filePath;
}

// Download file from storage
export async function downloadFile(filePath: string): Promise<Blob> {
  console.log('[storageService] downloadFile called');
  console.log('[storageService]   filePath:', filePath);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filePath);

  if (error) {
    console.error('[storageService] ❌ Download error:', error);
    console.error('[storageService]   Error details:', JSON.stringify(error, null, 2));
    throw error;
  }

  if (!data) {
    console.error('[storageService] ❌ No data returned from download');
    throw new Error('No data returned from download');
  }

  console.log('[storageService] ✅ Download success');
  console.log('[storageService]   blobSize:', data.size);
  console.log('[storageService]   blobType:', data.type);

  return data;
}

// Get public URL for file
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// Delete file
export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) throw error;
}

// List files in project folder
export async function listProjectFiles(projectId: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${projectId}/assets`);

  if (error) throw error;
  return data.map(file => `${projectId}/assets/${file.name}`);
}
