"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Video,
  ExternalLink,
  Download,
  ArrowLeft,
  BookOpen,
  Filter,
} from "lucide-react";
import Link from "next/link";

import { apiRequest } from "@/lib/api";
import { getStoredSession } from "@/lib/session";
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
    color: "bg-red-50 text-red-600",
    borderColor: "border-red-100",
  },
  VIDEO: {
    icon: Video,
    label: "Video",
    color: "bg-blue-50 text-blue-600",
    borderColor: "border-blue-100",
  },
  LINK: {
    icon: ExternalLink,
    label: "Bağlantı",
    color: "bg-purple-50 text-purple-600",
    borderColor: "border-purple-100",
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
      month: "long",
      year: "numeric",
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
      // Authenticated download
      const session = getStoredSession();
      const url = `${getApiBaseUrl()}${material.downloadUrl}`;
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      // For authenticated download, we open in new tab
      // The proxy will handle auth
      window.open(url, "_blank");
    } else {
      // VIDEO or LINK — open external URL
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
            className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80"
            aria-label="Geri dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Ders Materyalleri
          </h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-secondary"
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
            className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80"
            aria-label="Geri dön"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Ders Materyalleri
          </h1>
        </div>
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <FileText className="mx-auto size-10 text-destructive" />
          <p className="mt-3 text-lg font-semibold text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <Link
          href="/student"
          className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80"
          aria-label="Geri dön"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Ders Materyalleri
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalMaterials} materyal
          </p>
        </div>
      </div>

      {/* Ders filtresi */}
      {courses.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="size-4 shrink-0 text-muted-foreground" />
          <button
            onClick={() => setSelectedCourse("all")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              selectedCourse === "all"
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Tümü
          </button>
          {courses.map((c) => (
            <button
              key={c.courseId}
              onClick={() => setSelectedCourse(c.courseId)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                selectedCourse === c.courseId
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {c.courseName}
            </button>
          ))}
        </div>
      )}

      {/* Materyal listesi */}
      {filteredCourses.length === 0 || totalMaterials === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto size-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold text-foreground">
            Materyal bulunamadı
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu dersler için henüz materyal yüklenmemiş.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCourses.map((course) => {
            if (course.materialCount === 0) return null;

            return (
              <div key={course.courseId} className="space-y-3">
                {/* Ders başlığı */}
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    {course.courseName}
                  </h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {course.materialCount}
                  </span>
                </div>

                {/* Materyal kartları */}
                {course.materials.map((material) => {
                  const config = typeConfig[material.type];
                  const Icon = config.icon;

                  return (
                    <button
                      key={material.id}
                      onClick={() => handleMaterialClick(material)}
                      className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-card p-5 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98] ${config.borderColor}`}
                    >
                      <div
                        className={`flex size-14 shrink-0 items-center justify-center rounded-xl ${config.color}`}
                      >
                        <Icon className="size-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-foreground truncate">
                          {material.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{config.label}</span>
                          {material.fileSize && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(material.fileSize)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatDate(material.uploadedAt)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-muted-foreground">
                        {material.type === "PDF" ? (
                          <Download className="size-5" />
                        ) : (
                          <ExternalLink className="size-5" />
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
