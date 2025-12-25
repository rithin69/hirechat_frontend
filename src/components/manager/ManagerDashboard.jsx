import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatbotPanel from "./ChatbotPanel.jsx";

const API_BASE = "http://127.0.0.1:8000"; // Change to Azure URL for production

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [applicants, setApplicants] = useState({});
  const [loadingApplicants, setLoadingApplicants] = useState({});

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const fetchApplicants = async (jobId) => {
    if (applicants[jobId]) return; // Already loaded

    setLoadingApplicants((prev) => ({ ...prev, [jobId]: true }));

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/jobs/${jobId}/applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setApplicants((prev) => ({ ...prev, [jobId]: data }));
    } catch (error) {
      console.error("Error fetching applicants:", error);
      setApplicants((prev) => ({ ...prev, [jobId]: [] }));
    } finally {
      setLoadingApplicants((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const toggleJobExpansion = (jobId) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      fetchApplicants(jobId);
    }
  };

  const downloadCV = async (applicationId, filename) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE}/applications/${applicationId}/cv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Manager Dashboard
            </h1>
            <p className="text-sm text-slate-600">Welcome, {user?.full_name}</p>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Job Listings */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Your Job Postings
              </h2>

              {jobs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No jobs posted yet. Use the chatbot to create one!
                </p>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="border border-slate-200 rounded-lg p-4 hover:border-purple-300 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {job.title}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {job.location} • £{job.salary_min?.toLocaleString()}{" "}
                            - £{job.salary_max?.toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            job.status === "open"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleJobExpansion(job.id)}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium mt-2"
                      >
                        {expandedJobId === job.id ? "Hide Details" : "View More"}
                      </button>

                      {/* Expanded Section */}
                      {expandedJobId === job.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h4 className="font-medium text-slate-900 mb-2">
                            Description:
                          </h4>
                          <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">
                            {job.description}
                          </p>

                          <h4 className="font-medium text-slate-900 mb-3">
                            Applicants ({applicants[job.id]?.length || 0}):
                          </h4>

                          {loadingApplicants[job.id] ? (
                            <p className="text-sm text-slate-500">
                              Loading applicants...
                            </p>
                          ) : applicants[job.id]?.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              No applicants yet
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {applicants[job.id]?.map((app) => (
                                <div
                                  key={app.id}
                                  className="bg-slate-50 rounded-lg p-3 border border-slate-200"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-medium text-slate-900">
                                        {app.applicant_name || "Applicant"}
                                      </p>
                                      <p className="text-xs text-slate-600">
                                        {app.applicant_email || "No email"}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        Applied:{" "}
                                        {new Date(
                                          app.created_at
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        app.status === "pending"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : app.status === "accepted"
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {app.status}
                                    </span>
                                  </div>

                                  <div className="mt-2">
                                    <p className="text-xs text-slate-600 mb-2">
                                      <strong>Cover Letter:</strong>
                                    </p>
                                    <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 max-h-20 overflow-y-auto">
                                      {app.cover_letter}
                                    </p>
                                  </div>

                                  <button
                                    onClick={() =>
                                      downloadCV(app.id, app.cv_filename)
                                    }
                                    className="mt-3 w-full px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Chatbot */}
          {/* <div className="lg:sticky lg:top-24 h-fit">
            <ChatbotPanel onJobCreated={fetchJobs} />
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
