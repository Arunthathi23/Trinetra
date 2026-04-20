import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export async function getViolations() {
  const response = await api.get("/violations");
  return response.data;
}

export async function getInsights() {
  const response = await api.get("/insights");
  return response.data.data;
}

export async function uploadVideo(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/upload-video", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function detectVideo(filename: string) {
  const response = await api.post("/detect-video", { filename });
  return response.data;
}

export async function detectFrame(frame: File | Blob) {
  const formData = new FormData();
  const filename = (frame as File).name || "frame.jpg";
  formData.append("frame", frame, filename);

  const response = await api.post("/detect-frame", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export default {
  getViolations,
  getInsights,
  uploadVideo,
  detectVideo,
  detectFrame,
};
