import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/auth/export-actions";
import JSZip from "jszip";

const BATCH_SIZE = 5;
const MAX_EXPORT_FILES = 2000;

export async function GET() {
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
        { error: "NOT_AUTHENTICATED", diag },
        { status: 401 }
      );
    }

    const result = await exportUserData(supabase, user.id);
    diag.push(`export:${"error" in result ? result.error : "ok"}`);

    if ("error" in result) {
      return NextResponse.json({ error: result.error, diag }, { status: 500 });
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

    // Download photos from Supabase Storage in batches (avoid OOM)
    const photosFolder = zip.folder("photos");
    const files = result.data.storage_files.slice(0, MAX_EXPORT_FILES);
    const failedFiles: string[] = [];

    if (photosFolder && files.length > 0) {
      const usedNames = new Set<string>();

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (filePath) => {
            try {
              const { data, error } = await supabase.storage
                .from("memories")
                .download(filePath);

              if (error || !data) {
                failedFiles.push(filePath);
                return;
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

              const buffer = await data.arrayBuffer();
              photosFolder.file(fileName, buffer);
            } catch {
              failedFiles.push(filePath);
            }
          })
        );
      }
    }

    diag.push(`photos:${files.length - failedFiles.length}ok_${failedFiles.length}fail`);

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

    return new NextResponse(zipBuffer, { status: 200, headers });
  } catch (err) {
    diag.push(`ERROR:${err instanceof Error ? err.message : String(err)}`);
    console.error("ZIP export error:", err, "diag:", diag);
    return NextResponse.json(
      { error: "ZIP_EXPORT_FAILED", diag },
      { status: 500 }
    );
  }
}
