"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  BarChart2,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Film,
  GraduationCap,
  Link as LinkIcon,
  MapPin,
  Mic2,
  MonitorPlay,
  Plus,
  Radio,
  Search,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn, href, t } from "@/lib/utils";
import { effectiveLiveStatus, isFreePrice, safeExternalHttpsUrl } from "@/lib/academy-live";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { AcademyAnalytics } from "@/components/admin/AcademyAnalytics";
import type {
  AcademyReservation,
  Artist,
  Category,
  CourseVideoFile,
  DraftStatus,
  Difficulty,
  EducationItem,
  EducationType,
  LessonItem,
  LiveEventConfig,
  LiveEventStatus,
  SiteContent,
  WebinarStreamConfig,
} from "@/lib/types";
import type { Locale, Localized } from "@/lib/i18n/types";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "مقدماتی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

const LIVE_STATUS_META: Record<LiveEventStatus, { label: string; color: string; dot: string }> = {
  scheduled: { label: "زمان‌بندی شده", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  live: { label: "🔴 در حال پخش", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500 animate-pulse" },
  ended: { label: "پایان‌یافته", color: "bg-zinc-100 text-zinc-600 border-zinc-200", dot: "bg-zinc-400" },
  cancelled: { label: "لغوشده", color: "bg-red-50 text-red-400 border-red-100", dot: "bg-red-300" },
};

function eventStatusOf(live: LiveEventConfig, now = Date.now()): LiveEventStatus {
  return effectiveLiveStatus(live, now) ?? live.status;
}

const DRAFT_STATUS_META: Record<DraftStatus, { label: string; color: string }> = {
  draft: { label: "پیش‌نویس", color: "bg-zinc-100 text-zinc-600" },
  pending_review: { label: "در انتظار تأیید", color: "bg-amber-50 text-amber-700 border border-amber-200" },
  published: { label: "منتشر شده", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  rejected: { label: "رد شده", color: "bg-red-50 text-red-600 border border-red-200" },
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function makeId() {
  return `edu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeLessonId() {
  return `lesson-${crypto.randomUUID()}`;
}

function makeSlug(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[\u0600-\u06FF\s]+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 60) || `item-${Date.now().toString(36)}`
  );
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

function toDateTimeLocalValue(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalValue(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function fmtDuration(min: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} دقیقه`;
  if (m === 0) return `${h} ساعت`;
  return `${h} ساعت ${m} دقیقه`;
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/* ═══════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function LocalizedField({
  label, value, onChange, textarea, required,
}: {
  label: string; value: Localized; onChange: (v: Localized) => void;
  textarea?: boolean; required?: boolean;
}) {
  const C = textarea ? Textarea : Input;
  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-2">
      <Field label={`${label} (فارسی)${required ? " *" : ""}`}>
        <C dir="rtl" value={value.fa} placeholder="فارسی…"
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, fa: e.target.value })} />
      </Field>
      <Field label={`${label} (انگلیسی)${required ? " *" : ""}`}>
        <C dir="ltr" value={value.en} placeholder="English…"
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, en: e.target.value })} />
      </Field>
    </div>
  );
}

function SectionBox({ title, icon, color = "blue", children }: {
  title: string; icon: React.ReactNode; color?: "blue" | "emerald" | "rose" | "purple";
  children: React.ReactNode;
}) {
  const colors = {
    blue: "border-blue-200 bg-blue-50/40",
    emerald: "border-emerald-200 bg-emerald-50/40",
    rose: "border-rose-200 bg-rose-50/40",
    purple: "border-purple-200 bg-purple-50/40",
  };
  return (
    <div className={cn("rounded-xl border p-5 space-y-4", colors[color])}>
      <div className="flex items-center gap-2">
        <span className="text-foreground-secondary">{icon}</span>
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function LessonListEditor({ lessons, onChange }: { lessons: LessonItem[]; onChange: (lessons: LessonItem[]) => void }) {
  const update = (id: string, patch: Partial<LessonItem>) =>
    onChange(lessons.map((lesson) => lesson.id === id ? { ...lesson, ...patch } : lesson));

  return (
    <SectionBox title="فهرست درس‌های دوره" icon={<BookOpen className="h-4 w-4" />} color="blue">
      <p className="text-xs leading-6 text-muted">برای هر درس عنوان فارسی و انگلیسی، مدت و امکان پیش‌نمایش را ثبت کنید؛ فایل هر درس را در بخش ویدیوها به آن متصل کنید.</p>
      {lessons.length === 0 && <p className="rounded-lg border border-dashed border-blue-200 bg-white/60 px-3 py-4 text-center text-xs text-muted">هنوز درسی تعریف نشده است. شمار درس‌ها از فهرست زیر محاسبه می‌شود.</p>}
      <div className="space-y-3">
        {lessons.map((lesson, index) => (
          <div key={lesson.id} className="rounded-lg border border-blue-100 bg-white/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-blue-800">درس {index + 1}</span>
              <button type="button" onClick={() => onChange(lessons.filter((entry) => entry.id !== lesson.id))} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> حذف درس</button>
            </div>
            <LocalizedField label="عنوان درس" value={lesson.title} onChange={(title) => update(lesson.id, { title })} required />
            <div className="flex flex-wrap items-center gap-4">
              <Field label="مدت درس (دقیقه)">
                <Input type="number" min={0} value={lesson.durationMin ?? 0} onChange={(e) => update(lesson.id, { durationMin: Math.max(0, Number(e.target.value) || 0) })} />
              </Field>
              <label className="mt-5 flex cursor-pointer items-center gap-2 text-xs text-foreground-secondary">
                <input type="checkbox" className="h-4 w-4 accent-accent" checked={!!lesson.free} onChange={(e) => update(lesson.id, { free: e.target.checked })} />
                درس پیش‌نمایش رایگان
              </label>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lessons, { id: makeLessonId(), title: { fa: `درس ${lessons.length + 1}`, en: `Lesson ${lessons.length + 1}` }, durationMin: 0, free: false }])}>
        <Plus className="h-3.5 w-3.5 ml-1.5" /> افزودن درس
      </Button>
    </SectionBox>
  );
}

/* ═══════════════════════════════════════════════════════════════
   VIDEO UPLOAD PANEL (for Courses)
   ═══════════════════════════════════════════════════════════════ */

function VideoUploadPanel({
  videos,
  lessons,
  onChange,
}: {
  videos: CourseVideoFile[];
  lessons: LessonItem[];
  onChange: (v: CourseVideoFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    const newVideos: CourseVideoFile[] = [...videos];
    for (const file of Array.from(files)) {
      try {
        if (file.size > 500 * 1024 * 1024) throw new Error("file_too_large");
        if (!["video/mp4", "video/webm"].includes(file.type)) throw new Error("unsupported_video_type");

        const sessionResponse = await fetch("/api/admin/academy/upload-video/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mime: file.type, sizeBytes: file.size }),
        });
        const session = await sessionResponse.json() as {
          ok: boolean; mode?: "direct" | "proxy"; id?: string; uploadUrl?: string; mime?: string; error?: string;
        };
        if (!sessionResponse.ok || !session.ok || !session.mode) {
          throw new Error(session.error ?? "upload_setup_failed");
        }

        let stored: { id: string; url: string; storageKey: string; mime: string; sizeBytes: number };
        if (session.mode === "direct") {
          if (!session.id || !session.uploadUrl) throw new Error("upload_setup_failed");
          const uploadResponse = await fetch(session.uploadUrl, {
            method: "PUT",
            credentials: "omit",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!uploadResponse.ok) throw new Error("object_store_upload_failed");
          const completeResponse = await fetch("/api/admin/academy/upload-video/complete", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: session.id, mime: file.type, sizeBytes: file.size }),
          });
          const complete = await completeResponse.json() as { ok: boolean; video?: typeof stored; error?: string };
          if (!completeResponse.ok || !complete.ok || !complete.video) throw new Error(complete.error ?? "upload_verification_failed");
          stored = complete.video;
        } else {
          const form = new FormData();
          form.append("file", file);
          const uploadResponse = await fetch("/api/admin/academy/upload-video", {
            method: "POST",
            credentials: "include",
            body: form,
          });
          const result = await uploadResponse.json() as { ok: boolean } & Partial<typeof stored> & { error?: string };
          if (!uploadResponse.ok || !result.ok || !result.id || !result.url || !result.storageKey || !result.mime || !result.sizeBytes) {
            throw new Error(result.error ?? "upload_failed");
          }
          stored = result as typeof stored;
        }

        const baseName = file.name.replace(/\.[^.]+$/, "");
        const unlinkedLesson = lessons.find((lesson) => !newVideos.some((video) => video.lessonId === lesson.id));
        newVideos.push({
          ...stored,
          title: { fa: baseName, en: baseName },
          ...(unlinkedLesson ? { lessonId: unlinkedLesson.id } : {}),
          free: false,
          uploadedAt: new Date().toISOString(),
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : "upload_failed";
        const message = code === "file_too_large"
          ? "حجم هر ویدیو حداکثر ۵۰۰ مگابایت است."
          : code === "content_length_required"
            ? "سرور پراکسی اندازه درخواست آپلود را اعلام نکرد؛ اتصال یا محدودیت پراکسی را بررسی کنید."
            : code === "unsupported_video_type"
            ? "فقط فایل MP4 یا WebM پشتیبانی می‌شود."
            : code === "object_store_upload_failed"
              ? "آپلود فضای ذخیره‌سازی کامل نشد؛ تنظیم CORS فضای S3-compatible را بررسی کنید."
              : `خطا در آپلود «${file.name}» (${code}).`;
        setUploadError(message);
      }
    }

    onChange(newVideos);
    if (inputRef.current) inputRef.current.value = "";
    setUploading(false);
  };

  const updateVideo = (id: string, patch: Partial<CourseVideoFile>) =>
    onChange(videos.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const removeVideo = (id: string) => onChange(videos.filter((v) => v.id !== id));

  const moveVideo = (id: string, dir: -1 | 1) => {
    const idx = videos.findIndex((v) => v.id === id);
    if (idx < 0) return;
    const next = [...videos];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    onChange(next);
  };

  return (
    <SectionBox title="فیلم‌های آموزشی دوره" icon={<Film className="h-4 w-4" />} color="purple">
      <p className="rounded-lg border border-purple-200 bg-white/70 px-3 py-2 text-xs leading-6 text-purple-900">
        ویدیوها خارج از پوشه عمومی ذخیره می‌شوند و به‌صورت پیش‌فرض خصوصی‌اند. ویدیوهای دوره‌های پولی فقط پس از تأیید دسترسی پخش می‌شوند؛ برای پیش‌نمایش رایگان، گزینه «رایگان» را فعال کنید.
        {lessons.length === 0 && " ابتدا در بخش فهرست درس‌ها، درس‌ها را تعریف کنید؛ اتصال فایل به درس از فهرست هر ویدیو انجام می‌شود."}
      </p>
      {/* Drop zone */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
          uploading
            ? "border-accent bg-accent/5 pointer-events-none"
            : "border-border hover:border-accent/60 hover:bg-accent/5"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/mp4,video/webm"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-sm text-accent font-medium">در حال آپلود…</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted" />
            <div>
              <p className="text-sm font-semibold text-foreground">فایل ویدیو را اینجا بکشید یا کلیک کنید</p>
              <p className="text-xs text-muted mt-1">MP4 (پیشنهادی، H.264) یا WebM — حداکثر ۵۰۰ مگابایت هر فایل</p>
            </div>
            <Button variant="outline" size="sm" className="pointer-events-none">
              <Upload className="h-3.5 w-3.5 ml-1.5" />
              انتخاب فایل ویدیو
            </Button>
          </>
        )}
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {uploadError}
        </div>
      )}

      {/* Video list */}
      {videos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            {videos.length} فیلم آپلود شده
          </p>
          {videos.map((v, idx) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-3"
            >
              {/* Drag handles */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveVideo(v.id, -1)}
                  disabled={idx === 0}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 8" fill="currentColor">
                    <path d="M6 0L12 8H0z" />
                  </svg>
                </button>
                <button
                  onClick={() => moveVideo(v.id, 1)}
                  disabled={idx === videos.length - 1}
                  className="text-muted hover:text-foreground disabled:opacity-30"
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 8" fill="currentColor">
                    <path d="M6 8L0 0H12z" />
                  </svg>
                </button>
              </div>

              {/* Index */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700">
                {idx + 1}
              </span>

              {/* Title (editable) */}
              <div className="flex-1 min-w-0">
                {editingTitle === v.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      className="flex-1 rounded border border-border px-2 py-1 text-xs"
                      defaultValue={v.title.fa}
                      onBlur={(e) => {
                        updateVideo(v.id, { title: { ...v.title, fa: e.target.value } });
                        setEditingTitle(null);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); }}
                    />
                  </div>
                ) : (
                  <button
                    className="text-left text-xs font-medium text-foreground hover:text-accent truncate block w-full"
                    onClick={() => setEditingTitle(v.id)}
                  >
                    {v.title.fa || "بدون عنوان"}
                  </button>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                  {v.sizeBytes && <span>{fmtBytes(v.sizeBytes)}</span>}
                  {v.durationSec && <span>· {fmtDuration(Math.round(v.durationSec / 60))}</span>}
                </div>
              </div>

              {/* Link the video to its place in the course curriculum. */}
              <select
                aria-label="درس مرتبط با ویدیو"
                value={v.lessonId ?? ""}
                onChange={(e) => updateVideo(v.id, { lessonId: e.target.value || undefined })}
                className="max-w-36 rounded-md border border-border bg-white px-2 py-1 text-[10px] text-foreground"
              >
                <option value="">بدون اتصال به درس</option>
                {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title.fa || lesson.title.en}</option>)}
              </select>

              {/* Free toggle */}
              <label className="flex items-center gap-1.5 text-[10px] text-muted cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-accent"
                  checked={!!v.free}
                  onChange={(e) => updateVideo(v.id, { free: e.target.checked })}
                />
                رایگان
              </label>

              {/* View + Delete */}
              <a
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted hover:text-foreground"
                title="مشاهده"
              >
                <Eye className="h-4 w-4" />
              </a>
              <button
                onClick={() => removeVideo(v.id)}
                className="shrink-0 text-muted hover:text-red-600"
                title="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionBox>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WORKSHOP CONFIG (online + offline)
   ═══════════════════════════════════════════════════════════════ */

function WorkshopEventSection({
  live, onChange, slug, registeredCount, saved,
}: {
  live: LiveEventConfig; onChange: (v: LiveEventConfig) => void; slug: string; registeredCount: number; saved: boolean;
}) {
  const set = <K extends keyof LiveEventConfig>(k: K, v: LiveEventConfig[K]) =>
    onChange({ ...live, [k]: v });

  const pct = live.capacity > 0
    ? Math.min(100, Math.round((registeredCount / live.capacity) * 100)) : 0;
  const safeMeetLink = safeExternalHttpsUrl(live.meetLink)?.href;
  const stream = live.webinarStream ?? {
    source: "camera" as const,
    chatEnabled: true,
    qaEnabled: true,
  };
  const setStream = <K extends keyof WebinarStreamConfig>(k: K, v: WebinarStreamConfig[K]) =>
    set("webinarStream", { ...stream, [k]: v });
  const displayStatus = eventStatusOf(live);

  return (
    <div className="space-y-4">
      <EventQuickStart
        slug={slug}
        saved={saved}
        status={displayStatus}
        kind="ورکشاپ"
        isOnline={live.isOnline}
        source={stream.source}
        meetingUrl={safeMeetLink}
      />

      <details className="rounded-xl border border-border bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">اگر پخش Zoom/Meet یا ورکشاپ حضوری می‌خواهید، اینجا را باز کنید</summary>
        <div className="mt-4 space-y-4">
      {/* ── وضعیت رویداد — کارت بالای صفحه ── */}
      <div className={cn(
        "rounded-xl border-2 p-4 transition-all",
        displayStatus === "live"
          ? "border-red-400 bg-red-50"
          : displayStatus === "ended"
          ? "border-zinc-300 bg-zinc-50"
          : displayStatus === "cancelled"
          ? "border-red-200 bg-red-50/50"
          : "border-emerald-300 bg-emerald-50"
      )}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", LIVE_STATUS_META[displayStatus].dot)} />
            <span className="font-bold text-sm">{LIVE_STATUS_META[displayStatus].label}</span>
          </div>
          <Select
            value={live.status}
            onChange={(e) => set("status", e.target.value as LiveEventStatus)}
            className="w-auto min-w-[160px]"
          >
            {(Object.keys(LIVE_STATUS_META) as LiveEventStatus[]).map((s) => (
              <option key={s} value={s}>{LIVE_STATUS_META[s].label}</option>
            ))}
          </Select>
        </div>
        {displayStatus !== live.status && (
          <p className="mt-2 text-xs text-foreground-secondary">
            این وضعیت بر اساس زمان شروع و مدت رویداد محاسبه شده؛ وضعیت ذخیره‌شدهٔ مدیریتی تغییر نکرده است.
          </p>
        )}
        {displayStatus === "live" && (
          <p className="mt-2 text-xs text-red-700 font-medium">
            🟢 ورکشاپ الان در حال برگزاری است
          </p>
        )}
      </div>

      {/* ── نوع برگزاری: آنلاین یا حضوری ── */}
      <SectionBox title="نوع برگزاری" icon={<Wifi className="h-4 w-4" />} color="emerald">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => set("isOnline", true)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all",
              live.isOnline
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300"
                : "border-border bg-white text-foreground-secondary hover:border-emerald-300"
            )}
          >
            <Wifi className="h-6 w-6" />
            <span>آنلاین</span>
            <span className="text-[11px] font-normal opacity-70 text-center">
              {live.isOnline ? "فعال — کلاس اینترنتی" : "کلاس اینترنتی"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => set("isOnline", false)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all",
              !live.isOnline
                ? "border-zinc-400 bg-zinc-50 text-zinc-700 ring-1 ring-zinc-300"
                : "border-border bg-white text-foreground-secondary hover:border-zinc-300"
            )}
          >
            <MapPin className="h-6 w-6" />
            <span>حضوری</span>
            <span className="text-[11px] font-normal opacity-70 text-center">
              {!live.isOnline ? "فعال — مکان فیزیکی" : "مکان فیزیکی"}
            </span>
          </button>
        </div>

        {/* Online: روش پخش */}
        {live.isOnline && (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold text-muted">روش برگزاری آنلاین</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStream("source", "camera")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-all",
                  stream.source === "camera"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300"
                    : "border-border bg-white text-foreground-secondary hover:border-emerald-300"
                )}
              >
                <Camera className="h-5 w-5" />
                دوربین مرورگر
                <span className="font-normal opacity-60 text-[10px] text-center leading-tight">
                  پخش زنده داخلی سایت
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStream("source", "external")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-all",
                  stream.source === "external"
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-300"
                    : "border-border bg-white text-foreground-secondary hover:border-blue-300"
                )}
              >
                <MonitorPlay className="h-5 w-5" />
                Zoom / Meet
                <span className="font-normal opacity-60 text-[10px] text-center leading-tight">
                  لینک جلسه خارجی
                </span>
              </button>
            </div>

            {/* Camera mode */}
            {stream.source === "camera" && (
              <div className={cn(
                "rounded-lg border p-3 text-sm space-y-2",
                displayStatus === "live"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              )}>
                <p className="font-semibold flex items-center gap-2 text-xs">
                  <Camera className="h-3.5 w-3.5" />
                    پخش زنده با دوربین سایت
                    {displayStatus === "live" && (
                      <span className="mr-auto flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        در حال پخش
                      </span>
                    )}
                  </p>
                  <p className="text-xs leading-6">
                    برای شروع و فرستادن لینک مهمان‌ها از کارت سبز «شروع آسان ورکشاپ» در بالای این فرم استفاده کنید.
                  </p>
                </div>
              )}

            {/* External (Zoom/Meet) mode */}
            {stream.source === "external" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="پلتفرم (Zoom / Meet…)">
                    <Input dir="ltr" value={live.platform ?? ""}
                      placeholder="Zoom"
                      onChange={(e) => set("platform", e.target.value)} />
                  </Field>
                  <Field label="لینک جلسه آنلاین">
                    <div className="flex gap-2">
                      <Input dir="ltr" value={live.meetLink ?? ""}
                        placeholder="https://zoom.us/j/…"
                        onChange={(e) => set("meetLink", e.target.value)}
                        className="flex-1" />
                      {safeMeetLink && (
                        <a href={safeMeetLink} target="_blank" rel="noopener noreferrer"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-white text-muted hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </Field>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Offline: venue */}
        {!live.isOnline && (
          <LocalizedField
            label="آدرس برگزاری (مکان فیزیکی)"
            value={live.venue ?? { fa: "", en: "" }}
            onChange={(v) => set("venue", v.fa || v.en ? v : undefined)}
          />
        )}
      </SectionBox>
        </div>
      </details>

      {/* ── زمان‌بندی و ظرفیت ── */}
      <SectionBox title="زمان‌بندی و ظرفیت" icon={<Calendar className="h-4 w-4" />} color="emerald">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="تاریخ و زمان شروع">
            <Input type="datetime-local" dir="ltr"
              value={toDateTimeLocalValue(live.startsAt)}
              onChange={(e) => set("startsAt", fromDateTimeLocalValue(e.target.value))} />
          </Field>
          <Field label="مدت (دقیقه)">
            <Input type="number" min={1} value={live.durationMin || ""}
              onChange={(e) => set("durationMin", Number(e.target.value))} />
          </Field>
        </div>
        <p className="text-xs leading-5 text-muted">تاریخ و ساعت را با تقویم و ساعت همین فیلد انتخاب کنید؛ زمان بر اساس ساعت محلی دستگاه شما ثبت می‌شود.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ظرفیت (۰ = نامحدود)">
            <Input type="number" min={0} value={live.capacity}
              onChange={(e) => set("capacity", Number(e.target.value))} />
          </Field>
          <div className="flex flex-col justify-end gap-1">
            <span className="text-xs font-medium text-muted">ثبت‌نام فعال (از رزروهای واقعی)</span>
            <div className="flex h-9 items-center rounded-md border border-border bg-background-secondary px-3 text-sm font-semibold text-foreground tabular-nums">
              {registeredCount.toLocaleString("fa-IR")}
            </div>
          </div>
        </div>
        {live.capacity > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted">
              <span>پر شدن ظرفیت</span>
              <span>{registeredCount}/{live.capacity} ({pct}%)</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full border border-border bg-white">
              <div className={cn("h-full rounded-full transition-all",
                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-500")}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </SectionBox>

      {/* Recording/certificate options stay explicit until their delivery flows exist. */}
      <SectionBox title="ضبط و گواهینامه" icon={<Download className="h-4 w-4" />} color="emerald">
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          پخش زنده در حال حاضر ضبط یا ذخیره نمی‌شود و صدور گواهینامه خودکار فعال نیست. پس از پیاده‌سازی آپلود خصوصی و فرایند صدور، این امکانات از همین‌جا قابل مدیریت خواهند بود.
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm pt-1">
          <input type="checkbox" className="h-4 w-4 accent-accent"
            checked={!!live.hostNameCustom}
            onChange={(e) => set("hostNameCustom", e.target.checked)} />
          استفاده از نام سفارشی مدرس/میزبان
        </label>
        {live.hostNameCustom && (
          <LocalizedField
            label="نام مدرس/میزبان"
            value={live.hostName ?? { fa: "راضیه خیری پور", en: "Razieh Khairipour" }}
            onChange={(v) => set("hostName", v.fa || v.en ? v : undefined)}
          />
        )}
      </SectionBox>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   JOIN LINK COPIER — shareable link for attendees
   ═══════════════════════════════════════════════════════════════ */

function JoinLinkCopier({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/fa/academy/${slug}/live`
    : `/fa/academy/${slug}/live`;

  const copy = async () => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs text-emerald-900">
      <p className="font-bold">۳. لینک مهمان‌ها</p>
      <p className="mt-1 text-emerald-700">این لینک را برای شرکت‌کنندگان بفرستید.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white hover:bg-emerald-700 transition-colors"
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "کپی شد!" : "کپی لینک"}
        </button>
        <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-200 px-3 py-2 font-semibold hover:bg-emerald-50">
          دیدن صفحه مهمان‌ها
        </a>
      </div>
      <code dir="ltr" className="mt-2 block break-all rounded bg-emerald-50 px-2 py-1.5 text-left text-[11px]">{link}</code>
      {copyError && <p role="alert" className="mt-2 text-red-700">کپی انجام نشد؛ لینک بالا را انتخاب و کپی کنید.</p>}
    </div>
  );
}

function EventQuickStart({
  slug, saved, status, kind, isOnline, source, meetingUrl,
}: {
  slug: string;
  saved: boolean;
  status: LiveEventStatus;
  kind: string;
  isOnline: boolean;
  source: "camera" | "external";
  meetingUrl: string | null;
}) {
  if (!isOnline) return null;
  const unavailable = status === "ended" || status === "cancelled";
  const cameraBroadcast = source === "camera";

  return (
    <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4 sm:p-5" aria-label={`شروع آسان ${kind}`}>
      <h3 className="text-base font-bold text-emerald-950">شروع آسان {kind}</h3>
      <ol className="mt-3 grid gap-2 text-sm leading-6 text-emerald-950 sm:grid-cols-3">
        <li className="rounded-lg bg-white/80 p-3"><b>۱.</b> زمان را پایین همین فرم انتخاب کنید.</li>
        <li className="rounded-lg bg-white/80 p-3"><b>۲.</b> «افزودن» یا «ذخیره تغییرات» را بزنید، بعد «ذخیره» بالای پنل را بزنید.</li>
        <li className="rounded-lg bg-white/80 p-3"><b>۳.</b> پخش را شروع کنید و لینک مهمان‌ها را بفرستید.</li>
      </ol>
      {saved ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col items-start justify-center gap-2 rounded-xl bg-white p-3">
            <p className="text-sm font-semibold text-zinc-800">
              {cameraBroadcast ? "آماده‌اید؟ اتاق پخش را باز کنید." : "این رویداد از سرویس پخش بیرونی استفاده می‌کند."}
            </p>
            {cameraBroadcast ? (
              <Link
                href={`/fa/academy/${slug}/broadcast`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={unavailable}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm",
                  unavailable ? "pointer-events-none bg-zinc-400" : "bg-red-600 hover:bg-red-700"
                )}
              >
                <Camera className="h-5 w-5" />
                {unavailable ? "این رویداد تمام شده" : "باز کردن اتاق پخش"}
              </Link>
            ) : (
              <p className="text-xs leading-5 text-zinc-600">
                {meetingUrl ? "جلسه را از سرویس بیرونی شروع کنید؛ لینک مهمان‌ها کنار همین کارت است." : "پخش بیرونی را از سرویس استریم تنظیم‌شده شروع کنید."}
              </p>
            )}
          </div>
          <JoinLinkCopier slug={slug} />
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-amber-900">
          اول رویداد را اضافه و با دکمهٔ «ذخیره» بالای پنل ثبت کنید؛ بعد دکمهٔ شروع پخش اینجا فعال می‌شود.
        </p>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WEBINAR CONFIG (always online, camera/mic stream)
   ═══════════════════════════════════════════════════════════════ */

function WebinarEventSection({
  live, onChange, slug, registeredCount, saved,
}: {
  live: LiveEventConfig; onChange: (v: LiveEventConfig) => void; slug: string; registeredCount: number; saved: boolean;
}) {
  const set = <K extends keyof LiveEventConfig>(k: K, v: LiveEventConfig[K]) =>
    onChange({ ...live, [k]: v });

  const stream = live.webinarStream ?? { source: "camera" as const };
  const setStream = <K extends keyof WebinarStreamConfig>(k: K, v: WebinarStreamConfig[K]) =>
    set("webinarStream", { ...stream, [k]: v });
  const displayStatus = eventStatusOf(live);

  const pct = live.capacity > 0
    ? Math.min(100, Math.round((registeredCount / live.capacity) * 100)) : 0;

  return (
    <div className="space-y-4">
      <EventQuickStart
        slug={slug}
        saved={saved}
        status={displayStatus}
        kind="وبینار"
        isOnline
        source={stream.source}
        meetingUrl={safeExternalHttpsUrl(stream.hlsUrl)?.href ?? null}
      />

      {/* ── وضعیت رویداد — همیشه در بالا و کاملاً مرئی ── */}
      <div className={cn(
        "rounded-xl border-2 p-4 transition-all",
        displayStatus === "live"
          ? "border-red-400 bg-red-50"
          : displayStatus === "ended"
          ? "border-zinc-300 bg-zinc-50"
          : displayStatus === "cancelled"
          ? "border-red-200 bg-red-50/50"
          : "border-amber-300 bg-amber-50"
      )}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", LIVE_STATUS_META[displayStatus].dot)} />
            <span className="font-bold text-sm">
              {LIVE_STATUS_META[displayStatus].label}
            </span>
          </div>
          <Select
            value={live.status}
            onChange={(e) => set("status", e.target.value as LiveEventStatus)}
            className="w-auto min-w-[160px]"
          >
            {(Object.keys(LIVE_STATUS_META) as LiveEventStatus[]).map((s) => (
              <option key={s} value={s}>{LIVE_STATUS_META[s].label}</option>
            ))}
          </Select>
        </div>
        {displayStatus !== live.status && (
          <p className="mt-2 text-xs text-foreground-secondary">
            این وضعیت بر اساس زمان شروع و مدت رویداد محاسبه شده؛ وضعیت ذخیره‌شدهٔ مدیریتی تغییر نکرده است.
          </p>
        )}
        {displayStatus === "live" && (
          <p className="mt-2 text-xs text-red-700 font-medium">
            🔴 وبینار الان در حال پخش است — دکمه پخش زنده در پایین همین صفحه فعال است
          </p>
        )}
        {displayStatus === "scheduled" && (
          <p className="mt-2 text-xs text-amber-700">
            برای شروع پخش دوربین، از بخش «منبع استریم» پایین‌تر دکمه کنترل دوربین را باز کنید؛ تغییر دستی وضعیت لازم نیست.
          </p>
        )}
      </div>

      <SectionBox title="تنظیمات وبینار زنده" icon={<Radio className="h-4 w-4" />} color="rose">
        {/* Date + Duration */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="تاریخ و زمان شروع">
            <Input type="datetime-local" dir="ltr"
              value={toDateTimeLocalValue(live.startsAt)}
              onChange={(e) => set("startsAt", fromDateTimeLocalValue(e.target.value))} />
          </Field>
          <Field label="مدت (دقیقه)">
            <Input type="number" min={1} value={live.durationMin || ""}
              onChange={(e) => set("durationMin", Number(e.target.value))} />
          </Field>
        </div>
        <p className="text-xs leading-5 text-muted">تاریخ و ساعت را با تقویم و ساعت همین فیلد انتخاب کنید؛ زمان بر اساس ساعت محلی دستگاه شما ثبت می‌شود.</p>

        {/* Capacity */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ظرفیت بینندگان (۰ = نامحدود)">
            <Input type="number" min={0} value={live.capacity}
              onChange={(e) => set("capacity", Number(e.target.value))} />
          </Field>
          <div className="flex flex-col justify-end gap-1">
            <span className="text-xs font-medium text-muted">ثبت‌نام فعال (از رزروهای واقعی)</span>
            <div className="flex h-9 items-center rounded-md border border-border bg-background-secondary px-3 text-sm font-semibold text-foreground tabular-nums">
              {registeredCount.toLocaleString("fa-IR")}
            </div>
          </div>
        </div>
        {live.capacity > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted">
              <span>پر شدن ظرفیت</span>
              <span>{registeredCount}/{live.capacity} ({pct}%)</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full border border-border bg-white">
              <div className={cn("h-full rounded-full transition-all",
                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-rose-500")}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-accent"
            checked={!!live.hostNameCustom}
            onChange={(e) => set("hostNameCustom", e.target.checked)} />
          استفاده از نام سفارشی مدرس/میزبان
        </label>
        {live.hostNameCustom && (
          <LocalizedField
            label="نام مدرس/میزبان"
            value={live.hostName ?? { fa: "راضیه خیری پور", en: "Razieh Khairipour" }}
            onChange={(v) => set("hostName", v.fa || v.en ? v : undefined)}
          />
        )}

      </SectionBox>

      <details className="rounded-xl border border-border bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">گزینه‌های بیشتر (اختیاری): نوع پخش، چت و ظرفیت</summary>
        <div className="mt-4 space-y-4">
      {/* Stream source */}
      <SectionBox title="منبع استریم (دوربین/میکروفون)" icon={<Camera className="h-4 w-4" />} color="rose">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted">نوع پخش</p>
          <div className="flex gap-2">
            <button
              onClick={() => setStream("source", "camera")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                stream.source === "camera"
                  ? "border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300"
                  : "border-border bg-white text-foreground-secondary hover:border-rose-300"
              )}
            >
              <Camera className="h-4 w-4" />
              دوربین / میکروفون مرورگر
            </button>
            <button
              onClick={() => setStream("source", "external")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                stream.source === "external"
                  ? "border-blue-400 bg-blue-50 text-blue-700 ring-1 ring-blue-300"
                  : "border-border bg-white text-foreground-secondary hover:border-blue-300"
              )}
            >
              <MonitorPlay className="h-4 w-4" />
              HLS خارجی (سرویس آماده)
            </button>
          </div>
        </div>

        {stream.source === "camera" && (
          <div className={cn(
            "rounded-lg border p-4 text-sm space-y-3",
            displayStatus === "live"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-rose-200 bg-rose-50 text-rose-800"
          )}>
            <p className="font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4" />
              پخش از دوربین مرورگر
              {displayStatus === "live" && (
                <span className="mr-auto flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  در حال پخش
                </span>
              )}
            </p>

            <p className="text-xs leading-6 text-rose-800">
              دکمهٔ شروع پخش و لینک مهمان‌ها در کارت سبز «شروع آسان وبینار» بالای همین فرم هستند.
            </p>
          </div>
        )}

        {stream.source === "external" && (
          <div className="space-y-3">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
              سایت فقط HLS آماده را با کنترل دسترسی پروکسی و پخش می‌کند. دریافت RTMP، تبدیل RTMP به HLS و میزبانی استریم در این پروژه پیاده‌سازی نشده؛ باید سرویس بیرونی HLS عمومیِ HTTPS فراهم کند.
            </p>
            <Field label="آدرس HLS برای بینندگان (HTTPS)">
              <Input dir="ltr" value={stream.hlsUrl ?? ""}
                placeholder="https://live.example.com/hls/stream.m3u8"
                onChange={(e) => setStream("hlsUrl", e.target.value || undefined)} />
            </Field>
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm pt-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-accent"
              checked={!!stream.chatEnabled}
              onChange={(e) => setStream("chatEnabled", e.target.checked)} />
            فعال بودن چت زنده
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-accent"
              checked={!!stream.qaEnabled}
              onChange={(e) => setStream("qaEnabled", e.target.checked)} />
            فعال بودن پرسش و پاسخ
          </label>
        </div>

        <Field label="حداکثر بینندگان همزمان (۰ = نامحدود)">
          <Input type="number" min={0} value={stream.maxViewers ?? 0}
            onChange={(e) => setStream("maxViewers", Number(e.target.value))} />
        </Field>
      </SectionBox>

      {/* Recording is intentionally not advertised until a protected upload/delivery path exists. */}
      <SectionBox title="ضبط و بازپخش" icon={<Download className="h-4 w-4" />} color="rose">
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
          این سامانه پخش زنده را ضبط یا ذخیره نمی‌کند و برای وبینار فایل ضبط‌شده‌ای ساخته نمی‌شود. انتشار ضبط فقط پس از راه‌اندازی مسیر آپلود خصوصی و کنترل دسترسی ممکن خواهد بود.
        </div>
      </SectionBox>
        </div>
      </details>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ITEM DRAWER — per-type drawer forms
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_COURSE_LIVE: Omit<LiveEventConfig, "isOnline"> = {
  startsAt: "",
  durationMin: 90,
  capacity: 50,
  registeredCount: 0,
  platform: "Zoom",
  status: "scheduled",
  certificateEnabled: false,
};

const DEFAULT_WORKSHOP_LIVE: LiveEventConfig = {
  ...DEFAULT_COURSE_LIVE,
  isOnline: true,
  meetLink: "",
  webinarStream: { source: "camera", chatEnabled: true, qaEnabled: true },
};

const DEFAULT_WEBINAR_LIVE: LiveEventConfig = {
  ...DEFAULT_COURSE_LIVE,
  isOnline: true,
  webinarStream: { source: "camera", chatEnabled: true, qaEnabled: true },
};

const BLANK_BASE: Omit<EducationItem, "id" | "slug" | "type" | "liveEvent" | "videoFiles"> = {
  title: { fa: "", en: "" },
  excerpt: { fa: "", en: "" },
  body: { fa: "", en: "" },
  image: "",
  authorId: "",
  difficulty: "beginner",
  durationMin: 60,
  lessons: 1,
  price: undefined,
  categoryId: "",
  patternIds: [],
  productIds: [],
  featured: false,
  popular: false,
  publishedAt: new Date().toISOString().slice(0, 10),
  draftStatus: "published",
};

const TYPE_COLORS: Record<EducationType, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
  course: { border: "border-blue-400", bg: "bg-blue-50", text: "text-blue-700", icon: <GraduationCap className="h-4 w-4" /> },
  workshop: { border: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", icon: <Mic2 className="h-4 w-4" /> },
  webinar: { border: "border-rose-400", bg: "bg-rose-50", text: "text-rose-700", icon: <Radio className="h-4 w-4" /> },
};

const TYPE_LABELS: Record<EducationType, string> = {
  course: "دوره آموزشی",
  workshop: "ورکشاپ",
  webinar: "وبینار",
};

function ItemDrawer({
  item,
  artists,
  categories,
  onSave,
  onClose,
  registeredCount,
  defaultType = "course",
}: {
  item: EducationItem | null;
  artists: Artist[];
  categories: Category[];
  onSave: (item: EducationItem) => void;
  onClose: () => void;
  registeredCount: number;
  defaultType?: EducationType;
}) {
  const isNew = item === null;
  const [form, setForm] = useState<EducationItem>(() => {
    if (item) return { ...item };
    const type = defaultType;
    return {
      id: makeId(),
      slug: "",
      type,
      ...BLANK_BASE,
      videoFiles: type === "course" ? [] : undefined,
      liveEvent:
        type === "workshop"
          ? { ...DEFAULT_WORKSHOP_LIVE }
          : type === "webinar"
          ? { ...DEFAULT_WEBINAR_LIVE }
          : undefined,
    };
  });

  const set = <K extends keyof EducationItem>(k: K, v: EducationItem[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleTypeChange = (newType: EducationType) => {
    setForm((f) => ({
      ...f,
      type: newType,
      videoFiles: newType === "course" ? (f.videoFiles ?? []) : undefined,
      liveEvent:
        newType === "workshop"
          ? f.liveEvent ?? { ...DEFAULT_WORKSHOP_LIVE }
          : newType === "webinar"
          ? f.liveEvent ?? { ...DEFAULT_WEBINAR_LIVE }
          : undefined,
    }));
  };

  const handleSave = () => {
    const slug = form.slug.trim() || makeSlug(form.title.fa || form.title.en);
    onSave({
      ...form,
      slug,
      ...(form.liveEvent ? { liveEvent: { ...form.liveEvent, registeredCount } } : {}),
    });
  };

  const tc = TYPE_COLORS[form.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header — type-aware color accent */}
        <div className={cn(
          "flex shrink-0 items-center justify-between border-b border-border px-6 py-4 text-white rounded-t-2xl",
          form.type === "course"   ? "bg-blue-700"
          : form.type === "workshop" ? "bg-emerald-700"
          : "bg-rose-700"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white">
              {isNew ? tc.icon : <Edit3 className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                {isNew
                  ? `افزودن ${TYPE_LABELS[form.type]} جدید`
                  : `ویرایش ${TYPE_LABELS[form.type]}`}
              </p>
              {!isNew && <p className="text-[11px] text-white/60">{form.slug}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Type selector — hidden for new items (type locked to active panel) ── */}
          {!isNew ? (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">نوع محتوا</p>
              <div className="flex gap-2">
                {(["course", "workshop", "webinar"] as EducationType[]).map((type) => {
                  const c = TYPE_COLORS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleTypeChange(type)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                        form.type === type
                          ? `${c.border} ${c.bg} ${c.text} ring-1 ring-current`
                          : "border-border bg-white text-foreground-secondary hover:border-accent/50"
                      )}
                    >
                      {c.icon}
                      {TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Badge showing the locked type for new items */
            <div className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold",
              `${tc.border} ${tc.bg} ${tc.text}`
            )}>
              {tc.icon}
              {TYPE_LABELS[form.type]}
              <span className="mr-1 text-[10px] font-normal opacity-70">— نوع محتوا ثابت است</span>
            </div>
          )}

          {/* ── Draft status ── */}
          <Field label="وضعیت انتشار">
            <Select
              value={form.draftStatus ?? "published"}
              onChange={(e) => set("draftStatus", e.target.value as DraftStatus)}
            >
              <option value="published">منتشر شده</option>
              <option value="draft">پیش‌نویس</option>
              <option value="pending_review">در انتظار تأیید</option>
              <option value="rejected">رد شده</option>
            </Select>
          </Field>

          {/* ── اطلاعات پایه (مشترک همه انواع) ── */}
          <div className={cn(
            "rounded-xl border-r-4 px-4 py-3 text-xs text-muted",
            form.type === "course"   ? "border-blue-400 bg-blue-50/50"
            : form.type === "workshop" ? "border-emerald-400 bg-emerald-50/50"
            : "border-rose-400 bg-rose-50/50"
          )}>
            <p className="font-semibold mb-0.5">
              {form.type === "course"   && "اطلاعات پایه دوره آموزشی"}
              {form.type === "workshop" && "اطلاعات پایه ورکشاپ"}
              {form.type === "webinar"  && "اطلاعات پایه وبینار"}
            </p>
            <p>
              {form.type === "course"   && "عنوان، توضیحات، تصویر، مدرس و دسته‌بندی دوره را وارد کنید."}
              {form.type === "workshop" && "عنوان، توضیحات، تصویر و مدرس ورکشاپ را وارد کنید. تنظیمات رویداد در بخش بعدی است."}
              {form.type === "webinar"  && "عنوان، توضیحات و تصویر وبینار را وارد کنید. تنظیمات پخش زنده در بخش بعدی است."}
            </p>
          </div>

          <LocalizedField
            label="عنوان"
            value={form.title}
            onChange={(v) => {
              set("title", v);
              if (isNew && !form.slug) set("slug", makeSlug(v.fa || v.en));
            }}
            required
          />
          <LocalizedField
            label={form.type === "course" ? "خلاصه دوره" : form.type === "workshop" ? "خلاصه ورکشاپ" : "خلاصه وبینار"}
            value={form.excerpt}
            onChange={(v) => set("excerpt", v)}
            textarea
          />
          <LocalizedField
            label={form.type === "course" ? "توضیحات کامل دوره" : form.type === "workshop" ? "توضیحات ورکشاپ" : "توضیحات وبینار"}
            value={form.body}
            onChange={(v) => set("body", v)}
            textarea
          />

          {/* Slug + Cover image */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="اسلاگ URL">
              <Input dir="ltr" value={form.slug} placeholder="auto-generated"
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
            </Field>
            <Field label="تصویر شاخص (URL)">
              <Input dir="ltr" value={form.image} placeholder="/images/education/…"
                onChange={(e) => set("image", e.target.value)} />
            </Field>
          </div>

          {/* Author + Category */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={form.type === "webinar" ? "مدرس / میزبان وبینار" : form.type === "workshop" ? "مدرس / مربی ورکشاپ" : "مدرس / استاد دوره"}>
              <Select value={form.authorId} onChange={(e) => set("authorId", e.target.value)}>
                <option value="">انتخاب کنید…</option>
                {(form.type === "workshop" || form.type === "webinar") && (
                  <option value="artist-razieh-khairipour">راضیه خیری پور</option>
                )}
                {form.type === "course" && artists
                  .filter((a) => a.id !== "artist-razieh-khairipour")
                  .map((a) => (
                    <option key={a.id} value={a.id}>{t(a.name, "fa")}</option>
                  ))}
              </Select>
            </Field>
            <Field label="دسته‌بندی">
              <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">بدون دسته‌بندی</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{t(c.name, "fa")}</option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Difficulty + Course-specific meta */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="سطح مخاطب">
              <Select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
                {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                  <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
                ))}
              </Select>
            </Field>
            {form.type === "course" && (
              <>
                <Field label="مدت کل دوره (دقیقه)">
                  <Input type="number" min={1} value={form.durationMin || ""}
                    onChange={(e) => set("durationMin", Number(e.target.value))} />
                </Field>
                <Field label="تعداد درس‌ها">
                  <Input type="number" min={1} value={form.lessons || ""}
                    onChange={(e) => set("lessons", Number(e.target.value))} />
                </Field>
              </>
            )}
          </div>

          {/* Price */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={form.type === "course" ? "قیمت دوره (تومان) — خالی = رایگان" : form.type === "workshop" ? "هزینه ثبت‌نام (تومان) — خالی = رایگان" : "هزینه شرکت در وبینار (تومان) — خالی = رایگان"}>
              <Input type="number" min={0} dir="ltr" value={form.price?.fa ?? ""}
                placeholder="0 = رایگان"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set("price", v > 0 ? { fa: v, en: form.price?.en ?? 0 } : undefined);
                }} />
            </Field>
            <Field label={form.type === "course" ? "قیمت دوره (USD) — خالی = رایگان" : form.type === "workshop" ? "هزینه ثبت‌نام (USD) — خالی = رایگان" : "هزینه شرکت (USD) — خالی = رایگان"}>
              <Input type="number" min={0} dir="ltr" value={form.price?.en ?? ""}
                placeholder="0 = free"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set("price", v > 0 ? { fa: form.price?.fa ?? 0, en: v } : undefined);
                }} />
            </Field>
          </div>

          {/* Published at + Flags */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="تاریخ انتشار">
              <Input type="date" dir="ltr" value={form.publishedAt?.slice(0, 10) ?? ""}
                onChange={(e) => set("publishedAt", e.target.value)} />
            </Field>
            <Field label="ویژگی‌ها">
              <div className="flex gap-4 items-center h-9">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-accent"
                    checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
                  <Star className="h-3.5 w-3.5 text-amber-500" /> منتخب
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-accent"
                    checked={form.popular} onChange={(e) => set("popular", e.target.checked)} />
                  <TrendingUp className="h-3.5 w-3.5 text-rose-500" /> محبوب
                </label>
              </div>
            </Field>
          </div>

          {/* ── دوره آموزشی: ساختار درس‌ها و فایل‌های خصوصی ── */}
          {form.type === "course" && (
            <>
              <LessonListEditor
                lessons={form.lessonList ?? []}
                onChange={(lessons) => {
                  set("lessonList", lessons);
                  set("lessons", lessons.length);
                }}
              />
              <VideoUploadPanel
                videos={form.videoFiles ?? []}
                lessons={form.lessonList ?? []}
                onChange={(v) => set("videoFiles", v)}
              />
            </>
          )}

          {/* ── ورکشاپ: تنظیمات رویداد ── */}
          {form.type === "workshop" && (
            <WorkshopEventSection
              live={form.liveEvent ?? { ...DEFAULT_WORKSHOP_LIVE }}
              onChange={(v) => set("liveEvent", v)}
              slug={form.slug}
              registeredCount={registeredCount}
              saved={!isNew}
            />
          )}

          {/* ── وبینار: تنظیمات پخش زنده ── */}
          {form.type === "webinar" && (
            <WebinarEventSection
              live={form.liveEvent ?? { ...DEFAULT_WEBINAR_LIVE }}
              onChange={(v) => set("liveEvent", v)}
              slug={form.slug}
              registeredCount={registeredCount}
              saved={!isNew}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-background-secondary rounded-b-2xl px-6 py-4">
          <Button variant="ghost" onClick={onClose}>انصراف</Button>
          <Button onClick={handleSave}>
            {isNew ? "افزودن" : "ذخیره تغییرات"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ITEM CARD
   ═══════════════════════════════════════════════════════════════ */

function ItemCard({
  item, locale, registeredCount, onEdit, onDelete, onToggleFlag,
}: {
  item: EducationItem; locale: Locale; registeredCount: number;
  onEdit: () => void; onDelete: () => void;
  onToggleFlag: (flag: "featured" | "popular") => void;
}) {
  const tc = TYPE_COLORS[item.type];
  const statusMeta = item.draftStatus ? DRAFT_STATUS_META[item.draftStatus] : DRAFT_STATUS_META.published;
  const itemLiveStatus = item.liveEvent ? eventStatusOf(item.liveEvent) : null;
  const liveStatusMeta = itemLiveStatus ? LIVE_STATUS_META[itemLiveStatus] : null;
  const meetingUrl = item.liveEvent?.isOnline ? safeExternalHttpsUrl(item.liveEvent.meetLink)?.href : null;
  const isFree = !item.price || (item.price.fa === 0 && item.price.en === 0);
  const isLive = itemLiveStatus === "live";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-medium">
      {/* Cover */}
      <div className="relative h-40 bg-background-secondary overflow-hidden">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={t(item.title, "fa")}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            {item.type === "course" ? <Film className="h-8 w-8" /> :
             item.type === "workshop" ? <Mic2 className="h-8 w-8" /> :
             <Radio className="h-8 w-8" />}
          </div>
        )}
        {isLive && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </div>
        )}
        {item.type === "workshop" && item.liveEvent && (
          <div className="absolute top-2 left-2">
            {item.liveEvent.isOnline ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white">
                <Wifi className="h-2.5 w-2.5" /> آنلاین
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-zinc-700/90 px-2 py-0.5 text-[10px] font-bold text-white">
                <WifiOff className="h-2.5 w-2.5" /> حضوری
              </span>
            )}
          </div>
        )}
        {/* Hover actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100 bg-black/30">
          <button onClick={onEdit}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white"
            title="ویرایش">
            <Edit3 className="h-4 w-4" />
          </button>
          <Link href={href(locale, `/academy/${item.slug}`)} target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white"
            title="مشاهده">
            <Eye className="h-4 w-4" />
          </Link>
          <button onClick={() => { if (confirm("این آیتم حذف شود؟")) onDelete(); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-600 hover:bg-white"
            title="حذف">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", `${tc.border} ${tc.bg} ${tc.text}`)}>
            {tc.icon} {TYPE_LABELS[item.type]}
          </span>
          {item.draftStatus && item.draftStatus !== "published" && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusMeta.color)}>
              {statusMeta.label}
            </span>
          )}
          {liveStatusMeta && (
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", liveStatusMeta.color)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", liveStatusMeta.dot)} />
              {liveStatusMeta.label}
            </span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
          {t(item.title, "fa")}
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          {item.liveEvent ? (
            <>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {item.liveEvent.startsAt ? fmtDate(item.liveEvent.startsAt) : "تاریخ تعیین نشده"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {registeredCount}
                {item.liveEvent.capacity > 0 && `/${item.liveEvent.capacity}`}
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {fmtDuration(item.durationMin)}
              </span>
              {(item.videoFiles?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Film className="h-3 w-3" />
                  {item.videoFiles!.length} ویدیو
                </span>
              )}
            </>
          )}
          <span className={isFree ? "text-emerald-600 font-medium" : ""}>
            {isFree ? "رایگان" : `${(item.price!.fa).toLocaleString("fa-IR")} ت`}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <button onClick={() => onToggleFlag("featured")}
            className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
              item.featured ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-zinc-100 text-zinc-500 hover:bg-amber-50 hover:text-amber-700")}>
            <Star className="h-2.5 w-2.5" /> منتخب
          </button>
          <button onClick={() => onToggleFlag("popular")}
            className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
              item.popular ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-zinc-100 text-zinc-500 hover:bg-rose-50 hover:text-rose-700")}>
            <TrendingUp className="h-2.5 w-2.5" /> محبوب
          </button>
          {meetingUrl && (
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer"
              className="mr-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
              <LinkIcon className="h-2.5 w-2.5" /> لینک جلسه
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════════════════════════ */

function StatsBar({ items, registrationsBySlug, now }: { items: EducationItem[]; registrationsBySlug: Record<string, number> | null; now: number }) {
  const courses = items.filter((i) => i.type === "course").length;
  const workshops = items.filter((i) => i.type === "workshop").length;
  const webinars = items.filter((i) => i.type === "webinar").length;
  const liveNow = items.filter((i) => Boolean(i.liveEvent && eventStatusOf(i.liveEvent, now) === "live")).length;
  const totalVideos = items.reduce((s, i) => s + (i.videoFiles?.length ?? 0), 0);
  const totalRegistered = items.reduce((sum, item) => sum + (registrationsBySlug
    ? registrationsBySlug[item.slug] ?? 0
    : item.liveEvent?.registeredCount ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[
        { icon: <GraduationCap className="h-4 w-4" />, label: "دوره", value: courses, color: "text-blue-600" },
        { icon: <Film className="h-4 w-4" />, label: "ویدیوی آپلودشده", value: totalVideos, color: "text-purple-600" },
        { icon: <Mic2 className="h-4 w-4" />, label: "ورکشاپ", value: workshops, color: "text-emerald-600" },
        { icon: <Radio className="h-4 w-4" />, label: "وبینار", value: webinars, color: "text-rose-600" },
        { icon: <Zap className="h-4 w-4" />, label: "🔴 زنده", value: liveNow, color: "text-red-600" },
        { icon: <Users className="h-4 w-4" />, label: "کل ثبت‌نام", value: totalRegistered, color: "text-accent" },
      ].map(({ icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
          <div className={cn("shrink-0", color)}>{icon}</div>
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — AcademyManager
   ═══════════════════════════════════════════════════════════════ */

type PanelTab = "course" | "workshop" | "webinar" | "analytics";
type FilterStatus = "all" | "live" | "free" | "pending";

const PANEL_TABS: { id: PanelTab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "course",    label: "دوره‌های آموزشی", icon: <GraduationCap className="h-4 w-4" />, color: "blue" },
  { id: "workshop",  label: "ورکشاپ‌ها",       icon: <Mic2 className="h-4 w-4" />,         color: "emerald" },
  { id: "webinar",   label: "وبینارها",         icon: <Radio className="h-4 w-4" />,        color: "rose" },
  { id: "analytics", label: "آمار و گزارش",    icon: <BarChart2 className="h-4 w-4" />,    color: "purple" },
];

export function AcademyManager({
  data, update, locale,
}: {
  data: SiteContent; update: (patch: Partial<SiteContent>) => void; locale: Locale;
}) {
  const [panel, setPanel] = useState<PanelTab>("course");
  const isAnalytics = panel === "analytics";
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<EducationItem | null | "new">(null);
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number> | null>(null);
  const [statusNow, setStatusNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const refreshCounts = async () => {
      try {
        const response = await fetch("/api/admin/reservations", { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("reservations_unavailable");
        const payload = await response.json() as { reservations?: AcademyReservation[] };
        const counts: Record<string, number> = {};
        for (const reservation of payload.reservations ?? []) {
          if (reservation.status === "cancelled") continue;
          counts[reservation.eventSlug] = (counts[reservation.eventSlug] ?? 0) + 1;
        }
        if (active) setRegistrationCounts(counts);
      } catch {
        if (active) setRegistrationCounts(null);
      }
    };
    void refreshCounts();
    const interval = setInterval(() => {
      setStatusNow(Date.now());
      void refreshCounts();
    }, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const { education, artists, categories } = data;

  const filtered = useMemo(() => {
    let list = education.filter((i) => i.type === panel);
    if (filterStatus === "live") list = list.filter((i) => Boolean(i.liveEvent && eventStatusOf(i.liveEvent, statusNow) === "live"));
    else if (filterStatus === "free") list = list.filter((i) => isFreePrice(i.price));
    else if (filterStatus === "pending") list = list.filter((i) => i.draftStatus === "pending_review");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        t(i.title, "fa").toLowerCase().includes(q) ||
        t(i.title, "en").toLowerCase().includes(q)
      );
    }
    return list;
  }, [education, panel, filterStatus, search, statusNow]);

  const handleSave = useCallback((saved: EducationItem) => {
    const exists = education.find((e) => e.id === saved.id);
    update({ education: exists ? education.map((e) => (e.id === saved.id ? saved : e)) : [...education, saved] });
    setEditItem(null);
  }, [education, update]);

  const handleDelete = useCallback((id: string) => {
    update({ education: education.filter((e) => e.id !== id) });
  }, [education, update]);

  const handleToggleFlag = useCallback((id: string, flag: "featured" | "popular") => {
    update({ education: education.map((e) => e.id === id ? { ...e, [flag]: !e[flag] } : e) });
  }, [education, update]);

  const liveCount = education.filter((e) => Boolean(e.liveEvent && eventStatusOf(e.liveEvent, statusNow) === "live")).length;
  const pendingCount = education.filter((e) => e.draftStatus === "pending_review").length;

  const panelDef = PANEL_TABS.find((p) => p.id === panel)!;
  const panelColor: Record<string, string> = {
    blue:    "bg-blue-600",
    emerald: "bg-emerald-600",
    rose:    "bg-rose-600",
    purple:  "bg-purple-600",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            مدیریت آکادمی
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            دوره‌های آموزشی، ورکشاپ‌ها (آنلاین و حضوری) و وبینارهای زنده را مدیریت کنید.
          </p>
        </div>
        {!isAnalytics && (
          <Button onClick={() => setEditItem("new")} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            افزودن به «{TYPE_LABELS[panel as "course" | "workshop" | "webinar"]}»
          </Button>
        )}
      </div>

      {/* Alert banners */}
      {liveCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <strong>{liveCount} رویداد</strong> در حال پخش زنده است.
          <button onClick={() => setFilterStatus("live")} className="mr-auto text-xs underline">نمایش</button>
        </div>
      )}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <Clock className="h-4 w-4 shrink-0" />
          <strong>{pendingCount} آیتم</strong> در انتظار تأیید است.
          <button onClick={() => setFilterStatus("pending")} className="mr-auto text-xs underline">نمایش</button>
        </div>
      )}

      {registrationCounts === null && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          شمار رزروهای واقعی دریافت نشد؛ اعداد فعلی از فیلدهای ذخیره‌شدهٔ محتوا خوانده شده‌اند و ممکن است به‌روز نباشند.
        </div>
      )}

      {/* Stats */}
      <StatsBar items={education} registrationsBySlug={registrationCounts} now={statusNow} />

      {/* Panel tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-background-secondary p-1">
        {PANEL_TABS.map((tab) => {
          const count = tab.id === "analytics"
            ? education.length
            : education.filter((i) => i.type === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => { setPanel(tab.id); setFilterStatus("all"); setSearch(""); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                panel === tab.id
                  ? `${panelColor[tab.color]} text-white shadow-sm`
                  : "text-foreground-secondary hover:text-foreground"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                panel === tab.id ? "bg-white/20 text-white" : "bg-border text-muted"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Analytics tab ── */}
      {isAnalytics ? (
        <AcademyAnalytics items={education} locale={locale} registrationsBySlug={registrationCounts} />
      ) : (
        <>
          {/* Filter + Search bar */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all" as FilterStatus, label: "همه" },
              ...(panel !== "course" ? [
                { id: "live" as FilterStatus, label: "🔴 زنده" },
                { id: "free" as FilterStatus, label: "رایگان" },
              ] : [{ id: "free" as FilterStatus, label: "رایگان" }]),
              { id: "pending" as FilterStatus, label: "در انتظار" },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setFilterStatus(id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filterStatus === id ? "bg-[#1e2230] text-white" : "bg-white border border-border text-foreground-secondary hover:border-accent/60"
                )}>
                {label}
              </button>
            ))}

            <div className="relative mr-auto min-w-[200px]">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو…"
                className="w-full rounded-lg border border-border bg-white py-1.5 pr-8 pl-3 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
                dir="rtl" />
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-white py-16 text-center">
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white", panelColor[panelDef.color])}>
                {panelDef.icon}
              </div>
              <p className="text-sm font-medium text-foreground">
                {education.filter((i) => i.type === panel as string).length === 0
                  ? `هنوز هیچ ${TYPE_LABELS[panel as "course"|"workshop"|"webinar"]}‌ای اضافه نشده`
                  : "نتیجه‌ای یافت نشد"}
              </p>
              <Button onClick={() => setEditItem("new")} className="mt-2">
                <Plus className="h-4 w-4 ml-1" /> افزودن {TYPE_LABELS[panel as "course"|"workshop"|"webinar"]}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  registeredCount={registrationCounts ? registrationCounts[item.slug] ?? 0 : item.liveEvent?.registeredCount ?? 0}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => handleDelete(item.id)}
                  onToggleFlag={(flag) => handleToggleFlag(item.id, flag)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      {editItem !== null && (
        <ItemDrawer
          item={editItem === "new" ? null : editItem}
          artists={artists}
          categories={categories}
          registeredCount={editItem === "new" ? 0 : registrationCounts ? registrationCounts[editItem.slug] ?? 0 : editItem.liveEvent?.registeredCount ?? 0}
          onSave={handleSave}
          onClose={() => setEditItem(null)}
          defaultType={panel === "analytics" ? "course" : panel}
        />
      )}
    </div>
  );
}
