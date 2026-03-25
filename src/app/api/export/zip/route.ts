import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/auth/export-actions";
import JSZip from "jszip";

export async function GET() {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await exportUserData();

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const zip = new JSZip();

    // Add data.json
    zip.file("data.json", JSON.stringify(result.data, null, 2));

    // Download photos from Supabase Storage and add to zip
    const photosFolder = zip.folder("photos");
    if (photosFolder && result.data.storage_files.length > 0) {
      const downloadResults = await Promise.allSettled(
        result.data.storage_files.map(async (filePath) => {
          try {
            const { data, error } = await supabase.storage
              .from("memories")
              .download(filePath);

            if (error || !data) {
              console.warn(`Could not download file: ${filePath}`, error);
              return;
            }

            // Use the filename from the path (e.g. "userId/12345.jpg" -> "12345.jpg")
            const fileName = filePath.split("/").pop() || filePath;
            const buffer = await data.arrayBuffer();
            photosFolder.file(fileName, buffer);
          } catch (err) {
            console.warn(`Failed to download file: ${filePath}`, err);
          }
        })
      );

      // Log any failures for debugging
      const failures = downloadResults.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        console.warn(`${failures.length} file(s) could not be downloaded`);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `memory-palace-export-${dateStr}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("ZIP export error:", err);
    return NextResponse.json(
      { error: "Failed to create ZIP export" },
      { status: 500 }
    );
  }
}
