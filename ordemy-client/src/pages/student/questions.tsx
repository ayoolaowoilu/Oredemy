import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquareText, Send } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import type { StudentQuestion } from "./api";
import { fetchStudentQuestions, sendStudentQuery } from "./api";
import { Card, Notice, PageIntro, PrimaryButton } from "./shared";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#E9E5FF] bg-white px-3.5 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#2501FF] focus:ring-2 focus:ring-[#2501FF]/10";

export default function StudentQuestions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] =
    useState<StudentQuestion["query_type"]>("Other");

  async function loadQuestions() {
    const response = await fetchStudentQuestions();
    setQuestions(response.data);
  }

  useEffect(() => {
    let active = true;
    fetchStudentQuestions()
      .then((response) => {
        if (active) setQuestions(response.data);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof ApiError
              ? loadError.message
              : "We couldn’t load your questions.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.session) {
      setError("Complete your student profile before asking a question.");
      return;
    }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      await sendStudentQuery({
        subject: subject.trim(),
        query: details.trim(),
        session: user.session,
        query_type: category,
        query_for: "Department",
      });
      setSubject("");
      setDetails("");
      await loadQuestions();
      setSuccess("Sent to your department adviser. You can continue in chat.");
    } catch (submitError) {
      setError(
        submitError instanceof ApiError || submitError instanceof Error
          ? submitError.message
          : "Your question could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Academic support"
        title="Questions for your adviser"
        description="Ask your department adviser about results, facilities, your timetable or anything affecting your studies."
        action={
          <Link
            to="/dashboard/student/chat"
            className="inline-flex items-center gap-2 rounded-full border border-[#F0ECFF] bg-[#F7F5FF] px-5 py-2.5 text-sm font-semibold text-[#2501FF] hover:bg-[#F1EDFF]"
          >
            Open chat <ArrowRight size={16} />
          </Link>
        }
      />
      {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
      {success && (
        <Notice tone="success" onDismiss={() => setSuccess("")}>
          {success}{" "}
          <Link
            to="/dashboard/student/chat"
            className="ml-1 font-bold underline"
          >
            Go to chat
          </Link>
        </Notice>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Write a question</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Your message will be sent to a verified adviser for your department.
          </p>
          {!user?.session && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Complete your academic profile before sending a question.{" "}
              <Link to="/onboarding" className="font-bold underline">
                Set up profile
              </Link>
            </p>
          )}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              Topic
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as StudentQuestion["query_type"])
                }
                className={inputClass}
              >
                <option>Other</option>
                <option>Results</option>
                <option>Facilities</option>
                <option>Timetable</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={100}
                required
                placeholder="What do you need help with?"
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Tell us a little more
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                required
                rows={5}
                placeholder="Share the important details so your adviser can help."
                className={`${inputClass} resize-y leading-6`}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-400">
                {user?.department ? `${user.department} · ${user.session}` : "Your department"}
              </span>
              <PrimaryButton type="submit" disabled={sending || !user?.session}>
                {sending ? "Sending…" : "Send to adviser"}
                <Send size={15} />
              </PrimaryButton>
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Your questions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Follow your adviser’s replies and see what’s still pending.
              </p>
            </div>
            <span className="rounded-full bg-[#2501FF]/[0.08] px-3 py-1 text-xs font-bold text-[#2501FF]">
              {questions.length}
            </span>
          </div>
          {loading ? (
            <div className="mt-5 space-y-3">
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : questions.length ? (
            <div className="mt-4 divide-y divide-slate-100">
              {questions.map((question) => (
                <article key={question.id} className="py-4 first:pt-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900">
                        {question.subject}
                      </h3>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                        {question.query}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        question.has_reply
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {question.has_reply ? "Replied" : "Waiting"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      {question.query_type} · {question.session} ·{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(question.created_at))}
                    </span>
                    <Link
                      to="/dashboard/student/chat"
                      className="inline-flex items-center gap-1 font-bold text-[#2501FF] hover:underline"
                    >
                      Open adviser chat <ArrowRight size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#E6E0FF] bg-[#FCFBFF] px-4 py-8 text-center">
              <MessageSquareText
                size={23}
                className="mx-auto text-slate-300"
              />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                No questions yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Your questions and adviser replies will appear here.
              </p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
