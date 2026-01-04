import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = "https://hirechatbackend-dycmdjfgdyhzhhfp.uksouth-01.azurewebsites.net";

// ... (keep all existing fetch functions)

// NEW: Fetch AI analysis for an application
async function fetchAIAnalysis(applicationId, token) {
  const res = await fetch(`${API_BASE}/ai/application/${applicationId}/analysis`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// NEW: Generate email draft
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

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  
  // NEW: AI-related state
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [emailDraft, setEmailDraft] = useState(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);

  // ... (keep existing state for chat)

  const token = localStorage.getItem("access_token");

  // ... (keep all existing useEffects)

  // NEW: Load AI analysis when applicant is selected
  const handleViewApplicant = async (applicant) => {
    setSelectedApplicant(applicant);
    setAiAnalysis(null);
    setEmailDraft(null);
    setLoadingAI(true);

    try {
      const analysis = await fetchAIAnalysis(applicant.id, token);
      setAiAnalysis(analysis);
    } catch (e) {
      console.error("Failed to load AI analysis:", e);
    } finally {
      setLoadingAI(false);
    }
  };

  // NEW: Generate email draft
  const handleGenerateEmail = async (emailType) => {
    if (!selectedApplicant) return;
    
    setGeneratingEmail(true);
    try {
      const draft = await generateEmailDraft(selectedApplicant.id, emailType, token);
      setEmailDraft(draft);
    } catch (e) {
      alert("Failed to generate email: " + e.message);
    } finally {
      setGeneratingEmail(false);
    }
  };

  // ... (keep all existing handler functions)

  if (user?.role !== "hiring_manager") {
    return (
      <div className="p-8">
        <p className="text-red-500">You must be a hiring manager.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
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
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {selectedJob ? `Applicants for ${selectedJob.title}` : "Select a Job"}
            </h2>
            
            {selectedJob ? (
              <>
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
                  <div className="space-y-3">
                    {applicants.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleViewApplicant(app)}
                        className={`p-4 rounded border cursor-pointer transition ${
                          selectedApplicant?.id === app.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">
                              {app.applicant_name || "Unknown"}
                            </h3>
                            <p className="text-sm text-gray-600">{app.applicant_email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied: {new Date(app.created_at).toLocaleDateString()}
                            </p>
                            
                            {/* NEW: Show AI Score Badge */}
                            {app.ai_score && (
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
                                  AI Score: {app.ai_score}/100
                                </span>
                                {app.ai_recommendation && (
                                  <span className="ml-2 text-xs text-gray-600">
                                    ({app.ai_recommendation})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadCV(app.id, app.cv_filename, token);
                            }}
                            className="ml-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            Download CV
                          </button>
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

          {/* Right: Applicant Details with AI Analysis */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow p-6 max-h-[800px] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Applicant Details</h2>
            
            {selectedApplicant ? (
              <div className="space-y-4">
                {/* Applicant Info */}
                <div>
                  <h3 className="font-semibold text-lg">{selectedApplicant.applicant_name}</h3>
                  <p className="text-sm text-gray-600">{selectedApplicant.applicant_email}</p>
                </div>

                {/* Cover Letter */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">Cover Letter</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                    {selectedApplicant.cover_letter}
                  </p>
                </div>

                {/* NEW: AI Analysis Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">🤖</span>
                    AI Analysis
                  </h4>
                  
                  {loadingAI ? (
                    <p className="text-sm text-gray-500">Analyzing...</p>
                  ) : aiAnalysis && aiAnalysis.processed ? (
                    <div className="space-y-3">
                      {/* Score */}
                      <div>
                        <span className="text-xs text-gray-600">Match Score</span>
                        <div className="flex items-center mt-1">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
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
                            className={`inline-block px-3 py-1 text-sm rounded font-semibold ${
                              aiAnalysis.recommendation === "shortlist"
                                ? "bg-green-100 text-green-700"
                                : aiAnalysis.recommendation === "review"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {aiAnalysis.recommendation?.toUpperCase()}
                          </span>
                        </p>
                      </div>

                      {/* Summary */}
                      <div>
                        <span className="text-xs text-gray-600">Summary</span>
                        <p className="text-sm text-gray-700 mt-1">{aiAnalysis.summary}</p>
                      </div>

                      {/* Reasoning */}
                      <div>
                        <span className="text-xs text-gray-600">Reasoning</span>
                        <p className="text-sm text-gray-700 mt-1">{aiAnalysis.reasoning}</p>
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
                    <p className="text-sm text-gray-500">No AI analysis available yet</p>
                  )}
                </div>

                {/* NEW: Email Generator Section */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Generate Email</h4>
                  
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleGenerateEmail("shortlist")}
                      disabled={generatingEmail}
                      className="flex-1 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      Shortlist
                    </button>
                    <button
                      onClick={() => handleGenerateEmail("rejection")}
                      disabled={generatingEmail}
                      className="flex-1 px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleGenerateEmail("interview")}
                      disabled={generatingEmail}
                      className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Interview
                    </button>
                  </div>

                  {generatingEmail && (
                    <p className="text-sm text-gray-500">Generating email draft...</p>
                  )}

                  {emailDraft && (
                    <div className="bg-gray-50 p-4 rounded border">
                      <h5 className="font-semibold text-sm mb-2">📧 Draft Email</h5>
                      <div className="mb-3">
                        <span className="text-xs text-gray-600">Subject:</span>
                        <p className="text-sm font-semibold mt-1">{emailDraft.subject}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">Body:</span>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                          {emailDraft.body}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`
                          );
                          alert("Email copied to clipboard!");
                        }}
                        className="mt-3 w-full px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select an applicant to view details</p>
            )}
          </div>
        </div>

        {/* Keep your existing chat sections below */}
        {/* ... */}
      </div>
    </div>
  );
}
