"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image non décodable."));
    image.src = dataUrl;
  });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "compressing" | "generating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setStatus("compressing");
    try {
      const dataUrl = await compressImage(file);
      setPreview(dataUrl);
      setStatus("generating");
      const res = await fetch("/api/generate-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Erreur inattendue.");
      }
      sessionStorage.setItem("currentGame", JSON.stringify(json));
      router.push("/play");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setStatus("error");
    }
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  const busy = status === "compressing" || status === "generating";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <div className="text-5xl mb-3">🎮</div>
          <h1 className="text-3xl font-bold text-brand-700 mb-2">DevoirsGame</h1>
          <p className="text-slate-600 text-sm">
            Prends en photo le devoir de ton enfant. On le transforme en mini-jeu.
          </p>
        </header>

        {preview && (
          <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
            <img src={preview} alt="Devoir" className="w-full h-48 object-cover" />
          </div>
        )}

        {!busy && (
          <div className="space-y-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] transition-all text-white font-semibold py-5 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 text-lg"
            >
              <span className="text-2xl">📸</span>
              Prendre une photo
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] transition-all text-brand-700 font-semibold py-5 px-6 rounded-2xl shadow border border-brand-100 flex items-center justify-center gap-3 text-lg"
            >
              <span className="text-2xl">🖼️</span>
              Choisir dans la galerie
            </button>
          </div>
        )}

        {busy && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin text-4xl mb-3">🎲</div>
            <p className="text-brand-700 font-semibold">
              {status === "compressing" ? "Préparation de la photo…" : "Création du jeu en cours…"}
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Cela prend environ 10 secondes.
            </p>
          </div>
        )}

        {error && status === "error" && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            <div className="font-semibold mb-1">Oups !</div>
            <div>{error}</div>
            <button
              onClick={() => { setStatus("idle"); setError(null); setPreview(null); }}
              className="mt-3 text-red-700 underline"
            >
              Réessayer
            </button>
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onSelect}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={onSelect}
          className="hidden"
        />

        <footer className="mt-12 text-center text-xs text-slate-400">
          Prototype — Sonnet 4.6 Vision
        </footer>
      </div>
    </main>
  );
}
