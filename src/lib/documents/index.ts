import { createAdminClient } from "@/lib/supabase/admin";

const DOC_BUCKET = "sensitive-documents";
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const DEFAULT_RETENTION_DAYS = 90;

export function isValidDocumentType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

export function isValidDocumentSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_SIZE;
}

/**
 * Uploads a sensitive document to the private bucket and records it with
 * a retention/expiry date. Only accessible via signed URLs.
 */
export async function uploadDocument(input: {
  accountId: string;
  agentId: string;
  leadId?: string | null;
  contactId?: string | null;
  docType: string;
  file: Buffer | ArrayBuffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  retentionDays?: number;
}): Promise<{ id?: string; error?: string }> {
  const supabase = createAdminClient();

  if (!isValidDocumentType(input.mimeType)) {
    return { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` };
  }
  if (!isValidDocumentSize(input.sizeBytes)) {
    return { error: `File too large. Maximum: ${MAX_SIZE / 1024 / 1024}MB` };
  }

  const ext = input.fileName.split(".").pop() || "bin";
  const path = `${input.accountId}/${input.leadId || input.contactId || "general"}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(DOC_BUCKET)
    .upload(path, input.file as any, {
      contentType: input.mimeType,
    });

  if (uploadError) return { error: uploadError.message };

  const retentionDays = input.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const expiresAt = new Date(Date.now() + retentionDays * 86400000).toISOString();

  const { data, error } = await supabase
    .from("documents" as any)
    .insert({
      account_id: input.accountId,
      lead_id: input.leadId ?? null,
      contact_id: input.contactId ?? null,
      doc_type: input.docType,
      storage_path: path,
      display_name: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      retention_days: retentionDays,
      expires_at: expiresAt,
      created_by: input.agentId,
    })
    .select()
    .single();

  if (error || !data) return { error: error?.message };

  const { data: signed } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(path, 600);

  return { id: data.id };
}

/**
 * Generates a short-lived signed URL for a document, enforcing expiry.
 */
export async function getDocumentSignedUrl(documentId: string) {
  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("documents" as any)
    .select("*")
    .eq("id", documentId)
    .is("deleted_at", null)
    .single();

  if (!doc) return null;
  if (doc.expires_at && new Date(doc.expires_at).getTime() < Date.now()) {
    return { expired: true };
  }

  const { data: signed } = await supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(doc.storage_path, 600);

  return { url: signed?.signedUrl, document: doc };
}

/**
 * Deletes a document (soft-delete + removes from storage).
 */
export async function deleteDocument(documentId: string) {
  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("documents" as any)
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (doc) {
    await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path]);
  }

  return await supabase
    .from("documents" as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId);
}

export async function listDocuments(input: {
  accountId: string;
  leadId?: string;
}) {
  const supabase = createAdminClient();
  let query: any = supabase
    .from("documents" as any)
    .select("*")
    .eq("account_id", input.accountId)
    .is("deleted_at", null);
  if (input.leadId) query = query.eq("lead_id", input.leadId);
  return await query.order("created_at", { ascending: false });
}
