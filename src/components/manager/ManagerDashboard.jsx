import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = "https://hirechatbackend-dycmdjfgdyhzhhfp.uksouth-01.azurewebsites.net";

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
    const response = await fetch(`${API_BASE}/applications/${applicationId}/cv`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to download CV");
    }

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

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const [creatorMessages, setCreatorMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        '👋 Welcome! I can help you create job postings. Just describe the role.\n\nExample: "Create Senior React Developer in London £65-85k with description XYZ"',
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
        '👋 I\'m your AI recruitment assistant. Ask me anything!\n\nExamples:\n• "Show me all open jobs"\n• "List applicants for Python Developer"\n• "How many applications do we have?"',
      timestamp: new Date(),
    },
  ]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantTyping, setAssistantTyping] = useState(false);
  const assistantEndRef = useRef(null);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchJobs(token);
        if (!cancelled) setJobs(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    creatorEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [creatorMessages]);

  useEffect(() => {
    assistantEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistantMessages]);

  // Fetch applicants when job is selected
  useEffect(() => {
    if (selectedJob) {
      setLoadingApplicants(true);
      fetchApplicationsByJob(selectedJob.id, token)
        .then((data) => setApplicants(data))
        .catch((e) => {
          console.error("Failed to load applicants:", e);
          setApplicants([]);
        })
        .finally(() => setLoadingApplicants(false));
    } else {
      setApplicants([]);
    }
  }, [selectedJob, token]);

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

  const processJobCreation = async (message) => {
    const lowerMsg = message.toLowerCase();
    let title = "";
    let description = "";
    
    if (lowerMsg.includes("create ")) {
      const afterCreate = message.split(/create\s+/i)[1] || "";
      
      if (lowerMsg.includes("with description") || lowerMsg.includes("description")) {
        const descMatch = message.match(/(?:with\s+)?description\s+(.+)/i);
        if (descMatch) {
          description = descMatch[1].trim();
          const beforeDesc = message.split(/(?:with\s+)?description/i)[0];
          const afterCreateClean = beforeDesc.split(/create\s+/i)[1] || "";
          title = afterCreateClean.split(/\s+(job|role|position|in|at|for|with|salary|£|\d)/i)[0]?.trim() || "";
        }
      } else {
        title = afterCreate.split(/\s+(job|role|position|in|at|for|with|salary|£|\d)/i)[0]?.trim() || "";
      }
      
      title = title.replace(/^(a|an|the)\s+/i, "").trim();
    }
    
    if (title) {
      title = title
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
  
    let location = "";
    const locations = ["london", "remote", "hybrid", "manchester", "edinburgh"];
    for (const loc of locations) {
      if (lowerMsg.includes(loc)) {
        location = loc.charAt(0).toUpperCase() + loc.slice(1);
        break;
      }
    }
  
    let salaryMin = 40000;
    let salaryMax = 70000;
    const salaryMatch = lowerMsg.match(
      /£?(\d+(?:,\d+)?)(k?|000?)\s*(?:-|–|to)\s*£?(\d+(?:,\d+)?)(k?|000?)/i
    );
    if (salaryMatch) {
      salaryMin =
        parseInt(salaryMatch[1].replace(/,/g, "")) *
        (salaryMatch[2].toLowerCase().includes("k") ? 1000 : 1);
      salaryMax =
        parseInt(salaryMatch[3].replace(/,/g, "")) *
        (salaryMatch[4].toLowerCase().includes("k") ? 1000 : 1);
    }
  
    if (!description) {
      description = `Looking for a ${title || "talented professional"}.`;
    }
  
    return { title, description, location, salary_min: salaryMin, salary_max: salaryMax };
  };

  const handleCreatorSend = async () => {
    if (!creatorInput.trim()) return;
    const userMsg = creatorInput.trim();
    addCreatorMessage("user", userMsg);
    setCreatorInput("");
    setCreatorTyping(true);

    setTimeout(async () => {
      const lowerMsg = userMsg.toLowerCase();
      if (lowerMsg.includes("create") || lowerMsg.includes("hire") || lowerMsg.includes("post")) {
        addCreatorMessage("assistant", "Got it! Creating a new job posting...");
        try {
          const jobData = await processJobCreation(userMsg);
          if (!jobData.title) {
            addCreatorMessage(
              "assistant",
              '❌ I couldn\'t extract the job title. Try:\n"Create [Job Title] in [Location] £[Min]-[Max]k"'
            );
            setCreatorTyping(false);
            return;
          }
          const created = await createJob(jobData, token);
          setJobs((prev) => [created, ...prev]);
          addCreatorMessage(
            "assistant",
            `✅ Job created!\n\n**${created.title}**\n📍 ${created.location || "No location"} | 💰 £${created.salary_min}–£${created.salary_max}\n\n${created.description}`
          );
        } catch (e) {
          addCreatorMessage("assistant", `❌ Failed: ${e.message}`);
        }
      } else {
        addCreatorMessage(
          "assistant",
          'I only create jobs. Format:\n"Create [Job Title] in [Location] £[Min]-[Max]k"'
        );
      }
      setCreatorTyping(false);
    }, 1000);
  };

  const handleAssistantSend = async () => {
    if (!assistantInput.trim()) return;
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

      if (!res.ok) {
        throw new Error("Failed to get response from AI agent");
      }

      const data = await res.json();
      addAssistantMessage("assistant", data.answer);
    } catch (e) {
      addAssistantMessage("assistant", `❌ Error: ${e.message}`);
    } finally {
      setAssistantTyping(false);
    }
  };

  const handleCloseJob = async (jobId) => {
    try {
      const updated = await closeJob(jobId, token);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      setSelectedJob(null);
    } catch (e) {
      alert(`Failed to close job: ${e.message}`);
    }
  };

  if (user?.role !== "hiring_manager") {
    return <p className="text-sm text-red-400">You must be a hiring manager.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Active Jobs</p>
          <p className="text-2xl font-semibold text-slate-50">
            {jobs.filter((j) => j.status === "open").length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Total Jobs</p>
          <p className="text-2xl font-semibold text-slate-50">{jobs.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm shadow-black/30">
          <h2 className="mb-3 text-base font-semibold text-slate-50">AI Job Creator</h2>
          <p className="mb-3 text-xs text-slate-400">
         
          </p>
          <div className="mb-4 h-96 space-y-3 overflow-y-auto rounded-lg bg-slate-950/50 p-4">
            {creatorMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-slate-800 text-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {creatorTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                  </div>
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
              onKeyPress={(e) => e.key === "Enter" && handleCreatorSend()}
              placeholder='e.g. "Create Frontend Engineer London £55-75k"'
              className="flex-1 rounded-md border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            />
            <button
              onClick={handleCreatorSend}
              disabled={!creatorInput.trim() || creatorTyping}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm shadow-black/30">
          <h2 className="mb-3 text-base font-semibold text-slate-50">Recruitment Assistant</h2>
          <p className="mb-3 text-xs text-slate-400">
   
          </p>
          <div className="mb-4 h-96 space-y-3 overflow-y-auto rounded-lg bg-slate-950/50 p-4">
            {assistantMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-slate-800 text-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {assistantTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.1s]" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                  </div>
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
              onKeyPress={(e) => e.key === "Enter" && handleAssistantSend()}
              placeholder='e.g. "Show me all open jobs"'
              className="flex-1 rounded-md border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            />
            <button
              onClick={handleAssistantSend}
              disabled={!assistantInput.trim() || assistantTyping}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-50">Your Jobs</h3>
        {loading ? (
          <p className="text-xs text-slate-300">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-slate-300">No jobs yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg bg-slate-950 p-3 text-xs cursor-pointer hover:bg-slate-900 transition"
                onClick={() => setSelectedJob(job)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-sm">{job.title}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      job.status === "open"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-gray-900/30 text-gray-400"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="text-slate-400">
                  {job.location || "No location"} • £{job.salary_min}–£{job.salary_max}
                </div>
                <button
                  className="mt-2 text-blue-400 hover:text-blue-300 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedJob(job);
                  }}
                >
                  Click to know more →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Details Modal with Applicants */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-slate-900 rounded-xl p-6 max-w-3xl w-full border border-slate-800 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-50">{selectedJob.title}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  {selectedJob.location || "No location"} • £{selectedJob.salary_min}–£
                  {selectedJob.salary_max}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  selectedJob.status === "open"
                    ? "bg-green-900/30 text-green-400"
                    : "bg-gray-900/30 text-gray-400"
                }`}
              >
                {selectedJob.status}
              </span>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
              <p className="text-sm text-slate-400">{selectedJob.description}</p>
            </div>

            {/* Applicants Section */}
            <div className="mb-4 border-t border-slate-800 pt-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                Applicants ({applicants.length})
              </h3>

              {loadingApplicants ? (
                <p className="text-xs text-slate-400">Loading applicants...</p>
              ) : applicants.length === 0 ? (
                <p className="text-xs text-slate-400">No applicants yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {applicants.map((app) => (
                    <div
                      key={app.id}
                      className="bg-slate-950 rounded-lg p-4 border border-slate-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-slate-100">
                            {app.applicant_name || "Unknown"}
                          </p>
                          <p className="text-xs text-slate-400">{app.applicant_email}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Applied: {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            app.status === "pending"
                              ? "bg-yellow-900/30 text-yellow-400"
                              : app.status === "accepted"
                              ? "bg-green-900/30 text-green-400"
                              : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-slate-400 mb-1">
                          <strong>Cover Letter:</strong>
                        </p>
                        <p className="text-xs text-slate-300 bg-slate-900 p-2 rounded max-h-24 overflow-y-auto">
                          {app.cover_letter}
                        </p>
                      </div>

                      <button
                        onClick={() => downloadCV(app.id, app.cv_filename, token)}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Download CV ({app.cv_filename})
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-800 pt-4">
              {selectedJob.status === "open" && (
                <button
                  onClick={() => handleCloseJob(selectedJob.id)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                >
                  Close Job
                </button>
              )}
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
