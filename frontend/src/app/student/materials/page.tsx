"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Video,
  ExternalLink,
  Download,
  ArrowLeft,
  BookOpen,
  Folder,
} from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/env";

interface MaterialItem {
  id: string;
  title: string;
  type: "PDF" | "VIDEO" | "LINK";
  url: string;
  fileSize?: number | null;
  uploadedAt: string;
  downloadUrl: string;
}

interface CourseWithMaterials {
  courseId: string;
  courseName: string;
  term: string;
  isActive: boolean;
  materials: MaterialItem[];
  materialCount: number;
}

const typeConfig = {
  PDF: {
    icon: FileText,
    label: "PDF Doküman",
    gradient: "from-rose-50 to-red-50",
    iconColor: "text-red-500",
    ringColor: "ring-red-100 hover:ring-red-200",
  },
  VIDEO: {
    icon: Video,
    label: "Video",
    gradient: "from-blue-50 to-indigo-50",
    iconColor: "text-blue-500",
    ringColor: "ring-blue-100 hover:ring-blue-200",
  },
  LINK: {
    icon: ExternalLink,
    label: "Bağlantı",
    gradient: "from-violet-50 to-purple-50",
    iconColor: "text-violet-500",
    ringColor: "ring-violet-100 hover:ring-violet-200",
  },
};

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function StudentMaterialsPage() {
  const [courses, setCourses] = useState<CourseWithMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  useEffect(() => {
    async function loadMaterials() {
      try {
        const data = await apiRequest<{ courses: CourseWithMaterials[] }>(
          "/api/v1/student/my-courses"
        );
        setCourses(data.courses);
      } catch {
        setError("Materyaller yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }

    loadMaterials();
  }, []);

  function handleMaterialClick(material: MaterialItem) {
    if (material.type === "PDF") {
      const url = `${getApiBaseUrl()}${material.downloadUrl}`;
      window.open(url, "_blank");
    } else {
      window.open(material.url, "_blank", "noopener,noreferrer");
    }
  }

  const filteredCourses =
    selectedCourse === "all"
      ? courses
      : courses.filter((c) => c.courseId === selectedCourse);

  const totalMaterials = filteredCourses.reduce(
    (sum, c) => sum + c.materialCount,
    0
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="flex size-11 items-center justify-center rounded-xl bg-white text-foreground shadow-sm ring-1 ring-black/[0.03] transition-colors hover:bg-secondary"
            aria-label="Geri dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Ders Materyalleri
          </h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white shadow-sm"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/student"
            className="flex size-11 items-center justify-center rounded-xl bg-white text-foreground shadow-sm ring-1 ring-black/[0.03] transition-colors hover:bg-secondary"
            aria-label="Geri dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Ders Materyalleri
          </h1>
        </div>
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.03]">
          <FileText className="mx-auto size-12 text-red-400" />
          <p className="mt-4 text-lg font-bold text-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/student"
          className="flex size-11 items-center justify-center rounded-xl bg-white text-foreground shadow-sm ring-1 ring-black/[0.03] transition-colors hover:bg-secondary"
          aria-label="Geri dön"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Ders Materyalleri
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalMaterials} materyal · {courses.length} ders
          </p>
        </div>
      </div>

      {/* ─── Course Filter Pills ─── */}
      {courses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCourse("all")}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
              selectedCourse === "all"
                ? "bg-gradient-to-r from-primary to-[#008560] text-white shadow-md shadow-primary/20"
                : "bg-white text-muted-foreground shadow-sm ring-1 ring-black/[0.03] hover:bg-gray-50"
            }`}
          >
            <Folder className="size-3.5" />
            Tümü
          </button>
          {courses.map((c) => (
            <button
              key={c.courseId}
              onClick={() => setSelectedCourse(c.courseId)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                selectedCourse === c.courseId
                  ? "bg-gradient-to-r from-primary to-[#008560] text-white shadow-md shadow-primary/20"
                  : "bg-white text-muted-foreground shadow-sm ring-1 ring-black/[0.03] hover:bg-gray-50"
              }`}
            >
              {c.courseName}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  selectedCourse === c.courseId
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {c.materialCount}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Materials List ─── */}
      {totalMaterials === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/[0.03]">
          <BookOpen className="mx-auto size-14 text-muted-foreground/40" />
          <p className="mt-4 text-lg font-bold text-foreground">
            Materyal bulunamadı
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Seçilen dersler için henüz materyal yüklenmemiş.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCourses.map((course) => {
            if (course.materialCount === 0) return null;

            return (
              <div key={course.courseId} className="space-y-3">
                {/* Course section header */}
                <div className="flex items-center gap-2 px-1">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="size-3.5 text-primary" />
                  </div>
                  <h2 className="text-sm font-bold text-foreground">
                    {course.courseName}
                  </h2>
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {course.materialCount} dosya
                  </span>
                </div>

                {/* Material cards */}
                {course.materials.map((material) => {
                  const config = typeConfig[material.type];
                  const Icon = config.icon;

                  return (
                    <button
                      key={material.id}
                      onClick={() => handleMaterialClick(material)}
                      className={`group flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 transition-all duration-200 hover:shadow-md active:scale-[0.98] ${config.ringColor}`}
                    >
                      <div
                        className={`flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient}`}
                      >
                        <Icon className={`size-6 ${config.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold text-foreground">
                          {material.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold">{config.label}</span>
                          {material.fileSize && (
                            <>
                              <span className="text-border">·</span>
                              <span>{formatFileSize(material.fileSize)}</span>
                            </>
                          )}
                          <span className="text-border">·</span>
                          <span>{formatDate(material.uploadedAt)}</span>
                        </div>
                      </div>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        {material.type === "PDF" ? (
                          <Download className="size-4" />
                        ) : (
                          <ExternalLink className="size-4" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
