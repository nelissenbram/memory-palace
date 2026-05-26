import { Metadata } from "next";
import PasscodeEntry from "@/components/social/PasscodeEntry";

export const metadata: Metadata = {
  title: "Enter Passcode — The Memory Palace",
  description: "Enter a passcode to visit a shared Memory Palace wing or room.",
};

export default function PasscodePage() {
  return <PasscodeEntry />;
}
