"use server";

import { createClient } from "@/lib/supabase/server";

export async function enrollMFA() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Memory Palace Authenticator",
  });

  if (error) {
    return { error: error.message };
  }

  return {
    factorId: data.id,
    qrUri: data.totp.uri,
    secret: data.totp.secret,
  };
}

export async function verifyMFA(factorId: string, code: string) {
  const supabase = await createClient();

  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    return { error: challengeError.message };
  }

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}

export async function unenrollMFA(factorId: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function listMFAFactors() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    return { error: error.message };
  }

  return {
    totp: data.totp ?? [],
    phone: data.phone ?? [],
  };
}

export async function createMFAChallenge(factorId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.challenge({ factorId });

  if (error) {
    return { error: error.message };
  }

  return { challengeId: data.id };
}

export async function verifyMFAChallenge(
  factorId: string,
  challengeId: string,
  code: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, data };
}
