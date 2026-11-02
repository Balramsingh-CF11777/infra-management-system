import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle, UserRound } from "lucide-react";
import { getCurrentUserContext, login } from "@/api/auth";
import { homePathForUser } from "@/lib/arbmAccess";
import { ApiError } from "@/types/api";
import heroImage from "@/assets/design/login-branch.webp";
const REMEMBERED_USER_KEY = "ims_remembered_user";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [usr, setUsr] = useState(() => localStorage.getItem(REMEMBERED_USER_KEY) ?? "");
  const [pwd, setPwd] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem(REMEMBERED_USER_KEY) !== null);
  const [error, setError] = useState("");
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [pending, setPending] = useState(false);

  function clearError() {
    setError("");
    setInvalidCredentials(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    clearError();
    try {
      const userId = usr.trim();
      await login(userId, pwd);
      if (remember) localStorage.setItem(REMEMBERED_USER_KEY, userId);
      else localStorage.removeItem(REMEMBERED_USER_KEY);
      queryClient.clear();
      let home = "/dashboard";
      try {
        const context = await getCurrentUserContext();
        home = homePathForUser(context);
      } catch {
        /* fall back to default dashboard if context fails after login */
      }
      navigate(home, { replace: true });
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      const unreachable = Boolean(apiError && (apiError.status === 0 || apiError.status >= 500));
      const message = (apiError?.message || "").toLowerCase();
      const looksLikeBadPassword =
        Boolean(apiError) &&
        !unreachable &&
        (apiError!.code === "AuthenticationError" ||
          apiError!.code === "LOGIN_FAILED" ||
          message.includes("incorrect") ||
          message.includes("invalid login credentials") ||
          message.includes("invalid login"));

      if (unreachable) {
        setError(
          apiError?.status === 502 && apiError.message
            ? apiError.message
            : "The Infra Management server could not be reached. Check your VPN connection and try again.",
        );
      } else if (looksLikeBadPassword) {
        setInvalidCredentials(true);
        setError("Please check your username and password.");
      } else {
        setError(
          apiError?.message ||
            "Sign-in failed after contacting the server. If Desk login works, check VPN, CORS/cookies, and that the SPA points at the same Frappe site.",
        );
      }
    } finally {
      setPending(false);
      setPwd("");
    }
  }

  return (
    <div className="min-h-screen w-full bg-white sm:flex sm:items-center sm:justify-center sm:bg-[linear-gradient(160deg,#23346f_0%,#3a2a5e_55%,#5a2350_100%)] sm:p-5">
      <div className="w-full overflow-hidden bg-white sm:max-w-[420px] sm:rounded-[28px] sm:shadow-[0_30px_80px_rgba(10,12,40,0.45)]">
        <div className="login-hero-bg pt-[calc(clamp(1.25rem,10svh-1.75rem,4.5rem)+env(safe-area-inset-top))]">
          <img
            src={heroImage}
            alt="Chola branch"
            className="block aspect-[819/614] max-h-[34svh] w-full object-cover object-bottom sm:max-h-none"
          />
        </div>
        <div className="bg-white">
          <div className="mx-auto max-w-[400px] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:pb-8">
            <div className="mb-6 text-center">
              <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
                <span className="text-[#1d3a7a]">Welcome to </span>
                <span className="font-bold text-[#6b1f45]">Infra 360</span>
              </h1>
              <p className="mt-2 text-[15px] text-slate-600">Use the same email and password as the Frappe Desk login.</p>
            </div>

            <form onSubmit={onSubmit}>
              <div className="relative mb-5">
                <label className="sr-only" htmlFor="login-usr">
                  Username
                </label>
                <input
                  id="login-usr"
                  name="usr"
                  placeholder="Username"
                  autoComplete="username"
                  autoFocus={!usr}
                  value={usr}
                  onChange={(event) => {
                    setUsr(event.target.value);
                    clearError();
                  }}
                  aria-invalid={invalidCredentials}
                  className={`login-field ${invalidCredentials ? "login-field-error" : ""}`}
                  required
                />
                <UserRound size={20} strokeWidth={1.5} className="pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2 text-slate-500" />
              </div>

              <div className="relative mb-5">
                <label className="sr-only" htmlFor="login-pwd">
                  Password
                </label>
                <input
                  id="login-pwd"
                  name="pwd"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="current-password"
                  autoFocus={Boolean(usr)}
                  value={pwd}
                  onChange={(event) => {
                    setPwd(event.target.value);
                    clearError();
                  }}
                  aria-invalid={invalidCredentials}
                  className={`login-field ${invalidCredentials ? "login-field-error" : ""}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-[14px] top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="-mt-1 mb-5 flex items-start gap-2 rounded-xl border border-[#fecaca] bg-[#fff1f2] px-3.5 py-3 text-[13px] font-medium leading-[1.4] text-[#b91c1c]"
                >
                  <span aria-hidden="true" className="mt-0.5 text-base leading-none">
                    ⚠
                  </span>
                  <span>
                    {invalidCredentials && <strong>Invalid credentials. </strong>}
                    {error}
                  </span>
                </div>
              )}

              <label className="mb-6 flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 accent-ims-primary"
                />
                Remember my username
              </label>

              <button type="submit" disabled={pending} className="ims-btn-primary h-[54px] w-full rounded-xl text-base">
                {pending ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Signing in
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
