import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serverT, serverTf, getUserLocale } from "@/lib/i18n/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const locale = await getUserLocale(user.id);

  const samples = [
    { type: "welcome", message: serverT("notif_welcome", locale) },
    { type: "achievement", message: serverT("notif_milestone_10", locale) },
    { type: "achievement", message: serverTf("notif_first_in_room", locale, { room: "Atrium" }) },
    { type: "family_invite", message: serverTf("notif_family_joined", locale, { name: "Sofia" }), from_user_name: "Sofia" },
    { type: "new_contribution", message: serverTf("notif_contribution", locale, { name: "Marcus", room: "Living Room" }), from_user_name: "Marcus" },
    { type: "on_this_day", message: serverTf("notif_on_this_day", locale, { years: "3", title: "Grandpa's 80th birthday" }) },
    { type: "reminder", message: serverT("notif_reminder", locale) },
    { type: "system", message: serverT("notif_system", locale) },
    { type: "palace_visit", message: serverTf("notif_palace_visit", locale, { name: "Elena" }), from_user_name: "Elena" },
    { type: "palace_visit", message: serverTf("notif_palace_visit", locale, { name: "Marco" }), from_user_name: "Marco" },
    { type: "palace_visit", message: serverTf("notif_palace_visit", locale, { name: "Ana" }), from_user_name: "Ana" },
    { type: "comment_reply", message: serverTf("notif_comment", locale, { name: "Sofia", target: "room" }), from_user_name: "Sofia" },
    { type: "reaction", message: serverTf("notif_reaction", locale, { name: "Marco", target: "wing" }), from_user_name: "Marco" },
    { type: "new_follower", message: serverTf("notif_new_follower", locale, { name: "Elena" }), from_user_name: "Elena" },
    { type: "followed_published", message: serverTf("notif_followed_published", locale, { name: "Ana" }), from_user_name: "Ana" },
  ];

  let inserted = 0;
  let error: string | undefined;

  for (const s of samples) {
    const { error: err } = await supabase.from("notifications").insert({
      user_id: user.id,
      type: s.type,
      message: s.message,
      from_user_name: s.from_user_name || null,
      read: false,
    });
    if (err) {
      if (!error) error = err.message;
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ ok: true, inserted, total: samples.length, error });
}
