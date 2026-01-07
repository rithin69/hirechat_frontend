import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = "https://hirechatbackend-dycmdjfgdyhzhhfp.uksouth-01.azurewebsites.net";

// API helpers
async function fetchJobs(token) {
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

async function fetchMyApplications(token) {
  const res = await fetch(`${API_BASE}/applications/my-applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
  return res.json();
}

async function applyToJob({ jobId, coverLetter, cvFile }, token) {
  const formData = new FormData();
  formData.append("job_id", jobId);
  formData.append("cover_letter", coverLetter);
  formData.append("cv", cvFile);

  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit application");
  }

  return res.json();
}

async function downloadCV(applicationId, filename, token) {
  try {
    const response = await fetch(
      `${API_BASE}/applications/${applicationId}/cv`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error("Failed to download CV");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "cv.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading CV:", error);
    alert("Failed to download CV");
  }
}

export default function ApplicantDashboard() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);

  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  // Job search assistant
  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your job search assistant. Ask me anything!\n\nExamples:\n• \"Show me all remote jobs\"\n• \"What's the highest paying role?\"\n• \"Have I applied to any jobs?\"",
      timestamp: new Date(),
    },
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantTyping, setAssistantTyping] = useState(false);
  const assistantEndRef = useRef(null);

  const isMountedRef = useRef(true);
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    isMountedRef.current = true;

    async function loadJobs() {
      if (!token) return;
      try {
        const data = await fetchJobs(token);
        if (isMountedRef.current) setJobs(data);
      } catch (e) {
        console.error("Failed to load jobs:", e);
      } finally {
        if (isMountedRef.current) setLoadingJobs(false);
      }
    }

    async function loadApplications() {
      if (!token) return;
      try {
        const data = await fetchMyApplications(token);
        if (isMountedRef.current) setMyApplications(data);
      } catch (e) {
        console.error("Failed to load applications:", e);
      } finally {
        if (isMountedRef.current) setLoadingApplications(false);
      }
    }

    loadJobs();
    loadApplications();

    return () => {
      isMountedRef.current = false;
    };
  }, [token]);

  useEffect(() => {
    assistantEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistantMessages]);

  const addAssistantMessage = (role, content) => {
    setAssistantMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

  const handleAssistantSend = async () => {
    if (!assistantInput.trim()) return;

    const userMsg = assistantInput.trim();
    addAssistantMessage("user", userMsg);
    setAssistantInput("");
    setAssistantTyping(true);

    setTimeout(() => {
      const lowerMsg = userMsg.toLowerCase();

      // Simple pattern matching for applicant queries
      if (lowerMsg.includes("remote") && lowerMsg.includes("job")) {
        const remoteJobs = jobs.filter((j) =>
          j.location.toLowerCase().includes("remote")
        );
        if (remoteJobs.length === 0) {
          addAssistantMessage("assistant", "No remote jobs available right now.");
        } else {
          let response = `Found ${remoteJobs.length} remote job${
            remoteJobs.length === 1 ? "" : "s"
          }:\n\n`;
          remoteJobs.forEach((job) => {
            response += `• ${job.title} - £${job.salary_min}-£${job.salary_max}\n`;
          });
          addAssistantMessage("assistant", response);
        }
      } else if (lowerMsg.includes("highest") && lowerMsg.includes("pay")) {
        if (jobs.length === 0) {
          addAssistantMessage("assistant", "No jobs available yet.");
        } else {
          const highest = jobs.reduce((prev, current) =>
            current.salary_max > prev.salary_max ? current : prev
          );
          addAssistantMessage(
            "assistant",
            `The highest paying role is:\n\n${highest.title}\n${highest.location} • £${highest.salary_min}-£${highest.salary_max}`
          );
        }
      } else if (lowerMsg.includes("applied") || lowerMsg.includes("application")) {
        if (myApplications.length === 0) {
          addAssistantMessage(
            "assistant",
            "You haven't applied to any jobs yet."
          );
        } else {
          let response = `You have applied to ${myApplications.length} job${
            myApplications.length === 1 ? "" : "s"
          }:\n\n`;
          myApplications.forEach((app) => {
            response += `• Job ID ${app.job_id} - Status: ${app.status}\n`;
          });
          addAssistantMessage("assistant", response);
        }
      } else if (lowerMsg.includes("how many") && lowerMsg.includes("job")) {
        addAssistantMessage(
          "assistant",
          `There are currently ${jobs.length} job${
            jobs.length === 1 ? "" : "s"
          } available.`
        );
      } else {
        addAssistantMessage(
          "assistant",
          "I can help you with:\n• Showing remote jobs\n• Finding the highest paying role\n• Checking your applications\n• Counting available jobs"
        );
      }

      if (isMountedRef.current) setAssistantTyping(false);
    }, 700);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob || !cvFile) {
      setError("Please select a job and upload your CV.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await applyToJob({ jobId: selectedJob.id, coverLetter, cvFile }, token);
      setSuccess(`Application submitted for ${selectedJob.title}!`);
      setCoverLetter("");
      setCvFile(null);
      setSelectedJob(null);

      // Reload applications
      const updatedApps = await fetchMyApplications(token);
      if (isMountedRef.current) setMyApplications(updatedApps);
    } catch (e) {
      setError(e.message);
    } finally {
      if (isMountedRef.current) setSubmitting(false);
    }
  };

  if (user?.role !== "applicant") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <p className="text-lg font-semibold">
          This area is only for applicants.
        </p>
      </div>
    );
  }

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation =
      locationFilter === "all" ||
      job.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const applicantName = user?.full_name || "Applicant";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Job Search Dashboard
            </h1>
            <p className="text-sm text-slate-600">
              Welcome back,
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {applicantName}
              </span>
               Find your next opportunity and track your applications.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm">
              <p className="text-slate-500">Open roles</p>
              <p className="text-lg font-semibold text-indigo-600">
                {jobs.filter((j) => j.status === "open").length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm">
              <p className="text-slate-500">My applications</p>
              <p className="text-lg font-semibold text-emerald-600">
                {myApplications.length}
              </p>
            </div>
          </div>
        </header>

        {/* Step guide */}
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="font-semibold text-indigo-800">Step 1 – Browse jobs</p>
            <p className="text-indigo-700">
              Explore available roles and find the perfect match.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="font-semibold text-slate-800">Step 2 – Apply</p>
            <p className="text-slate-600">
              Submit your CV and cover letter for your chosen role.
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="font-semibold text-emerald-800">Step 3 – Track status</p>
            <p className="text-emerald-700">
              Monitor your applications and await feedback.
            </p>
          </div>
        </div>

        {/* Main 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs column */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Available Jobs
              </h2>
              <span className="text-xs text-slate-500">Step 1</span>
            </div>

            {/* Search and filter */}
            <div className="mb-3 space-y-2">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="all">All locations</option>
                <option value="london">London</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="manchester">Manchester</option>
              </select>
            </div>

            {loadingJobs ? (
              <p className="text-sm text-slate-500">Loading jobs…</p>
            ) : filteredJobs.length === 0 ? (
              <p className="text-sm text-slate-500">
                No jobs match your search.
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
                {filteredJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  const alreadyApplied = myApplications.some(
                    (app) => app.job_id === job.id
                  );

                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className={`w-full text-left rounded-lg px-4 py-3 border transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-slate-900">
                          {job.title}
                        </p>
                        {alreadyApplied && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            Applied
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {job.location} • £{job.salary_min}-£{job.salary_max}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {job.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Application form / Job details */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedJob ? "Apply for this role" : "Job details"}
              </h2>
              <span className="text-xs text-slate-500">Step 2</span>
            </div>

            {!selectedJob ? (
              <p className="text-sm text-slate-500">
                Select a job from Step 1 to see details and apply.
              </p>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1">
                {/* Job info */}
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
                  <p className="font-semibold text-slate-900">{selectedJob.title}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedJob.location} • £{selectedJob.salary_min}-£
                    {selectedJob.salary_max}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Job description
                  </p>
                  <p className="mt-1 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                    {selectedJob.description}
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cover letter
                    </label>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Introduce yourself and explain why you're a great fit for this role..."
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      rows={5}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Upload your CV
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCvFile(e.target.files[0] || null)}
                      className="mt-1 block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-indigo-600"
                      required
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit application"}
                  </button>
                </form>
              </div>
            )}
          </section>

          {/* My applications */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                My applications
              </h2>
              <span className="text-xs text-slate-500">Step 3</span>
            </div>

            {loadingApplications ? (
              <p className="text-sm text-slate-500">Loading applications…</p>
            ) : myApplications.length === 0 ? (
              <p className="text-sm text-slate-500">
                You haven't applied to any jobs yet. Start by selecting a role from Step 1.
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
                {myApplications.map((app) => {
                  const isSelected = selectedApplication?.id === app.id;
                  const statusColor =
                    app.status === "shortlisted" || app.status === "interview"
                      ? "bg-emerald-50 text-emerald-700"
                      : app.status === "rejected"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700";

                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedApplication(app)}
                      className={`w-full text-left rounded-lg px-4 py-3 border transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold text-sm text-slate-900">
                        Job ID: {app.job_id}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Applied: {new Date(app.created_at).toLocaleDateString()}
                      </p>
                      <span
                        className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${statusColor}`}
                      >
                        {app.status}
                      </span>
                      {app.cv_filename && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadCV(app.id, app.cv_filename, token);
                          }}
                          className="mt-2 block text-[11px] text-indigo-600 hover:text-indigo-700"
                        >
                          📄 Download CV
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedApplication && (
              <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cover letter
                </p>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {selectedApplication.cover_letter || "No cover letter."}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Job search assistant */}
        <div className="mt-6">
          <section className="bg-slate-900 text-slate-50 rounded-xl shadow-sm p-5 flex flex-col">
            <p className="text-lg font-semibold mb-2">Job Search Assistant</p>
            <p className="mb-3 text-xs text-slate-300">
              Ask questions about available jobs, your applications, and get personalized recommendations.
            </p>

            <div className="flex-1 rounded-lg bg-slate-950/40 border border-slate-700 p-3 mb-3 overflow-y-auto h-64">
              {assistantMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 ${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block max-w-xs rounded-lg px-3 py-2 text-[13px] ${
                      msg.role === "user"
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {assistantTyping && (
                <div className="text-left mb-2">
                  <div className="inline-block rounded-lg bg-slate-800 px-3 py-1 text-[12px] text-slate-200">
                    Typing…
                  </div>
                </div>
              )}
              <div ref={assistantEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAssistantSend()}
                placeholder='Example: "Show me all remote jobs"'
                className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={handleAssistantSend}
                disabled={assistantTyping || !assistantInput.trim()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                Ask
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
