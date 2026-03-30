import { NextResponse } from "next/server";

/**
 * Apple Photos does not offer a direct REST API like Google Photos.
 * This endpoint returns guidance for users on how to export from Apple Photos.
 *
 * Options for importing from Apple Photos:
 * 1. Export photos from the Photos app on Mac/iPhone, then use the local file upload
 * 2. Use iCloud.com to download photos, then upload via the Mass Import panel
 * 3. Use Apple's CloudKit JS (requires Apple Developer account and entitlements)
 *
 * For now, we provide instructions to guide users through the manual export process.
 */
export async function GET() {
  return NextResponse.json({
    provider: "apple_photos",
    supported: false,
    message: "Apple Photos does not provide a direct web API for browsing your photo library.",
    instructions: {
      mac: [
        "Open the Photos app on your Mac.",
        "Select the photos you would like to import.",
        "Go to File > Export > Export Unmodified Originals.",
        "Save them to a folder on your computer.",
        "Return to Memory Palace and use the Mass Import panel to upload the exported photos.",
      ],
      iphone: [
        "Open the Photos app on your iPhone.",
        "Tap 'Select' and choose the photos you want.",
        "Tap the Share button and choose 'Save to Files'.",
        "Save them to iCloud Drive or another accessible location.",
        "On your computer, open Memory Palace and use Mass Import to upload those files.",
      ],
      icloud: [
        "Visit icloud.com/photos in your web browser.",
        "Sign in with your Apple ID.",
        "Select the photos you want to import.",
        "Click the download button to save them to your computer.",
        "Return to Memory Palace and use the Mass Import panel to upload.",
      ],
    },
  }, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
