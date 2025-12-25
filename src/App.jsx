import { useState } from "react";
import { useAuth } from "./hooks/useAuth";

import LoginForm from "./components/auth/LoginForm.jsx";
import RegisterForm from "./components/auth/Registerform.jsx";
import ManagerDashboard from "./components/manager/ManagerDashboard.jsx";
import ApplicantDashboard from "./components/applicant/ApplicantDashboard.jsx";

function App() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("login");

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 antialiased">
        <header className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <img
                src="./hirechatlogos.png"   
                alt="Hirechat"
                className="h-8 w-auto object-contain"
              />
              <div>
                <div className="text-sm font-semibold tracking-tight text-slate-50">
                  Hirechat
                </div>
                <div className="text-xs text-slate-400">
                  Chat to hire &amp; apply
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-16 md:flex-row md:items-start md:gap-16 lg:gap-20">
          <section className="flex w-full flex-col items-center md:w-1/2 md:items-start">
           
            <h1 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-slate-100 via-white to-slate-200 bg-clip-text text-transparent drop-shadow-lg">
              Hirechat
            </h1>
            <p className="mt-4 text-xl text-slate-300 max-w-md text-center md:text-left leading-relaxed font-light">
              A minimal, chat-first workspace for hiring managers and applicants.
              Seamlessly create job postings, apply for jobs, browse roles, and collaborate with AI.
            </p>

            <div className="mt-8 space-y-3 text-sm text-slate-300 max-w-lg">
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold border-b border-slate-700 pb-2 inline-block">
                What you can do here
              </p>
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 shrink-0" />
                  <span>Managers: describe a role in chat to create job postings in seconds.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 shrink-0" />
                  <span>Applicants: browse roles and submit applications with your CV.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 shrink-0" />
                  <span>Both: use AI assistant to explore jobs, applications, and status updates.</span>
                </p>
              </div>
            </div>
          </section>

        
          <section className="w-full max-w-md md:w-1/2 md:ml-auto">
            <div className="group relative rounded-3xl border border-slate-800/60 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/60 backdrop-blur-xl hover:shadow-3xl hover:border-slate-700/70 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 via-transparent to-slate-900/60 group-hover:bg-slate-800/40 transition-all duration-500" />
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-100 drop-shadow-sm">
                    Welcome back
                  </h2>
                  <span className="text-xs text-slate-400 font-medium bg-slate-800/60 px-3 py-1 rounded-full backdrop-blur-sm">
                    Get started
                  </span>
                </div>

                <div
                  className="mb-6 flex gap-2 rounded-xl bg-slate-800/60 p-1 backdrop-blur-sm border border-slate-700/60"
                  role="group"
                  aria-label="auth-tabs"
                >
                  <button
                    onClick={() => setTab("login")}
                    className={`flex-1 rounded-lg px-4 py-2.5 transition-all duration-200 font-semibold text-sm ${
                      tab === "login"
                        ? "bg-slate-950 text-slate-100 shadow-md shadow-black/40 border border-slate-700"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => setTab("register")}
                    className={`flex-1 rounded-lg px-4 py-2.5 transition-all duration-200 font-semibold text-sm ${
                      tab === "register"
                        ? "bg-slate-950 text-slate-100 shadow-md shadow-black/40 border border-slate-700"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    Create account
                  </button>
                </div>

                {tab === "login" ? (
                  <LoginForm />
                ) : (
                  <RegisterForm onRegistered={() => setTab("login")} />
                )}

                <p className="mt-6 text-xs leading-relaxed text-slate-500">
                  Use a{" "}
                  <span className="font-semibold text-emerald-300 bg-emerald-900/30 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                    hiring_manager
                  </span>{" "}
                  account to create Job roles via chat, or an{" "}
                  <span className="font-semibold text-blue-300 bg-blue-900/30 px-1.5 py-0.5 rounded-md border border-blue-500/30">
                    applicant
                  </span>{" "}
                  account to discover and apply to roles.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }


return (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 antialiased">
    <header className="border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-full items-center justify-between px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-md bg-black px-2 py-1">
            <img
              src="./hirechatlogos.png"
              alt="Hirechat"
              className="h-6 w-auto object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-50">
              Hirechat
            </div>
            <div className="text-sm font-semibold text-emerald-300 truncate max-w-xs drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
  Hi, {user.full_name}! 👋
</div>

          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-sm">
            Role:{" "}
            <span
              className={`font-semibold px-2 py-0.5 rounded-md ${
                user.role === "hiring_manager"
                  ? "text-emerald-300 bg-emerald-900/40 border border-emerald-500/40"
                  : "text-blue-300 bg-blue-900/40 border border-blue-500/40"
              }`}
            >
              {user.role || "unknown"}
            </span>
          </span>
          <button
            onClick={logout}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 shadow-md shadow-black/30 transition-all"
          >
            Log out
          </button>
        </div>
      </div>
    </header>

    <main className="w-full px-8 py-8">
      <section className="w-full">
        {user.role === "hiring_manager" && <ManagerDashboard />}
        {user.role === "applicant" && <ApplicantDashboard />}

        {!user.role && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-xs text-amber-100">
            <p className="font-semibold mb-1">Role not assigned</p>
            <p>
              This account has no role assigned. Please register again or update
              the user record.
            </p>
          </div>
        )}
      </section>
    </main>
  </div>
);

}

export default App;
