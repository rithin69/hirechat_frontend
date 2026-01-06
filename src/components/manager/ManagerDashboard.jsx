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

// Fetch AI analysis for an application
async function fetchAIAnalysis(applicationId, token) {
  const res = await fetch(`${API_BASE}/ai/application/${applicationId}/analysis`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Generate email draft
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

// Trigger AI analysis manually
async function triggerAIAnalysis(applicationId, token) {
  const res = await fetch(`${API_BASE}/ai/analyze-application`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      application_id: applicationId,
    }),
  });
  if (!res.ok) throw new Error("Failed to trigger AI analysis");
  return res.json();
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // AI-related state
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [emailDraft, setEmailDraft] = useState(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [analyzingCV, setAnalyzingCV] = useState(false);
  const [analyzingAppId, setAnalyzingAppId] = useState(null);

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

  // Use ref to track mounted state for cleanup
  const isMountedRef = useRef(true);

  const token = localStorage.getItem("access_token");

  // Load jobs on mount with cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    async function load() {
      if (!token) return;
      
      try {
        const data = await fetchJobs(token);
        if (isMountedRef.current) {
          setJobs(data);
        }
      } catch (e) {
        if (isMountedRef.current) {
          setError(e.message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }
    
    load();
    
    return () => {
      isMountedRef.current = false;
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

  // Load applicants when job is selected with cleanup
  useEffect(() => {
    let isCancelled = false;
    
    if (selectedJob && token) {
      setLoadingApplicants(true);
      setSelectedApplicant(null);
      
      fetchApplicationsByJob(selectedJob.id, token)
        .then((data) => {
          if (!isCancelled && isMountedRef.current) {
            setApplicants(data);
          }
        })
        .catch((e) => {
          console.error("Failed to load applicants:", e);
          if (!isCancelled && isMountedRef.current) {
            setApplicants([]);
          }
        })
        .finally(() => {
          if (!isCancelled && isMountedRef.current) {
            setLoadingApplicants(false);
          }
        });
    } else {
      setApplicants([]);
    }
    
    return () => {
      isCancelled = true;
    };
  }, [selectedJob, token]);

  // Load AI analysis when applicant is selected with cleanup
  const handleViewApplicant = async (applicant) => {
    setSelectedApplicant(applicant);
    setAiAnalysis(null);
    setEmailDraft(null);
    setLoadingAI(true);

    try {
      const analysis = await fetchAIAnalysis(applicant.id, token);
      if (isMountedRef.current) {
        setAiAnalysis(analysis);
      }
    } catch (e) {
      console.error("Failed to load AI analysis:", e);
    } finally {
      if (isMountedRef.current) {
        setLoadingAI(false);
      }
    }
  };

  // Trigger AI analysis with auto-reload and cleanup
  const handleAnalyzeCV = async (applicantId) => {
    if (!selectedJob || !token) return;
    
    setAnalyzingCV(true);
    setAnalyzingAppId(applicantId);
    
    try {
      await triggerAIAnalysis(applicantId, token);
      console.log("AI analysis started for application:", applicantId);
      
      let attempts = 0;
      const maxAttempts = 15;
      
      const checkInterval = setInterval(async () => {
        attempts++;
        
        try {
          const updatedApplicants = await fetchApplicationsByJob(selectedJob.id, token);
          
          if (isMountedRef.current) {
            setApplicants(updatedApplicants);
            
            const updatedApplicant = updatedApplicants.find(a => a.id === applicantId);
            
            if (updatedApplicant?.ai_score !== null && updatedApplicant?.ai_score !== undefined) {
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
              console.log("AI analysis complete!");
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              if (isMountedRef.current) {
                setAnalyzingCV(false);
                setAnalyzingAppId(null);
                alert("AI analysis is taking longer than expected. Please check back later or try again.");
              }
            }
          } else {
            clearInterval(checkInterval);
          }
        } catch (error) {
          console.error("Error checking AI status:", error);
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

  // Generate and send email
  const handleGenerateEmail = async (emailType) => {
    if (!selectedApplicant || !token) return;

    const emailTypeLabels = {
      shortlist: "Shortlist",
      rejection: "Rejection",
      interview: "Interview Invitation"
    };
    
    const confirmed = window.confirm(
      `Send ${emailTypeLabels[emailType]} email to ${selectedApplicant.applicant_name} (${selectedApplicant.applicant_email})?`
    );
    
    if (!confirmed) return;

    setGeneratingEmail(true);
    setEmailDraft(null);
    
    try {
      const draft = await generateEmailDraft(selectedApplicant.id, emailType, token);
      
      if (isMountedRef.current) {
        if (draft.email_sent) {
          alert(`✅ Email sent successfully to ${draft.recipient_email}!`);
        } else {
          alert(`⚠️ Failed to send email: ${draft.message || 'Unknown error'}`);
        }
        setEmailDraft(draft);
      }
    } catch (e) {
      if (isMountedRef.current) {
        alert("❌ Failed to send email: " + e.message);
      }
    } finally {
      if (isMountedRef.current) {
        setGeneratingEmail(false);
      }
    }
  };

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
    if (!creatorInput.trim() || !token) return;
    
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
            if (isMountedRef.current) {
              setCreatorTyping(false);
            }
            return;
          }
          const created = await createJob(jobData, token);
          if (isMountedRef.current) {
            setJobs((prev) => [created, ...prev]);
            addCreatorMessage(
              "assistant",
              `✅ Job created!\n\n**${created.title}**\n📍 ${created.location || "No location"} | 💰 £${created.salary_min}–£${created.salary_max}\n\n${created.description}`
            );
          }
        } catch (e) {
          if (isMountedRef.current) {
            addCreatorMessage("assistant", `❌ Failed: ${e.message}`);
          }
        }
      } else {
        addCreatorMessage(
          "assistant",
          'I only create jobs. Format:\n"Create [Job Title] in [Location] £[Min]-[Max]k"'
        );
      }
      if (isMountedRef.current) {
        setCreatorTyping(false);
      }
    }, 1000);
  };

  // Handle assistant send
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

      if (!res.ok) {
        throw new Error("Failed to get response from AI agent");
      }

      const data = await res.json();
      if (isMountedRef.current) {
        addAssistantMessage("assistant", data.answer);
      }
    } catch (e) {
      if (isMountedRef.current) {
        addAssistantMessage("assistant", `❌ Error: ${e.message}`);
      }
    } finally {
      if (isMountedRef.current) {
        setAssistantTyping(false);
      }
    }
  };

  // Handle close job
  const handleCloseJob = async (jobId) => {
    if (!token) return;
    
    try {
      const updated = await closeJob(jobId, token);
      if (isMountedRef.current) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
        setSelectedJob(null);
      }
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

        {/* Main Content Grid - 3 COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left: Job List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Your Jobs</h2>
            {loading ? (
              <p className="text-gray-500">Loading…</p>
            ) : jobs.length === 0 ? (
              <p className="text-gray-500">No jobs yet.</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedJob ? `Applicants` : "Select a Job"}
            </h2>

            {selectedJob && (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <h3 className="font-semibold text-gray-800">{selectedJob.title}</h3>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedJob.location} • £{selectedJob.salary_min}–£{selectedJob.salary_max}
                </p>
              </div>
            )}

            {selectedJob ? (
              <>
                {loadingApplicants ? (
                  <p className="text-gray-500">Loading applicants...</p>
                ) : applicants.length === 0 ? (
                  <p className="text-gray-500">No applicants yet</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {applicants.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleViewApplicant(app)}
                        className={`p-3 rounded border cursor-pointer transition ${
                          selectedApplicant?.id === app.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-gray-800">
                              {app.applicant_name || "Unknown"}
                            </h3>
                            <p className="text-xs text-gray-600">{app.applicant_email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(app.created_at).toLocaleDateString()}
                            </p>

                            {/* AI Score Badge */}
                            {app.ai_score !== null && app.ai_score !== undefined ? (
                              <div className="mt-2">
                                <span
                                  className={`inline-block px-2 py-1 text-xs rounded font-semibold ${
                                    app.ai_score >= 80
                                      ? "bg-green-100 text-green-700"
                                      : app.ai_score >= 60
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  🤖 {app.ai_score}/100
                                </span>
                                {app.ai_recommendation && (
                                  <span className="ml-2 text-xs text-gray-600 capitalize">
                                    {app.ai_recommendation}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeCV(app.id);
                                }}
                                disabled={analyzingCV && analyzingAppId === app.id}
                                className="mt-2 text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                              >
                                {analyzingCV && analyzingAppId === app.id ? (
                                  <>
                                    <span className="animate-spin">⏳</span> Analyzing...
                                  </>
                                ) : (
                                  "🤖 Analyze with AI"
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedJob.status === "open" && (
                  <button
                    onClick={() => handleCloseJob(selectedJob.id)}
                    className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Close Job
                  </button>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-sm">Select a job to view applicants</p>
            )}
          </div>

          {/* Right: Applicant Details with AI Analysis */}
          <div className="bg-white rounded-lg shadow p-6 max-h-[700px] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Applicant Details</h2>

            {selectedApplicant ? (
              <div className="space-y-4">
                {/* Applicant Info */}
                <div>
                  <h3 className="font-semibold text-lg">{selectedApplicant.applicant_name}</h3>
                  <p className="text-sm text-gray-600">{selectedApplicant.applicant_email}</p>
                  <button
                    onClick={() => downloadCV(selectedApplicant.id, selectedApplicant.cv_filename, token)}
                    className="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    📄 Download CV
                  </button>
                </div>

                {/* Cover Letter */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Cover Letter</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                    {selectedApplicant.cover_letter}
                  </p>
                </div>

                {/* AI Analysis Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">🤖</span>
                    AI Analysis
                  </h4>

                  {loadingAI ? (
                    <p className="text-sm text-gray-500">Loading analysis...</p>
                  ) : aiAnalysis && aiAnalysis.processed ? (
                    <div className="space-y-3">
                      {/* Score */}
                      <div>
                        <span className="text-xs text-gray-600">Match Score</span>
                        <div className="flex items-center mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                aiAnalysis.score >= 80
                                  ? "bg-green-500"
                                  : aiAnalysis.score >= 60
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${aiAnalysis.score}%` }}
                            />
                          </div>
                          <span className="ml-3 text-sm font-semibold">{aiAnalysis.score}/100</span>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div>
                        <span className="text-xs text-gray-600">Recommendation</span>
                        <p className="mt-1">
                          <span
                            className={`inline-block px-3 py-1 text-sm rounded font-semibold capitalize ${
                              aiAnalysis.recommendation === "shortlist"
                                ? "bg-green-100 text-green-700"
                                : aiAnalysis.recommendation === "review"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {aiAnalysis.recommendation}
                          </span>
                        </p>
                      </div>

                      {/* Summary */}
                      <div>
                        <span className="text-xs text-gray-600">Summary</span>
                        <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                          {aiAnalysis.summary}
                        </p>
                      </div>

                      {/* Reasoning */}
                      <div>
                        <span className="text-xs text-gray-600">Reasoning</span>
                        <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                          {aiAnalysis.reasoning}
                        </p>
                      </div>

                      {/* Skills */}
                      {aiAnalysis.skills && aiAnalysis.skills.length > 0 && (
                        <div>
                          <span className="text-xs text-gray-600">Extracted Skills</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {aiAnalysis.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-500 mb-3">
                        {selectedApplicant.ai_processed === false 
                          ? "AI analysis not started yet" 
                          : "No AI analysis available"}
                      </p>
                      <button
                        onClick={() => handleAnalyzeCV(selectedApplicant.id)}
                        disabled={analyzingCV}
                        className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {analyzingCV && analyzingAppId === selectedApplicant.id ? (
                          <>
                            <span className="animate-spin">⏳</span> Analyzing...
                          </>
                        ) : (
                          <>🤖 Run AI Analysis</>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Email Generator Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">📧 Generate Email</h4>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button
                      onClick={() => handleGenerateEmail("shortlist")}
                      disabled={generatingEmail}
                      className="px-2 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      ✅ Shortlist
                    </button>
                    <button
                      onClick={() => handleGenerateEmail("rejection")}
                      disabled={generatingEmail}
                      className="px-2 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={() => handleGenerateEmail("interview")}
                      disabled={generatingEmail}
                      className="px-2 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      📅 Interview
                    </button>
                  </div>

                  {generatingEmail && (
                    <p className="text-sm text-gray-500">Generating and sending email...</p>
                  )}

                  {emailDraft && (
                    <div className="bg-gray-50 p-4 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-sm">📧 Email {emailDraft.email_sent ? 'Sent' : 'Draft'}</h5>
                        {emailDraft.email_sent ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-semibold">
                            ✅ Sent to {emailDraft.recipient_email}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-semibold">
                            ❌ Not Sent
                          </span>
                        )}
                      </div>
                      <div className="mb-3">
                        <span className="text-xs text-gray-600">Subject:</span>
                        <p className="text-sm font-semibold mt-1">{emailDraft.subject}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Body:</span>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {emailDraft.body}
                        </p>
                      </div>
                      {emailDraft.message && (
                        <p className="text-xs text-gray-500 mt-2">
                          {emailDraft.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select an applicant to view details</p>
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-gray-900 bg-white"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 text-gray-900 bg-white"
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
