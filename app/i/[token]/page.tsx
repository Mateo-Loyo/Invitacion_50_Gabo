import "./invitation.css";
import InvitationClient from "./InvitationClient";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InvitationClient token={token} />;
}

