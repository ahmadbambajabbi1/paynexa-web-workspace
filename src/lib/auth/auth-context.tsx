"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STORAGE_ACCESS_TOKEN } from "@/src/config/constants";
import * as userApi from "@/src/lib/api/users";
import type { MeUser } from "@/src/lib/api/types";
import { isProfileComplete } from "@/src/lib/auth/profile";

type AuthContextValue = {
  token: string | null;
  user: MeUser | null;
  loading: boolean;
  /** True when profile is finished and email is verified (dashboard-ready). */
  profileReady: boolean;
  /** Store gateway session after phone + PIN steps. */
  applySessionToken: (accessToken: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  submitProfileDetails: (input: {
    displayName: string;
    fullName: string;
    email: string;
  }) => Promise<userApi.CompleteProfileResponse>;
  verifyEmailCode: (code: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    const t = window.localStorage.getItem(STORAGE_ACCESS_TOKEN);
    setToken(t);
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await userApi.fetchMe(t);
      setUser(me.user);
    } catch {
      window.localStorage.removeItem(STORAGE_ACCESS_TOKEN);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const applySessionToken = useCallback(async (accessToken: string) => {
    window.localStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken);
    setToken(accessToken);
    const me = await userApi.fetchMe(accessToken);
    setUser(me.user);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_ACCESS_TOKEN);
    setToken(null);
    setUser(null);
  }, []);

  const submitProfileDetails = useCallback(
    async (input: {
      displayName: string;
      fullName: string;
      email: string;
    }) => {
      const t = window.localStorage.getItem(STORAGE_ACCESS_TOKEN);
      if (!t) {
        throw new Error("Not signed in");
      }
      const res = await userApi.completeProfile(t, input);
      const me = await userApi.fetchMe(t);
      setUser(me.user);
      return res;
    },
    [],
  );

  const verifyEmailCode = useCallback(async (code: string) => {
    const t = window.localStorage.getItem(STORAGE_ACCESS_TOKEN);
    if (!t) {
      throw new Error("Not signed in");
    }
    await userApi.verifyProfileEmail(t, { code });
    const me = await userApi.fetchMe(t);
    setUser(me.user);
  }, []);

  const resendEmailVerification = useCallback(async () => {
    const t = window.localStorage.getItem(STORAGE_ACCESS_TOKEN);
    if (!t) {
      throw new Error("Not signed in");
    }
    await userApi.resendProfileEmailVerification(t);
  }, []);

  const profileReady = useMemo(
    () => isProfileComplete(user),
    [user],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      profileReady,
      applySessionToken,
      logout,
      refreshUser,
      submitProfileDetails,
      verifyEmailCode,
      resendEmailVerification,
    }),
    [
      token,
      user,
      loading,
      profileReady,
      applySessionToken,
      logout,
      refreshUser,
      submitProfileDetails,
      verifyEmailCode,
      resendEmailVerification,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
