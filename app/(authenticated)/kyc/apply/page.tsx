"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/src/components/auth/RequireAuth";
import { cardPanel, fieldInput, fieldLabel } from "@/src/components/ui/form-classes";
import { useAuth } from "@/src/lib/auth/auth-context";
import { canApplyProfessionalKyc } from "@/src/lib/auth/profile";
import * as kycApi from "@/src/lib/api/kyc";
import { errorMessage } from "@/src/lib/api/errors";

type RoleChoice = "LAWYER" | "AGENT" | null;

export default function KycApplyPage() {
  return (
    <RequireAuth requireProfileComplete>
      <KycApplyInner />
    </RequireAuth>
  );
}

function KycApplyInner() {
  const searchParams = useSearchParams();
  const { token, user, refreshUser } = useAuth();
  const initialRoleParam = searchParams.get("role");
  const initialRole: RoleChoice =
    initialRoleParam === "LAWYER" || initialRoleParam === "AGENT" ? initialRoleParam : null;
  const [role, setRole] = useState<RoleChoice>(initialRole);
  const [step, setStep] = useState<number>(initialRole ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [lawyerBar, setLawyerBar] = useState("");
  const [lawyerBody, setLawyerBody] = useState("");
  const [lawyerFirm, setLawyerFirm] = useState("");
  const [lawyerYears, setLawyerYears] = useState("");

  const [agentId, setAgentId] = useState("");
  const [agentLicense, setAgentLicense] = useState("");
  const [agentEmployer, setAgentEmployer] = useState("");

  const [fGovId, setFGovId] = useState<File | null>(null);
  const [fCert, setFCert] = useState<File | null>(null);
  const [fExtra, setFExtra] = useState<File | null>(null);
  const [fSelfie, setFSelfie] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canLawyer = user ? canApplyProfessionalKyc(user, "LAWYER") : false;
  const canAgent = user ? canApplyProfessionalKyc(user, "AGENT") : false;
  const canApplyAny = canLawyer || canAgent;

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (step !== 2 && streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
      setCameraOpen(false);
    }
  }, [step]);

  async function openCamera() {
    try {
      setCameraBusy(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraSupported(true);
      setErr(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraSupported(false);
      setErr("Camera is required for selfie capture on this step.");
    } finally {
      setCameraBusy(false);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  async function captureSelfie() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );
    if (!blob) {
      setErr("Unable to capture selfie. Please try again.");
      return;
    }
    const selfie = new File([blob], "selfie-camera.jpg", { type: "image/jpeg" });
    setFSelfie(selfie);
    setErr(null);
    closeCamera();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !role || !user) return;
    const authToken = token;
    const selectedRole = role;
    setErr(null);
    setBusy(true);
    try {
      if (!canApplyProfessionalKyc(user, selectedRole)) {
        throw new Error(
          selectedRole === "LAWYER"
            ? "You already have a lawyer application in progress or approved."
            : "You already have an agent application in progress or approved.",
        );
      }
      const details =
        selectedRole === "LAWYER"
          ? {
              barRegistrationNumber: lawyerBar.trim(),
              regulatoryBody: lawyerBody.trim(),
              lawFirmName: lawyerFirm.trim(),
              yearsLicensed: lawyerYears.trim(),
            }
          : {
              nationalIdOrPassportNumber: agentId.trim(),
              agentLicenseId: agentLicense.trim(),
              employerOrAgencyName: agentEmployer.trim(),
            };

      if (selectedRole === "LAWYER") {
        if (!lawyerBar.trim() || !lawyerBody.trim()) {
          throw new Error("Bar registration and regulatory body are required.");
        }
      } else {
        if (!agentId.trim()) {
          throw new Error("National ID or passport number is required.");
        }
      }

      if (!fGovId) {
        throw new Error("Government-issued ID upload is required.");
      }
      if (!fSelfie) {
        throw new Error("Live selfie from camera is required.");
      }
      if (!fSelfie.type.startsWith("image/")) {
        throw new Error("Selfie must be an image captured by camera.");
      }
      if (selectedRole === "LAWYER" && !fCert) {
        throw new Error("Bar certificate or call-to-bar document is required.");
      }
      if (selectedRole === "AGENT" && !fExtra) {
        throw new Error("Second ID, license, or passport scan is required.");
      }

      const applied = await kycApi.applyProfessionalRole(authToken, {
        role: selectedRole,
        details,
      });

      async function submitDoc(file: File, uploader: string) {
        const { key } = await kycApi.uploadKycFile(authToken, file);
        await kycApi.submitKycDocument(authToken, {
          kind: selectedRole,
          professionalApplicationId: applied.applicationId,
          fileKey: key,
          uploader,
        });
      }

      await submitDoc(fSelfie, `${selectedRole.toLowerCase()}:selfie_camera`);
      await submitDoc(fGovId, `${selectedRole.toLowerCase()}:government_id`);
      if (selectedRole === "LAWYER" && fCert) {
        await submitDoc(fCert, "lawyer:bar_certificate");
      }
      if (selectedRole === "AGENT" && fExtra) {
        await submitDoc(fExtra, "agent:secondary_id_or_license");
      }
      if (fExtra && selectedRole === "LAWYER") {
        await submitDoc(fExtra, "lawyer:supplemental");
      }

      await refreshUser();
      setDone(true);
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg pb-12">
        <div className={`${cardPanel} p-8 text-center`}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <i className="fas fa-check text-xl" aria-hidden />
          </div>
          <h1 className="font-display text-xl font-bold text-gray-900">Application submitted</h1>
          <p className="mt-2 text-sm text-gray-600">
            We stored your details and documents securely. Our team will review your application.
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-flex rounded-xl bg-primaryColorBlack px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  if (user && !canApplyAny) {
    return (
      <div className="mx-auto max-w-xl pb-12">
        <div className={`${cardPanel} p-8 text-center`}>
          <h1 className="font-display text-xl font-bold text-gray-900">Application not available</h1>
          <p className="mt-2 text-sm text-gray-600">
            You already have a professional application. You can submit again only after a rejection.
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-flex rounded-xl bg-primaryColorBlack px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <div className="mb-6">
        <Link href="/profile" className="text-sm font-medium text-primaryColorBlack hover:underline">
          ← Profile
        </Link>
      </div>
      <h1 className="font-display text-3xl font-bold text-gray-900">Apply for KYC</h1>
      <p className="mt-2 text-sm text-gray-600">
        Choose lawyer or agent, provide verification details, and upload documents. Files are sent
        to the server and stored in R2; nothing is uploaded directly from the browser to storage.
      </p>
      <div className="mt-5 flex items-center gap-2 text-xs font-semibold">
        {["Role", "Details", "Upload"].map((label, index) => {
          const active = step === index;
          const done = step > index;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-primaryColorBlack text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={active ? "text-primaryColorBlack" : "text-gray-500"}>{label}</span>
              {index < 2 && <span className="h-px w-4 bg-gray-300" />}
            </div>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className={`${cardPanel} mt-8 space-y-8 p-6 sm:p-8`}>
        {step === 0 && (
          <div>
          <span className={fieldLabel}>I am applying as</span>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canLawyer}
              onClick={() => {
                setRole("LAWYER");
                setStep(1);
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                role === "LAWYER"
                  ? "border-primaryColorBlack bg-primaryColorBlack/10 text-primaryColorBlack"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              } ${!canLawyer ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Lawyer
            </button>
            <button
              type="button"
              disabled={!canAgent}
              onClick={() => {
                setRole("AGENT");
                setStep(1);
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                role === "AGENT"
                  ? "border-primaryColorBlack bg-primaryColorBlack/10 text-primaryColorBlack"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              } ${!canAgent ? "cursor-not-allowed opacity-50" : ""}`}
            >
              Agent
            </button>
          </div>
          </div>
        )}

        {step === 1 && role === "LAWYER" && (
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Lawyer information</h2>
            <div>
              <label className={fieldLabel} htmlFor="bar">
                Bar registration number *
              </label>
              <input
                id="bar"
                className={fieldInput}
                value={lawyerBar}
                onChange={(e) => setLawyerBar(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="body">
                Regulatory body / jurisdiction *
              </label>
              <input
                id="body"
                className={fieldInput}
                value={lawyerBody}
                onChange={(e) => setLawyerBody(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="firm">
                Law firm or practice name
              </label>
              <input
                id="firm"
                className={fieldInput}
                value={lawyerFirm}
                onChange={(e) => setLawyerFirm(e.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="years">
                Years in practice
              </label>
              <input
                id="years"
                className={fieldInput}
                value={lawyerYears}
                onChange={(e) => setLawyerYears(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 1 && role === "AGENT" && (
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Agent information</h2>
            <div>
              <label className={fieldLabel} htmlFor="nid">
                National ID or passport number *
              </label>
              <input
                id="nid"
                className={fieldInput}
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="lic">
                Agent / business license ID
              </label>
              <input
                id="lic"
                className={fieldInput}
                value={agentLicense}
                onChange={(e) => setAgentLicense(e.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="emp">
                Employer or agency name
              </label>
              <input
                id="emp"
                className={fieldInput}
                value={agentEmployer}
                onChange={(e) => setAgentEmployer(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && role && (
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
            <p className="text-xs text-gray-500">
              JPEG, PNG, WebP, GIF, or PDF. Max 25 MB per file.
            </p>
            <div>
              <label className={fieldLabel}>
                Live selfie (camera only) *
              </label>
              <div className="mt-2 rounded-xl border border-gray-200 p-3">
                {fSelfie ? (
                  <p className="text-sm text-emerald-700">Selfie captured: {fSelfie.name}</p>
                ) : (
                  <p className="text-sm text-gray-600">No selfie captured yet.</p>
                )}
                {!cameraSupported ? (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    Camera not available. You cannot complete this application without camera access.
                  </p>
                ) : null}
                {!cameraOpen ? (
                  <button
                    type="button"
                    disabled={cameraBusy}
                    onClick={() => void openCamera()}
                    className="mt-3 rounded-xl bg-primaryColorBlack px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {cameraBusy ? "Opening camera…" : fSelfie ? "Retake selfie" : "Open camera"}
                  </button>
                ) : (
                  <div className="mt-3 space-y-3">
                    <video ref={videoRef} className="max-h-72 w-full rounded-lg bg-black" playsInline muted />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void captureSelfie()}
                        className="rounded-xl bg-primaryColorBlack px-4 py-2 text-sm font-semibold text-white"
                      >
                        Capture selfie
                      </button>
                      <button
                        type="button"
                        onClick={closeCamera}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="gov">
                Government-issued photo ID *
              </label>
              <input
                id="gov"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="mt-1 block w-full text-sm text-gray-600"
                onChange={(e) => setFGovId(e.target.files?.[0] ?? null)}
              />
            </div>
            {role === "LAWYER" && (
              <div>
                <label className={fieldLabel} htmlFor="barcert">
                  Bar certificate or call-to-bar proof *
                </label>
                <input
                  id="barcert"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  className="mt-1 block w-full text-sm text-gray-600"
                  onChange={(e) => setFCert(e.target.files?.[0] ?? null)}
                />
              </div>
            )}
            <div>
              <label className={fieldLabel} htmlFor="extra">
                {role === "LAWYER"
                  ? "Supplemental credential (optional)"
                  : "Second ID, license, or passport scan *"}
              </label>
              <input
                id="extra"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="mt-1 block w-full text-sm text-gray-600"
                onChange={(e) => setFExtra(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        )}

        {err && (
          <p className="text-sm text-red-600" role="alert">
            {err}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={busy}
              className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700"
            >
              Back
            </button>
          )}
          {step < 2 && (
            <button
              type="button"
              disabled={!role || busy}
              onClick={() => setStep(step + 1)}
              className="rounded-xl bg-primaryColorBlack px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          )}
          {step === 2 && (
            <button
              type="submit"
              disabled={!role || !token || busy}
              className="rounded-xl bg-primaryColorBlack px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-primaryColorBlack/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
