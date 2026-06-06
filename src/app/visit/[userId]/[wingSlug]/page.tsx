import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ userId: string; wingSlug: string }>;
}

/** Wing subpage no longer exists — redirect to palace overview */
export default async function WingRedirect({ params }: Props) {
  const { userId } = await params;
  redirect(`/visit/${userId}`);
}
