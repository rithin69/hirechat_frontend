import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const API_BASE = "https://hirechatbackend-dycmdjfgdyhzhhfp.uksouth-01.azurewebsites.net";

async function fetchJobs(token) {  
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: { Authorization: `Bearer ${token}` },  
  });
  if (!res.ok) throw new Error("Failed to fetch job");
  return res.json();
}

async function applyToJob({ jobId, coverLetter, cvFile }, token) {
  const formData = new FormData();
  formData.append("job_id", jobId);
  formData.append("cover_letter", coverLetter);
  formData.append("cv", cvFile);

  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit application");
  }

  return res.json();
}

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);  

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob || !cvFile) {
      setError("Please choose a job and upload your CV.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await applyToJob(
        {
          jobId: selectedJob.id,
          coverLetter,
          cvFile,
        },
        token
      );
      setSuccess("Application submitted successfully.");
      setCoverLetter("");
      setCvFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== "applicant") {
    return (
      <p className="text-sm text-red-400">
        You must be an applicant to view this dashboard.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-50">
              Browse roles
            </h2>
            <p className="text-xs text-slate-400">
              Pick a role to see details and apply.
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] text-slate-300">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} available
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-slate-300">
            No jobs are currently available. Please check back later.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  selectedJob?.id === job.id
                    ? "border-blue-500 bg-slate-900 shadow-sm shadow-blue-900/40"
                    : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-50">
                    {job.title}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {job.location}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-300">
                  {job.description}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  £{job.salary_min} – £{job.salary_max} •{" "}
                  <span className="uppercase tracking-wide">
                    {job.status}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm shadow-black/30">
        <h2 className="mb-3 text-base font-semibold text-slate-50">
          Apply for a role
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-slate-300">
            Selected job:{" "}
            <span className="font-semibold text-slate-50">
              {selectedJob ? selectedJob.title : "none selected"}
            </span>
          </p>

          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Write a brief cover letter introducing yourself and why you're a good fit."
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            rows={4}
            required
          />

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              CV / Resume
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files[0] || null)}
              className="block w-full text-xs text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-blue-500"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-emerald-400">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}
