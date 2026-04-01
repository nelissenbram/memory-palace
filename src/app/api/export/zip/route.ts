import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/auth/export-actions";
import JSZip from "jszip";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { r2Download, isR2Configured } from "@/lib/storage/r2";

export const maxDuration = 60;

const BATCH_SIZE = 5;
const MAX_EXPORT_FILES = 2000;
const TIMEOUT_THRESHOLD_MS = 50_000; // bail before 60s Vercel limit
const PER_FILE_TIMEOUT_MS = 10_000; // 10s per individual file download

export async function GET() {
  const startTime = Date.now();
  const diag: string[] = [];
  try {
    diag.push("start");
    const supabase = await createClient();
    diag.push("client");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    diag.push(`auth:${user ? "ok" : authError?.message || "no_user"}`);

    if (authError || !user) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED", ...(process.env.NODE_ENV === "development" ? { diag } : {}) },
        { status: 401 }
      );
    }

    const rl = await rateLimit(`export-zip:${user.id}`, 3, 3_600_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }

    const result = await exportUserData(supabase, user.id);
    diag.push(`export:${"error" in result ? result.error : "ok"}`);

    if ("error" in result) {
      return NextResponse.json({ error: result.error, ...(process.env.NODE_ENV === "development" ? { diag } : {}) }, { status: 500 });
    }

    diag.push(`files:${result.data.storage_files.length}`);

    const zip = new JSZip();

    // Add data.json with safe serialization
    const json = JSON.stringify(
      result.data,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    );
    zip.file("data.json", json);
    diag.push("json_added");

    // Build a map of file_path → storage_backend from memories data
    const fileBackendMap = new Map<string, string>();
    if (result.data.memories) {
      for (const mem of result.data.memories as Record<string, unknown>[]) {
        if (mem.file_path) {
          fileBackendMap.set(mem.file_path as string, (mem.storage_backend as string) || "supabase");
        }
      }
    }

    // Download photos from storage in batches (avoid OOM)
    const photosFolder = zip.folder("photos");
    const files = result.data.storage_files.slice(0, MAX_EXPORT_FILES);
    const failedFiles: string[] = [];
    let truncated = false;
    let filesProcessed = 0;
    const useR2 = isR2Configured();

    if (photosFolder && files.length > 0) {
      const usedNames = new Set<string>();

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= TIMEOUT_THRESHOLD_MS) {
          truncated = true;
          diag.push(`timeout_at_batch:${i}`);
          break;
        }

        const batch = files.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (filePath) => {
            try {
              const backend = fileBackendMap.get(filePath) || "supabase";
              let buffer: ArrayBuffer;

              if (backend === "r2" && useR2) {
                try {
                  const { data: stream } = await r2Download("memories", filePath);
                  const response = new Response(stream);
                  buffer = await response.arrayBuffer();
                } catch {
                  failedFiles.push(filePath);
                  return;
                }
              } else {
                const timeoutId = setTimeout(() => {}, PER_FILE_TIMEOUT_MS);
                try {
                  const { data, error } = await supabase.storage
                    .from("memories")
                    .download(filePath);
                  clearTimeout(timeoutId);
                  if (error || !data) {
                    failedFiles.push(filePath);
                    return;
                  }
                  buffer = await data.arrayBuffer();
                } catch (innerErr) {
                  clearTimeout(timeoutId);
                  failedFiles.push(filePath);
                  return;
                }
              }

              let fileName = filePath.split("/").pop() || filePath;
              if (usedNames.has(fileName)) {
                const ext = fileName.includes(".")
                  ? "." + fileName.split(".").pop()
                  : "";
                const base = fileName.replace(/\.[^.]+$/, "");
                let counter = 2;
                while (usedNames.has(`${base}_${counter}${ext}`)) counter++;
                fileName = `${base}_${counter}${ext}`;
              }
              usedNames.add(fileName);

              photosFolder.file(fileName, buffer);
              filesProcessed++;
            } catch {
              failedFiles.push(filePath);
            }
          })
        );
      }
    }

    diag.push(`photos:${filesProcessed}ok_${failedFiles.length}fail${truncated ? "_truncated" : ""}`);

    // Download bust files from storage (R2 first, then Supabase fallback)
    const bustsFolder = zip.folder("busts");
    if (bustsFolder) {
      try {
        // Collect bust files from both backends
        const bustFilePaths: { path: string; name: string }[] = [];

        // Try R2 first
        if (useR2) {
          try {
            const { r2List } = await import("@/lib/storage/r2");
            const r2Busts = await r2List("busts", `${user.id}/`);
            for (const f of r2Busts) {
              bustFilePaths.push({ path: f.name, name: f.name.split("/").pop() || f.name });
            }
          } catch { /* R2 list failed, fall through to Supabase */ }
        }

        // Also check Supabase Storage for legacy busts (always, not just when R2 is empty)
        {
          const r2Paths = new Set(bustFilePaths.map((f) => f.name));
          const { data: bustFileList } = await supabase.storage
            .from("busts")
            .list(user.id);
          if (bustFileList) {
            for (const f of bustFileList) {
              if (!r2Paths.has(f.name)) {
                bustFilePaths.push({ path: `${user.id}/${f.name}`, name: f.name });
              }
            }
          }
        }

        if (bustFilePaths.length > 0) {
          const bustFiles = bustFilePaths.slice(0, MAX_EXPORT_FILES);
          const bustUsedNames = new Set<string>();
          let bustsProcessed = 0;
          const failedBusts: string[] = [];

          for (let i = 0; i < bustFiles.length; i += BATCH_SIZE) {
            const elapsed = Date.now() - startTime;
            if (elapsed >= TIMEOUT_THRESHOLD_MS) {
              truncated = true;
              diag.push(`bust_timeout_at_batch:${i}`);
              break;
            }

            const batch = bustFiles.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(
              batch.map(async ({ path: filePath, name }) => {
                try {
                  let buffer: ArrayBuffer;

                  // Try R2 first, fall back to Supabase
                  if (useR2) {
                    try {
                      const { data: stream } = await r2Download("busts", filePath);
                      const response = new Response(stream);
                      buffer = await response.arrayBuffer();
                    } catch {
                      // Fall back to Supabase
                      const { data, error } = await supabase.storage.from("busts").download(filePath);
                      if (error || !data) { failedBusts.push(filePath); return; }
                      buffer = await data.arrayBuffer();
                    }
                  } else {
                    const { data, error } = await supabase.storage.from("busts").download(filePath);
                    if (error || !data) { failedBusts.push(filePath); return; }
                    buffer = await data.arrayBuffer();
                  }

                  let fileName = name;
                  if (bustUsedNames.has(fileName)) {
                    const ext = fileName.includes(".")
                      ? "." + fileName.split(".").pop()
                      : "";
                    const base = fileName.replace(/\.[^.]+$/, "");
                    let counter = 2;
                    while (bustUsedNames.has(`${base}_${counter}${ext}`)) counter++;
                    fileName = `${base}_${counter}${ext}`;
                  }
                  bustUsedNames.add(fileName);

                  bustsFolder.file(fileName, buffer);
                  bustsProcessed++;
                } catch {
                  failedBusts.push(filePath);
                }
              })
            );
          }
          diag.push(`busts:${bustsProcessed}ok_${failedBusts.length}fail`);
        } else {
          diag.push("busts:0");
        }
      } catch {
        diag.push("busts:error");
      }
    }

    // If truncated, add a notice file to the zip
    if (truncated) {
      const remaining = files.length - filesProcessed - failedFiles.length;
      zip.file(
        "EXPORT_TRUNCATED.txt",
        `This export was truncated due to server time limits.\n\n` +
        `Files included: ${filesProcessed}\n` +
        `Files failed: ${failedFiles.length}\n` +
        `Files not attempted: ${remaining}\n\n` +
        `To get a complete export, try again or use the JSON export option ` +
        `which includes all data without photos.`
      );
    }

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    diag.push(`zip:${zipBuffer.byteLength}bytes`);

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").split("T");
    const filename = `memory-palace-export-${dateStr[0]}_${dateStr[1].slice(0, 8)}.zip`;

    const headers: Record<string, string> = {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipBuffer.byteLength),
      "Cache-Control": "no-store",
    };

    if (failedFiles.length > 0) {
      headers["X-Export-Failed-Files"] = String(failedFiles.length);
    }
    if (truncated) {
      headers["X-Export-Truncated"] = "true";
      headers["X-Export-Files-Included"] = String(filesProcessed);
    }

    return new NextResponse(zipBuffer, { status: 200, headers });
  } catch (err) {
    diag.push(`ERROR:${err instanceof Error ? err.message : String(err)}`);
    console.error("ZIP export error:", err, "diag:", diag);
    return NextResponse.json(
      { error: "ZIP_EXPORT_FAILED", ...(process.env.NODE_ENV === "development" ? { diag } : {}) },
      { status: 500 }
    );
  }
}
