import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, MessageSquarePlus, ShieldCheck, X } from "lucide-react";
import { TAMALE_COMMUNITIES } from "../data/tamaleExpansionData";
import { CommunitySubmission, SubmissionCategory } from "../types/game";

interface CommunityPortalModalProps {
  onClose: () => void;
  onSubmissionNotice?: (msg: string) => void;
}

const CATEGORY_OPTIONS: Array<{ id: SubmissionCategory; label: string }> = [
  { id: "location", label: "Neighbourhood / Place Detail" },
  { id: "architectural_reference", label: "House / Architecture Reference" },
  { id: "event", label: "Community / Cultural Event" },
  { id: "historical_record", label: "Historical Record" },
  { id: "dagbani_expression", label: "Dagbani Term / Proverb" },
  { id: "photograph", label: "Licensed Photograph Reference" },
];

export const CommunityPortalModal: React.FC<CommunityPortalModalProps> = ({
  onClose,
  onSubmissionNotice,
}) => {
  const [tab, setTab] = useState<"submit" | "queue">("queue");
  const [submissions, setSubmissions] = useState<CommunitySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submission form fields
  const [contributorName, setContributorName] = useState("");
  const [contributorAffiliation, setContributorAffiliation] = useState("");
  const [category, setCategory] = useState<SubmissionCategory>("location");
  const [community, setCommunity] = useState(TAMALE_COMMUNITIES[0].name);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dagbaniTerm, setDagbaniTerm] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [sourceAndPermission, setSourceAndPermission] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Curator review state
  const [reviewerNoteMap, setReviewerNoteMap] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/contributions");
      if (!res.ok) throw new Error("Failed to load community archive");
      const data = await res.json();
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
    } catch {
      setErrorMsg("Could not reach the Tamale 3D contribution archive server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributorName.trim() || !title.trim() || !description.trim() || !sourceAndPermission.trim()) {
      setErrorMsg("Please fill in your name, title, description, and source/permission statement.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributorName: contributorName.trim(),
          contributorAffiliation: contributorAffiliation.trim() || "Tamale Community Contributor",
          category,
          title: title.trim(),
          community,
          description: description.trim(),
          dagbaniTerm: dagbaniTerm.trim() || undefined,
          mediaUrl: mediaUrl.trim() || undefined,
          sourceAndPermission: sourceAndPermission.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }
      setSubmissions((prev) => [data.submission, ...prev]);
      setTitle("");
      setDescription("");
      setDagbaniTerm("");
      setMediaUrl("");
      setSourceAndPermission("");
      setTab("queue");
      onSubmissionNotice?.("Contribution submitted for cultural & geographical review.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not submit contribution.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, status: "approved" | "needs_revision") => {
    setReviewingId(id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/contributions/${encodeURIComponent(id)}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewerNote:
            reviewerNoteMap[id]?.trim() ||
            (status === "approved"
              ? "Verified against Tamale community documentation."
              : "Please clarify location coordinates or source attribution."),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review update failed");
      setSubmissions((prev) => prev.map((s) => (s.id === id ? data.submission : s)));
      onSubmissionNotice?.(
        status === "approved"
          ? "Submission approved and added to Tamale archive."
          : "Marked as needs revision."
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to update review status.");
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-4xl bg-[#171411] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f8f5ef] flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-amber-400" />
              <span>Tamale Community Contributions &amp; Verification</span>
            </h2>
            <p className="text-xs text-[#b5ada0] mt-0.5">
              Residents, researchers, and Dagbani speakers can contribute place notes, photos, events, and proverbs for verification before entering the world.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#bfb7aa] hover:text-white rounded-md hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-2.5 border-b border-white/10 bg-[#12100e] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("queue")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              tab === "queue"
                ? "bg-amber-500 text-[#12100e] font-semibold"
                : "text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            Archive &amp; Review Queue ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("submit")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              tab === "submit"
                ? "bg-amber-500 text-[#12100e] font-semibold"
                : "text-[#cfc8bc] hover:bg-white/10"
            }`}
          >
            Submit Tamale Knowledge
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="text-xs text-red-300 bg-red-950/50 border border-red-500/40 rounded-lg px-4 py-2.5">
              {errorMsg}
            </div>
          )}

          {tab === "submit" && (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#b5ada0] mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                    placeholder="e.g. Mariama Yakubu"
                    className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#b5ada0] mb-1">
                    Community / Affiliation
                  </label>
                  <input
                    type="text"
                    value={contributorAffiliation}
                    onChange={(e) => setContributorAffiliation(e.target.value)}
                    placeholder="e.g. UDS Student · Kalpohin"
                    className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#b5ada0] mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SubmissionCategory)}
                    className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#b5ada0] mb-1">Tamale Community *</label>
                  <select
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                  >
                    {TAMALE_COMMUNITIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#b5ada0] mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Evening Waakye Stall near Lamashegu Junction"
                  className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-[#b5ada0] mb-1">
                  Detailed Description / Architectural or Cultural Notes *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe layout, colours, daily rhythm, or cultural meaning accurately..."
                  className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#b5ada0] mb-1">
                    Verified Dagbani Term (Optional)
                  </label>
                  <input
                    type="text"
                    value={dagbaniTerm}
                    onChange={(e) => setDagbaniTerm(e.target.value)}
                    placeholder="Use accurate ɛ, ɔ, ɣ, ŋ if known"
                    className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#b5ada0] mb-1">
                    Wikimedia / Source URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://commons.wikimedia.org/..."
                    className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#b5ada0] mb-1">
                  Source Attribution &amp; Permission Statement *
                </label>
                <input
                  type="text"
                  value={sourceAndPermission}
                  onChange={(e) => setSourceAndPermission(e.target.value)}
                  placeholder="e.g. Original field observation / CC BY-SA 4.0 photograph permission"
                  className="w-full px-3 py-2 bg-[#100e0c] border border-white/15 rounded-lg text-sm text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTab("queue")}
                  className="px-4 py-2 text-xs text-[#cfc8bc] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#12100e] font-semibold text-xs rounded-lg cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Submit for Curator Review"}
                </button>
              </div>
            </form>
          )}

          {tab === "queue" && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-xs text-[#b5ada0] py-8 text-center">
                  Loading community submissions...
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-xs text-[#b5ada0] py-8 text-center">
                  No submissions yet. Be the first to contribute Tamale local knowledge.
                </div>
              ) : (
                submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-[#12100e] border border-white/10 rounded-xl p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {sub.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified &amp; Approved</span>
                          </span>
                        ) : sub.status === "needs_revision" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300">
                            <span>Needs Revision</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
                            <Clock3 className="w-3 h-3" />
                            <span>Pending Curator Review</span>
                          </span>
                        )}
                        <span className="text-xs text-amber-400 font-medium">{sub.community}</span>
                      </div>
                      <span className="text-[11px] text-[#8e8679]">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-base font-bold text-[#f8f5ef]">
                        {sub.title}
                      </h3>
                      <div className="text-[11px] text-[#a39b8e]">
                        By {sub.contributorName} ({sub.contributorAffiliation})
                      </div>
                    </div>

                    <p className="text-xs text-[#cfc8bc] leading-relaxed">{sub.description}</p>

                    {sub.dagbaniTerm && (
                      <div className="text-xs text-amber-300">
                        Dagbani Term: {sub.dagbaniTerm}
                      </div>
                    )}

                    <div className="text-[11px] text-[#9c9487] border-t border-white/10 pt-2 flex flex-wrap justify-between gap-2">
                      <span>Source/Permission: {sub.sourceAndPermission}</span>
                      {sub.mediaUrl && (
                        <a
                          href={sub.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline"
                        >
                          View Media Reference
                        </a>
                      )}
                    </div>

                    {sub.reviewerNote && (
                      <div className="text-[11px] text-emerald-300/90 bg-[#181512] border border-white/10 rounded px-3 py-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Curator Note: {sub.reviewerNote}</span>
                      </div>
                    )}

                    {sub.status !== "approved" && (
                      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={reviewerNoteMap[sub.id] ?? ""}
                          onChange={(e) =>
                            setReviewerNoteMap((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          placeholder="Curator verification note (optional)..."
                          className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-[#0c0b09] border border-white/12 rounded text-xs text-[#f8f5ef] focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          disabled={reviewingId === sub.id}
                          onClick={() => handleReview(sub.id, "approved")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded cursor-pointer disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewingId === sub.id}
                          onClick={() => handleReview(sub.id, "needs_revision")}
                          className="px-3 py-1.5 bg-[#2a221d] hover:bg-[#3a2e27] text-[#e6dfd3] border border-white/10 text-xs rounded cursor-pointer disabled:opacity-50"
                        >
                          Request Revision
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
