import { useState } from "react";
import { toast } from "sonner";

interface SelectedFiles {
  file: File;
  preview?: string | ArrayBuffer | null;
  publicId?: string;
}

export function useFileUpload({
  limit = 5,
  size = 2,
}: {
  limit?: number;
  size?: number;
}) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = [...Array.from(files ?? [])];
      if (fileArray.length > limit) {
        toast.error(`You can only upload up to ${limit} media files`);
        return;
      }
      const validFiles = fileArray.filter((file) => {
        if (
          !file.type.startsWith("image/")
        ) {
          toast.error("Please upload only image files");
          return false;
        }
        if (file.size > size * 1024 * 1024) {
          toast.error(`File size should be less than ${size}MB`);
          return false;
        }
        return true;
      });
      setSelectedFiles([]);
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFiles((prev) => [
            ...prev,
            { file, preview: reader.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  return { selectedFiles, setSelectedFiles, handleFiles };
}
