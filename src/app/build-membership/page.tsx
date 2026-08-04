import { redirect } from "next/navigation";

// The builder now lives on the unified Membership page.
export default function BuildMembershipRedirect() {
  redirect("/membership");
}
