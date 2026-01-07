import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_BASE =
  "https://hirechatbackend-dycmdjfgdyhzhhfp.uksouth-01.azurewebsites.net";

// -------- API helpers --------

async function fetchJobs(token) {
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

async function createJob(job, token) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(job),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create job");
  }
  return res.json();
}

async function closeJob(jobId, token) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/close`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to close job");
  return res.json();
}

async function fetchApplicationsByJob(jobId, token) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
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

async function fetchAIAnalysis(applicationId, token) {
  const res = await fetch(
    `${API_BASE}/ai/application/${applicationId}/analysis`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function generateEmailDraft(applicationId, emailType, token) {
  const res = await fetch(`${API_BASE}/ai/generate-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      application_id: applicationId,
      email_type: emailType,
    }),
  });
  if (!res.ok) throw new Error("Failed to generate email");
  return res.json();
}

async function triggerAIAnalysis(applicationId, token) {
  const res = await fetch(`${API_BASE}/ai/analyze-application`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ application_id: applicationId }),
  });
  if (!res.ok) throw new Error("Failed to trigger AI analysis");
  return res.json();
}

// update application status backend (optional, if you added it)
async function updateApplicationStatus(applicationId, newStatus, token) {
  const res = await fetch(
    `${API_BASE}/applications/${applicationId}/status?new_status=${newStatus}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update status");
  }
  return res.json();
}

// -------- Component --------

export default function ManagerDashboard() {
  const { user } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState(null);

  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const [emailDraftMeta, setEmailDraftMeta] = useState(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [pendingEmailType, setPendingEmailType] = useState(null); // for small confirm bar

  const [analyzingCV, setAnalyzingCV] = useState(false);
  const [analyzingAppId, setAnalyzingAppId] = useState(null);

  const [creatorMessages, setCreatorMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can help you create job postings.\n\nExample:\n“Create Senior React Developer in London £65-85k with description XYZ”",
      timestamp: new Date(),
    },
  ]);
  const [creatorInput, setCreatorInput] = useState("");
  const [creatorTyping, setCreatorTyping] = useState(false);
  const creatorEndRef = useRef(null);

  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask anything about your roles and applicants.\n\nExamples:\n• “Show me all open jobs”\n• “Which applicants are shortlisted?”\n• “How many applications this week?”",
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
        if (isMountedRef.current) setError(e.message);
      } finally {
        if (isMountedRef.current) setLoadingJobs(false);
      }
    }

    loadJobs();
    return () => {
      isMountedRef.current = false;
    };
  }, [token]);

  useEffect(() => {
    creatorEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [creatorMessages]);

  useEffect(() => {
    assistantEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistantMessages]);

  useEffect(() => {
    let cancelled = false;
    if (selectedJob && token) {
      setLoadingApplicants(true);
      setSelectedApplicant(null);
      setAiAnalysis(null);
      setEmailDraftMeta(null);
      setPendingEmailType(null);

      fetchApplicationsByJob(selectedJob.id, token)
        .then((data) => {
          if (!cancelled && isMountedRef.current) setApplicants(data);
        })
        .catch((e) => {
          console.error("Failed to load applicants:", e);
          if (!cancelled && isMountedRef.current) setApplicants([]);
        })
        .finally(() => {
          if (!cancelled && isMountedRef.current) setLoadingApplicants(false);
        });
    } else {
      setApplicants([]);
      setSelectedApplicant(null);
      setAiAnalysis(null);
      setEmailDraftMeta(null);
      setPendingEmailType(null);
    }
    return () => {
      cancelled = true;
    };
  }, [selectedJob, token]);

  const handleViewApplicant = async (applicant) => {
    setSelectedApplicant(applicant);
    setAiAnalysis(null);
    setEmailDraftMeta(null);
    setPendingEmailType(null);
    setLoadingAI(true);

    try {
      const analysis = await fetchAIAnalysis(applicant.id, token);
      if (isMountedRef.current) setAiAnalysis(analysis);
    } catch (e) {
      console.error("Failed to load AI analysis:", e);
    } finally {
      if (isMountedRef.current) setLoadingAI(false);
    }
  };

  const handleAnalyzeCV = async (applicantId) => {
    if (!selectedJob || !token) return;
    setAnalyzingCV(true);
    setAnalyzingAppId(applicantId);

    try {
      await triggerAIAnalysis(applicantId, token);
      let attempts = 0;
      const maxAttempts = 15;

      const checkInterval = setInterval(async () => {
        attempts += 1;
        try {
          const updatedApplicants = await fetchApplicationsByJob(
            selectedJob.id,
            token
          );
          if (!isMountedRef.current) {
            clearInterval(checkInterval);
            return;
          }
          setApplicants(updatedApplicants);
          const updatedApplicant = updatedApplicants.find(
            (a) => a.id === applicantId
          );

          if (
            updatedApplicant?.ai_score !== null &&
            updatedApplicant?.ai_score !== undefined
          ) {
            const analysis = await fetchAIAnalysis(applicantId, token);
            if (isMountedRef.current) {
              setAiAnalysis(analysis);
              if (selectedApplicant?.id === applicantId) {
                setSelectedApplicant(updatedApplicant);
              }
              setAnalyzingCV(false);
              setAnalyzingAppId(null);
            }
            clearInterval(checkInterval);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (isMountedRef.current) {
              setAnalyzingCV(false);
              setAnalyzingAppId(null);
              alert(
                "AI analysis is taking longer than expected. Please try again later."
              );
            }
          }
        } catch (err) {
          console.error("Error checking AI status:", err);
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (isMountedRef.current) {
              setAnalyzingCV(false);
              setAnalyzingAppId(null);
            }
          }
        }
      }, 2000);
    } catch (e) {
      if (isMountedRef.current) {
        alert("Failed to start AI analysis: " + e.message);
        setAnalyzingCV(false);
        setAnalyzingAppId(null);
      }
    }
  };

  // start email flow: show mini confirm bar
  const startEmailFlow = (emailType) => {
    if (!selectedApplicant) return;
    setPendingEmailType(emailType);
    setEmailDraftMeta(null);
  };

  // confirm email send
  const confirmSendEmail = async () => {
    if (!selectedApplicant || !token || !pendingEmailType) return;

    setGeneratingEmail(true);
    setEmailDraftMeta(null);

    try {
      const draft = await generateEmailDraft(
        selectedApplicant.id,
        pendingEmailType,
        token
      );
      if (!isMountedRef.current) return;

      setEmailDraftMeta({
        type: pendingEmailType,
        email_sent: draft.email_sent,
        message: draft.message,
      });

      // optional: update status on shortlist / reject / interview
      try {
        if (pendingEmailType === "rejection") {
          await updateApplicationStatus(
            selectedApplicant.id,
            "rejected",
            token
          );
          // update local state: mark as rejected
          setApplicants((prev) =>
            prev.map((a) =>
              a.id === selectedApplicant.id ? { ...a, status: "rejected" } : a
            )
          );
          setSelectedApplicant((prev) =>
            prev ? { ...prev, status: "rejected" } : prev
          );
        } else if (pendingEmailType === "shortlist") {
          await updateApplicationStatus(
            selectedApplicant.id,
            "shortlisted",
            token
          );
          setApplicants((prev) =>
            prev.map((a) =>
              a.id === selectedApplicant.id
                ? { ...a, status: "shortlisted" }
                : a
            )
          );
          setSelectedApplicant((prev) =>
            prev ? { ...prev, status: "shortlisted" } : prev
          );
        } else if (pendingEmailType === "interview") {
          await updateApplicationStatus(
            selectedApplicant.id,
            "interview",
            token
          );
          setApplicants((prev) =>
            prev.map((a) =>
              a.id === selectedApplicant.id ? { ...a, status: "interview" } : a
            )
          );
          setSelectedApplicant((prev) =>
            prev ? { ...prev, status: "interview" } : prev
          );
        }
      } catch (statusErr) {
        console.error("Failed to update status:", statusErr);
      }
    } catch (e) {
      if (isMountedRef.current) {
        setEmailDraftMeta({
          type: pendingEmailType,
          email_sent: false,
          message: `Failed: ${e.message}`,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setGeneratingEmail(false);
        setPendingEmailType(null);
      }
    }
  };

  const cancelSendEmail = () => {
    setPendingEmailType(null);
  };

  // chat helpers

  const addCreatorMessage = (role, content) => {
    setCreatorMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

  const addAssistantMessage = (role, content) => {
    setAssistantMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

// Replace your existing processJobCreation + handleCreatorSend
// with this improved version in ManagerDashboard.jsx

const processJobCreation = (message) => {
  const original = message.trim();
  const lowerMsg = original.toLowerCase();

  // must clearly be a create intent, otherwise bail
  const hasCreateVerb =
    lowerMsg.includes("create ") ||
    lowerMsg.includes("post ") ||
    lowerMsg.includes("add ") ||
    lowerMsg.startsWith("new ");

  if (!hasCreateVerb) {
    return { title: "", description: "", location: "", salary_min: 0, salary_max: 0 };
  }

  let working = original;

  // strip leading verbs like "create", "please create", "can you create"
  working = working.replace(/^please\s+/i, "");
  working = working.replace(/^can you\s+/i, "");
  working = working.replace(/^could you\s+/i, "");
  working = working.replace(/^(create|post|add|new)\s+/i, "");

  // at this point we expect something like "Senior React Developer in London £65-85k with description XYZ"
  const lowerWorking = working.toLowerCase();

  // grab description if present
  let description = "";
  let beforeDescription = working;
  const descIdx = lowerWorking.indexOf("description");
  if (descIdx !== -1) {
    // everything after keyword "description" is description
    const descPart = working.slice(descIdx + "description".length).trim();
    if (descPart.startsWith(":")) {
      description = descPart.slice(1).trim();
    } else if (descPart.startsWith("-")) {
      description = descPart.slice(1).trim();
    } else {
      description = descPart;
    }
    beforeDescription = working.slice(0, descIdx).trim();
  }

  // title + location + salary live in beforeDescription
  let title = beforeDescription;

  // cut off "for", "at", "with", etc. as noise after the title
  title = title.split(/\b(in|at|for|with|based in)\b/i)[0].trim();

  // title cleanup: remove leading determiners, ensure nice casing
  title = title.replace(/^(a|an|the)\s+/i, "").trim();
  title = title
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  // location detection: simple list but tolerant
  const locations = ["london", "remote", "hybrid", "manchester", "edinburgh"];
  let location = "";
  for (const loc of locations) {
    if (lowerWorking.includes(loc)) {
      location = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // salary parsing: £50k-70k, 50k to 70k, 50000-70000, etc.
  let salaryMin = 40000;
  let salaryMax = 70000;

  const salaryMatch = lowerWorking.match(
    /£?\s*(\d+(?:,\d+)?)(k|000)?\s*(?:-|–|to)\s*£?\s*(\d+(?:,\d+)?)(k|000)?/i
  );
  if (salaryMatch) {
    const parseNum = (val, suffix) => {
      const base = parseInt(val.replace(/,/g, ""), 10);
      if (!suffix) return base;
      if (suffix.toLowerCase().includes("k")) return base * 1000;
      if (suffix.includes("000")) return base; // already full number like 50000
      return base;
    };
    salaryMin = parseNum(salaryMatch[1], salaryMatch[2]);
    salaryMax = parseNum(salaryMatch[3], salaryMatch[4]);
  }

  if (!description) {
    description = `Looking for a ${title || "talented professional"}.`;
  }

  // if we still don't have a title, treat as failure
  if (!title) {
    return { title: "", description: "", location: "", salary_min: 0, salary_max: 0 };
  }

  return { title, description, location, salary_min: salaryMin, salary_max: salaryMax };
};

const handleCreatorSend = async () => {
  if (!creatorInput.trim() || !token) return;

  const userMsg = creatorInput.trim();
  addCreatorMessage("user", userMsg);
  setCreatorInput("");
  setCreatorTyping(true);

  setTimeout(async () => {
    const jobData = processJobCreation(userMsg);

    // if we couldn't confidently parse a title, refuse and explain format
    if (!jobData.title) {
      addCreatorMessage(
        "assistant",
        'I only create jobs. Try something like:\n“Create Senior React Developer in London £65-85k with description React + TypeScript, remote friendly.”'
      );
      if (isMountedRef.current) setCreatorTyping(false);
      return;
    }

    try {
      const created = await createJob(jobData, token);
      if (isMountedRef.current) {
        setJobs((prev) => [created, ...prev]);
        addCreatorMessage(
          "assistant",
          `Job created:\n${created.title}\n${created.location || "Location not set"} • £${
            created.salary_min
          }–£${created.salary_max}`
        );
      }
    } catch (e) {
      if (isMountedRef.current) {
        addCreatorMessage("assistant", `Failed to create job: ${e.message}`);
      }
    } finally {
      if (isMountedRef.current) setCreatorTyping(false);
    }
  }, 500);
};


  const handleAssistantSend = async () => {
    if (!assistantInput.trim() || !token) return;

    const userMsg = assistantInput.trim();
    addAssistantMessage("user", userMsg);
    setAssistantInput("");
    setAssistantTyping(true);

    try {
      const res = await fetch(`${API_BASE}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: userMsg,
          history: assistantMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to get response from AI agent");

      const data = await res.json();
      if (isMountedRef.current) {
        addAssistantMessage("assistant", data.answer);
      }
    } catch (e) {
      if (isMountedRef.current) {
        addAssistantMessage("assistant", `Error: ${e.message}`);
      }
    } finally {
      if (isMountedRef.current) setAssistantTyping(false);
    }
  };

  const handleCloseJob = async (jobId) => {
    if (!token) return;
    try {
      const updated = await closeJob(jobId, token);
      if (isMountedRef.current) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
        setSelectedJob(updated);
      }
    } catch (e) {
      alert("Failed to close job: " + e.message);
    }
  };

  if (user?.role !== "hiring_manager") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
        <p className="text-lg font-semibold">
          This area is only for hiring managers.
        </p>
      </div>
    );
  }

  const managerName = user?.full_name || "Manager";
  const isSelectedJobClosed = selectedJob?.status === "closed";
  const applicantStatus = selectedApplicant?.status; // requires backend status

  const emailActionsDisabled =
    !selectedApplicant || isSelectedJobClosed || applicantStatus === "rejected";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Hiring Workspace
            </h1>
            <p className="text-sm text-slate-600">
              Welcome back,
              {/* <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                {managerName}
              </span> */}
               Manage roles, review applicants, and use AI to decide next steps.
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
              <p className="text-slate-500">Applicants (selected role)</p>
              <p className="text-lg font-semibold text-emerald-600">
                {applicants.length}
              </p>
            </div>
          </div>
        </header>

        {/* Step guide */}
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
            <p className="font-semibold text-indigo-800">Step 1 – Pick a role</p>
            <p className="text-indigo-700">
              Select a job on the left to see who applied.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="font-semibold text-slate-800">
              Step 2 – Review applicants
            </p>
            <p className="text-slate-600">
              Click an applicant in the middle to open details.
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="font-semibold text-emerald-800">
              Step 3 – Decide & communicate
            </p>
            <p className="text-emerald-700">
              Run AI analysis and send tailored emails from the right panel.
            </p>
          </div>
        </div>

        {/* Main 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs column */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Jobs</h2>
              <span className="text-xs text-slate-500">Step 1</span>
            </div>

            {loadingJobs ? (
              <p className="text-sm text-slate-500">Loading jobs…</p>
            ) : error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-slate-500">
                No jobs yet. Use the Job creator assistant below to create your
                first role.
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
                {jobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
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
                      <p className="font-semibold text-sm text-slate-900">
                        {job.title}
                      </p>
                      <p className="text-xs text-slate-600">
                        {job.location} • £{job.salary_min}–£{job.salary_max}
                      </p>
                      {job.description && (
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
        {job.description}
      </p>
    )}
                      <span
                        className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          job.status === "open"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {job.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedJob && selectedJob.status === "open" && (
              <button
                type="button"
                onClick={() => handleCloseJob(selectedJob.id)}
                className="mt-4 w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600"
              >
                Close this role
              </button>
            )}
          </section>

          {/* Applicants column */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Applicants</h2>
              <span className="text-xs text-slate-500">Step 2</span>
            </div>

            {selectedJob && (
              <div className="mb-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedJob.title}
                </p>
                <p className="text-xs text-slate-600">
                  {selectedJob.location} • £{selectedJob.salary_min}–
                  {selectedJob.salary_max}
                </p>
              </div>
            )}

            {!selectedJob ? (
              <p className="text-sm text-slate-500">
                Select a role in Step 1 to see applicants.
              </p>
            ) : loadingApplicants ? (
              <p className="text-sm text-slate-500">Loading applicants…</p>
            ) : applicants.length === 0 ? (
              <p className="text-sm text-slate-500">
                No applicants yet for this role.
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
                {applicants.map((app) => {
                  const isSelected = selectedApplicant?.id === app.id;
                  const hasScore =
                    app.ai_score !== null && app.ai_score !== undefined;

                  const scoreColor =
                    app.ai_score >= 80
                      ? "bg-emerald-50 text-emerald-700"
                      : app.ai_score >= 60
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700";

                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleViewApplicant(app)}
                      className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">
                        {app.applicant_name || "Unknown candidate"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {app.applicant_email}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Applied on{" "}
                        {new Date(app.created_at).toLocaleDateString()}
                      </p>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {hasScore ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${scoreColor}`}
                          >
                            {app.ai_score}/100
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeCV(app.id);
                            }}
                            disabled={
                              analyzingCV && analyzingAppId === app.id
                            }
                            className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                          >
                            {analyzingCV && analyzingAppId === app.id
                              ? "Analyzing…"
                              : "Run AI match"}
                          </button>
                        )}

                        {app.status && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-700">
                            {app.status}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Details + AI + email */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Review & communicate
              </h2>
              <span className="text-xs text-slate-500">Step 3</span>
            </div>

            {!selectedApplicant ? (
              <p className="text-sm text-slate-500">
                Pick an applicant in Step 2 to see details, AI analysis, and
                email actions.
              </p>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1">
                {/* Applicant info */}
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {selectedApplicant.applicant_name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {selectedApplicant.applicant_email}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      downloadCV(
                        selectedApplicant.id,
                        selectedApplicant.cv_filename,
                        token
                      )
                    }
                    className="mt-2 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    📄 Download CV
                  </button>
                </div>

                {/* Cover letter */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cover letter
                  </p>
                  <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {selectedApplicant.cover_letter ||
                      "No cover letter provided."}
                  </div>
                </div>

                {/* AI analysis */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      AI match analysis
                    </p>
                    {!aiAnalysis?.processed && (
                      <button
                        type="button"
                        onClick={() => handleAnalyzeCV(selectedApplicant.id)}
                        disabled={analyzingCV}
                        className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                      >
                        {analyzingCV && analyzingAppId === selectedApplicant.id
                          ? "Analyzing…"
                          : "Run analysis"}
                      </button>
                    )}
                  </div>

                  {loadingAI ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Loading analysis…
                    </p>
                  ) : aiAnalysis && aiAnalysis.processed ? (
                    <div className="mt-2 space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Match score</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-2 transition-all ${
                                aiAnalysis.score >= 80
                                  ? "bg-emerald-500"
                                  : aiAnalysis.score >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${aiAnalysis.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                            {aiAnalysis.score}/100
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          AI recommendation
                        </p>
                        <span
                          className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${
                            aiAnalysis.recommendation === "shortlist"
                              ? "bg-emerald-50 text-emerald-700"
                              : aiAnalysis.recommendation === "review"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {aiAnalysis.recommendation}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Summary</p>
                        <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
                          {aiAnalysis.summary}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Reasoning</p>
                        <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
                          {aiAnalysis.reasoning}
                        </p>
                      </div>

                      {aiAnalysis.skills && aiAnalysis.skills.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500">
                            Key skills detected
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {aiAnalysis.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No AI analysis yet. Run analysis to get a score and
                      recommendation.
                    </p>
                  )}
                </div>

                {/* Email actions */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Email the candidate
                    </p>
                    {isSelectedJobClosed && (
                      <span className="text-[11px] text-slate-500">
                        Emails disabled for closed roles
                      </span>
                    )}
                    {applicantStatus === "rejected" && (
                      <span className="text-[11px] text-rose-600">
                        Candidate rejected
                      </span>
                    )}
                  </div>

                  {emailActionsDisabled ? (
                    <p className="text-xs text-slate-500">
                      {isSelectedJobClosed
                        ? "This role is closed. You can no longer email candidates from here."
                        : applicantStatus === "rejected"
                        ? "This candidate has been rejected. Further actions are disabled."
                        : "Select a candidate to email."}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startEmailFlow("shortlist")}
                          disabled={generatingEmail}
                          className="rounded-lg bg-emerald-500 px-2 py-2 font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                        >
                          Shortlist
                        </button>
                        <button
                          type="button"
                          onClick={() => startEmailFlow("rejection")}
                          disabled={generatingEmail}
                          className="rounded-lg bg-rose-500 px-2 py-2 font-medium text-white hover:bg-rose-600 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => startEmailFlow("interview")}
                          disabled={generatingEmail}
                          className="rounded-lg bg-indigo-500 px-2 py-2 font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                        >
                          Interview
                        </button>
                      </div>

                      {/* small inline confirm bar instead of window.confirm */}
                      {pendingEmailType && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between text-xs">
                          <span className="text-slate-700">
                            Send{" "}
                            <span className="font-semibold">
                              {pendingEmailType === "shortlist"
                                ? "shortlist"
                                : pendingEmailType === "rejection"
                                ? "rejection"
                                : "interview"}
                            </span>{" "}
                            email to {selectedApplicant.applicant_name} (
                            {selectedApplicant.applicant_email})?
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={cancelSendEmail}
                              className="rounded px-2 py-1 bg-slate-200 text-slate-800 hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={confirmSendEmail}
                              disabled={generatingEmail}
                              className="rounded px-2 py-1 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              {generatingEmail ? "Sending…" : "Send"}
                            </button>
                          </div>
                        </div>
                      )}

                      {emailDraftMeta && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] flex items-center justify-between">
                          <span className="text-slate-700">
                            {emailDraftMeta.email_sent
                              ? "Email sent."
                              : "Email not sent."}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-medium ${
                              emailDraftMeta.email_sent
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {emailDraftMeta.email_sent
                              ? "Sent"
                              : "Failed"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* AI assistants */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job creator assistant */}
          <section className="bg-slate-900 text-slate-50 rounded-xl shadow-sm p-5 flex flex-col">
            <p className="text-lg font-semibold mb-2">Job creator assistant</p>
            <p className="mb-3 text-xs text-slate-300">
              Describe the role and this assistant will create a structured job
              post for you.
            </p>

            <div className="flex-1 rounded-lg bg-slate-950/40 border border-slate-700 p-3 mb-3 overflow-y-auto h-64">
              {creatorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-2 ${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block max-w-xs rounded-lg px-3 py-2 text-[13px] ${
                      msg.role === "user"
                        ? "bg-indigo-500 text-white"
                        : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {creatorTyping && (
                <div className="text-left mb-2">
                  <div className="inline-block rounded-lg bg-slate-800 px-3 py-1 text-[12px] text-slate-200">
                    Typing…
                  </div>
                </div>
              )}
              <div ref={creatorEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={creatorInput}
                onChange={(e) => setCreatorInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatorSend()}
                placeholder='Example: "Create Senior React Developer in London £65-85k…"'
                className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={handleCreatorSend}
                disabled={creatorTyping || !creatorInput.trim()}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </section>

          {/* Recruitment assistant */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
            <p className="text-lg font-semibold text-slate-900 mb-2">
              Recruitment insights assistant
            </p>
            <p className="mb-3 text-xs text-slate-600">
              Ask questions about roles and applicants. This uses AI (ChatGPT)
              to analyse your data and suggest next steps.
            </p>

            <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 p-3 mb-3 overflow-y-auto h-64">
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
                        : "bg-white text-slate-900 border border-slate-200"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {assistantTyping && (
                <div className="text-left mb-2">
                  <div className="inline-block rounded-lg bg-white px-3 py-1 text-[12px] text-slate-700 border border-slate-200">
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
                placeholder='Example: "Summarise all shortlisted React candidates"'
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
