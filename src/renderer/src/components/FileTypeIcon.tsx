import {
  File,
  FileCode2,
  FileText,
  FileJson,
  FileImage,
  FileArchive,
  FileAudio,
  FileVideo,
} from "lucide-react";
import type { FileAnalysis } from "@shared/types";
export function FileTypeIcon({
  file,
  size = 16,
}: {
  file: FileAnalysis;
  size?: number;
}) {
  const extension = file.extension.toLowerCase();
  const Icon = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?)$/.test(extension)
    ? FileImage
    : /\.(zip|gz|tar|rar|7z|bz2|xz)$/.test(extension)
      ? FileArchive
      : /\.(mp3|wav|ogg|flac|m4a|aac)$/.test(extension)
        ? FileAudio
        : /\.(mp4|webm|mov|mkv|avi)$/.test(extension)
          ? FileVideo
          : /\.(json|jsonc|ya?ml)$/.test(extension)
            ? FileJson
            : /\.(md|mdx|txt|log|pdf|csv)$/.test(extension)
              ? FileText
              : file.language === "Other"
                ? File
                : FileCode2;
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />;
}
