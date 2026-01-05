import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = "https://hirechatbackend-dycmdjfgdyhzhhfp.uksouth-01.azurewebsites.net";

// Fetch all jobs
async function fetchJobs(token) {
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

// Create a new job
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

// Close a job
async function closeJob(jobId, token) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/close`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to close job");
  return res.json();
}

// Fetch applications for a job
async function fetchApplicationsByJob(jobId, token) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
  return res.json();
}

// Download CV
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

  // Job Creator Chat State
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

  // AI Recruitment Assistant State
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

  // Load jobs on mount
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

  // Auto-scroll for creator chat
  useEffect(() => {
    creatorEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [creatorMessages]);

  // Auto-scroll for assistant chat
  useEffect(() => {
    assistantEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistantMessages]);

  // Load applicants when job is selected
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

  // Add message to creator chat
  const addCreatorMessage = (role, content) => {
    setCreatorMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

  // Add message to assistant chat
  const addAssistantMessage = (role, content) => {
    setAssistantMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role, content, timestamp: new Date() },
    ]);
  };

  // Process job creation from natural language
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
          title =
            afterCreateClean.split(/\s+(job|role|position|in|at|for|with|salary|£|\d)/i)[0]?.trim() || "";
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

  // Handle job creator send
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

  // Handle assistant send
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

  // Handle close job
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-red-600 font-semibold">You must be a hiring manager.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Manager Dashboard</h1>
        <p className="text-gray-600 mb-6">Welcome back, {user?.full_name}</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Jobs</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {jobs.filter((j) => j.status === "open").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Jobs</h3>
            <p className="text-3xl font-bold text-gray-800 mt-2">{jobs.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Applications</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{applicants.length}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Job List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Jobs</h2>
            {loading ? (
              <p className="text-gray-500">Loading…</p>
            ) : jobs.length === 0 ? (
              <p className="text-gray-500">No jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`p-4 rounded border cursor-pointer transition ${
                      selectedJob?.id === job.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <h3 className="font-semibold text-gray-800">{job.title}</h3>
                    <p className="text-sm text-gray-600">
                      {job.location} • £{job.salary_min}–£{job.salary_max}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                        job.status === "open"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Middle: Applicant List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedJob ? `Applicants for ${selectedJob.title}` : "Select a Job"}
            </h2>

            {selectedJob ? (
              <>
                <div className="mb-4 p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">
                    {selectedJob.location || "No location"} • £{selectedJob.salary_min}–£
                    {selectedJob.salary_max}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">{selectedJob.description}</p>
                </div>

                {selectedJob.status === "closed" && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">This job is closed</p>
                  </div>
                )}

                {loadingApplicants ? (
                  <p className="text-gray-500">Loading applicants...</p>
                ) : applicants.length === 0 ? (
                  <p className="text-gray-500">No applicants yet</p>
                ) : (
                  <div className="space-y-4">
                    {applicants.map((app) => (
                      <div key={app.id} className="p-4 border border-gray-200 rounded">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">
                              {app.applicant_name || "Unknown"}
                            </h3>
                            <p className="text-sm text-gray-600">{app.applicant_email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied: {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => downloadCV(app.id, app.cv_filename, token)}
                            className="ml-4 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Download CV
                          </button>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-700">Cover Letter:</p>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {app.cover_letter}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedJob.status === "open" && (
                  <button
                    onClick={() => handleCloseJob(selectedJob.id)}
                    className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Close Job
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500">Select a job to view applicants</p>
            )}
          </div>
        </div>

        {/* Chat Interfaces */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Creator Chat */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🤖 Job Creator Assistant</h2>
            <div className="h-96 overflow-y-auto mb-4 border border-gray-200 rounded p-4 bg-gray-50">
              {creatorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {creatorTyping && (
                <div className="text-left mb-4">
                  <div className="inline-block max-w-xs px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
                    <p className="text-sm">Typing...</p>
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
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleCreatorSend}
                disabled={creatorTyping || !creatorInput.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>

          {/* AI Recruitment Assistant */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">💬 AI Recruitment Assistant</h2>
            <div className="h-96 overflow-y-auto mb-4 border border-gray-200 rounded p-4 bg-gray-50">
              {assistantMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block max-w-xs px-4 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {assistantTyping && (
                <div className="text-left mb-4">
                  <div className="inline-block max-w-xs px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
                    <p className="text-sm">Typing...</p>
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
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
              />
              <button
                onClick={handleAssistantSend}
                disabled={assistantTyping || !assistantInput.trim()}
                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
